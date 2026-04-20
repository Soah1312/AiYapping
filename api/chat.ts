import {
  acquireConversationAdmission,
  getUsageStatus,
  incrementUsage,
  recordInjectionAttempt,
  markConversationTurnComplete,
  refreshConversationLease,
  releaseConversationAdmissionOnFailure,
  type TurnType,
} from './_lib/firebase';

export const config = {
  runtime: 'edge',
};

type ChatRequestBody = {
  provider?: 'groq' | 'huggingface' | 'nvidia' | 'openrouter' | 'github-models' | string;
  model?: string;
  modelId?: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
  conversationKey?: string;
  turnType?: TurnType;
  turnNumber?: number;
  maxTurns?: number;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  thinking?: any;
};

type AdmissionContext = {
  conversationKey: string;
  turnType: TurnType;
  turnNumber: number;
  maxTurns: number;
  sessionId: string;
  requestId: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  thinking?: any;
};

// Keep retries shorter than typical serverless execution limits to avoid platform 504 timeouts.
const ACTIVE_PRIORITY_RETRY_TIMEOUT_MS = 20 * 1000;
const ACTIVE_PRIORITY_RETRY_DELAY_MS = 1500;
const PROVIDER_INVOKE_TIMEOUT_MS = 18 * 1000;
const ADMISSION_MAX_TURNS_FALLBACK = 20;
const HF_CHAT_COMPLETIONS_URL = 'https://router.huggingface.co/v1/chat/completions';
const GITHUB_MODELS_CHAT_COMPLETIONS_URL = 'https://models.github.ai/inference/chat/completions';
const GITHUB_MODELS_API_VERSION = '2022-11-28';
const HF_BAD_REQUEST_GROQ_FALLBACK_MODEL = 'llama-3.3-70b-versatile';

type HfDeepSeekConfig = {
  endpointUrl: string;
  model: string;
};

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function normalizeTurnType(body: ChatRequestBody) {
  if (body.turnType === 'start' || body.turnType === 'continue') {
    return body.turnType;
  }

  const turnNumber = Number(body.turnNumber || 1);
  return turnNumber <= 1 ? 'start' : 'continue';
}

function normalizeTurnNumber(body: ChatRequestBody) {
  const value = Number(body.turnNumber || 1);
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function normalizeMaxTurns(body: ChatRequestBody) {
  const value = Number(body.maxTurns || ADMISSION_MAX_TURNS_FALLBACK);
  if (!Number.isFinite(value)) {
    return ADMISSION_MAX_TURNS_FALLBACK;
  }

  return Math.min(200, Math.max(2, Math.floor(value)));
}

async function parseResponseJsonSafe(response: Response) {
  try {
    return (await response.clone().json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildPriorityBlockedResponse({
  requestId,
  stage,
  retryAfter,
}: {
  requestId: string;
  stage: string;
  retryAfter: number;
}) {
  const retryAfterSafe = Math.max(1, Math.floor(retryAfter || 30));

  return Response.json(
    {
      error: 'Another duel is currently in progress. New duels can start once it finishes.',
      reason: 'admission_blocked_active_priority',
      requestId,
      stage,
      retryAfter: retryAfterSafe,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSafe),
      },
    },
  );
}

function buildRetryTimeoutResponse({
  requestId,
  stage,
}: {
  requestId: string;
  stage: string;
}) {
  const retryAfter = 30;

  return Response.json(
    {
      error: 'Active duel timed out after waiting for provider capacity. Resume to retry.',
      reason: 'active_conversation_retry_timeout',
      requestId,
      stage,
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    },
  );
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `req-${Math.random().toString(36).slice(2, 10)}${Date.now()}`;
}

function safeErrorMessage(error: unknown) {
  const message = String((error as { message?: string })?.message || error || 'Unknown error');
  return message.slice(0, 1200);
}

function extractGroqDelta(payload: Record<string, unknown>) {
  const choice =
    Array.isArray(payload.choices) && payload.choices[0] && typeof payload.choices[0] === 'object'
      ? (payload.choices[0] as { delta?: { content?: string }; message?: { content?: string } })
      : null;

  const content = choice?.delta?.content ? String(choice.delta.content) : '';
  const message = choice?.message?.content ? String(choice.message.content) : '';

  return content || message || '';
}

function normalizeApiKeyValue(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '');
}

function resolveApiKeysByPrefix(prefix: string, fallbackKeyName?: string) {
  const envEntries = Object.entries(process.env || {});
  const explicitKeys = envEntries
    .filter(([key]) => key.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, value]) => normalizeApiKeyValue(value))
    .filter(Boolean);

  if (fallbackKeyName && process.env[fallbackKeyName]) {
    explicitKeys.push(normalizeApiKeyValue(process.env[fallbackKeyName]));
  }

  return [...new Set(explicitKeys.filter(Boolean))];
}

function resolveGroqApiKeys() {
  return resolveApiKeysByPrefix('GROQ_KEY_', 'GROQ_API_KEY');
}

function resolveHuggingFaceApiKeys() {
  return resolveApiKeysByPrefix('HUGGINGFACE_KEY_', 'HUGGINGFACE_API_KEY');
}

function resolveNvidiaApiKeys() {
  return resolveApiKeysByPrefix('NVIDIA_KEY_', 'NVIDIA_API_KEY');
}

function resolveOpenRouterApiKeys() {
  const keys = [
    ...resolveApiKeysByPrefix('OPENROUTER_KEY_', 'OPENROUTER_API_KEY'),
    ...resolveApiKeysByPrefix('OPEN_ROUTER_KEY_', 'OPEN_ROUTER_API_KEY'),
    normalizeApiKeyValue(process.env.OPENROUTER_KEY),
    normalizeApiKeyValue(process.env.VITE_OPENROUTER_KEY_1),
  ].filter(Boolean);

  return [...new Set(keys)];
}

function resolveGitHubModelsApiKeys() {
  const keys = [
    ...resolveApiKeysByPrefix('GITHUB_MODELS_KEY_', 'GITHUB_MODELS_API_KEY'),
    normalizeApiKeyValue(process.env.GITHUB_MODELS_KEY),
    normalizeApiKeyValue(process.env.GITHUB_TOKEN),
  ].filter(Boolean);

  return [...new Set(keys)];
}

function resolveDeepSeekR1Config(modelId: string): HfDeepSeekConfig | null {
  const normalized = String(modelId || '').trim().toLowerCase();
  const isDeepSeekR1 =
    normalized === 'deepseek-ai/deepseek-r1'
    || normalized === 'hf-space:deepseek-r1';

  if (!isDeepSeekR1) {
    return null;
  }

  const endpointRaw = String(process.env.HUGGINGFACE_SPACE_DEEPSEEK_R1_URL || '').trim();
  const modelRaw = String(process.env.HUGGINGFACE_SPACE_DEEPSEEK_R1_MODEL || 'deepseek-ai/DeepSeek-R1').trim();

  return {
    endpointUrl: endpointRaw || HF_CHAT_COMPLETIONS_URL,
    model: modelRaw,
  };
}

function shuffleInPlace<T>(values: T[]) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  return next;
}

function keyLabel(apiKey: string, index: number) {
  const suffix = apiKey.slice(-4);
  return `#${index + 1}(...${suffix || 'n/a'})`;
}

const NVIDIA_MODEL_MATCHERS = [
  /^z-ai\//i,
  /^google\/gemma-7b$/i,
  /^mistralai\/mistral-large-3-675b-instruct-2512$/i,
  /^moonshotai\/kimi-k2-instruct@nvidia$/i,
];

const GROQ_MODEL_MATCHERS = [
  /^llama-3\.3-70b-versatile$/i,
  /^meta-llama\/llama-4-scout-17b-16e-instruct$/i,
  /^qwen\/qwen3-32b$/i,
  /^moonshotai\/kimi-k2-instruct$/i,
  /^openai\/gpt-oss-20b$/i,
];

function resolveProvider(provider: string | undefined, modelId: string) {
  if (
    provider === 'groq'
    || provider === 'huggingface'
    || provider === 'nvidia'
    || provider === 'openrouter'
    || provider === 'github-models'
  ) {
    return provider;
  }

  if (modelId.endsWith('@nvidia')) {
    return 'nvidia';
  }

  if (NVIDIA_MODEL_MATCHERS.some((pattern) => pattern.test(modelId))) {
    return 'nvidia';
  }

  if (GROQ_MODEL_MATCHERS.some((pattern) => pattern.test(modelId))) {
    return 'groq';
  }

  return modelId.includes('/') ? 'huggingface' : 'groq';
}

function normalizeGithubModelsId(modelId: string) {
  const parts = modelId.split('/');
  return parts.length > 1 ? parts[1] : modelId;
}

function extractGithubModelsDelta(payload: Record<string, unknown>) {
  const firstChoice =
    Array.isArray(payload.choices) && payload.choices[0] && typeof payload.choices[0] === 'object'
      ? (payload.choices[0] as {
        message?: { content?: string | Array<{ type?: string; text?: string }> };
        text?: string;
      })
      : null;

  const directContent = firstChoice?.message?.content;
  if (typeof directContent === 'string') {
    return directContent;
  }

  if (Array.isArray(directContent)) {
    const merged = directContent
      .map((part) => {
        if (!part || typeof part !== 'object') {
          return '';
        }

        return typeof part.text === 'string' ? part.text : '';
      })
      .join('');

    if (merged.trim()) {
      return merged;
    }
  }

  if (typeof firstChoice?.text === 'string' && firstChoice.text.trim()) {
    return firstChoice.text;
  }

  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  return '';
}

function normalizeNvidiaModelId(modelId: string) {
  if (modelId.endsWith('@nvidia')) {
    return modelId.slice(0, -'@nvidia'.length);
  }

  return modelId;
}

function extractHfDelta(payload: Record<string, unknown>) {
  const tokenText =
    typeof payload.token === 'object' && payload.token && 'text' in payload.token
      ? String((payload.token as { text?: string }).text || '')
      : '';

  const generatedText =
    typeof payload.generated_text === 'string' ? payload.generated_text : '';

  const choiceDelta =
    Array.isArray(payload.choices) &&
    payload.choices[0] &&
    typeof payload.choices[0] === 'object' &&
    (payload.choices[0] as { delta?: { content?: string } }).delta?.content
      ? String((payload.choices[0] as { delta?: { content?: string } }).delta?.content || '')
      : '';

  const choiceMessage =
    Array.isArray(payload.choices) &&
    payload.choices[0] &&
    typeof payload.choices[0] === 'object' &&
    (payload.choices[0] as { message?: { content?: string } }).message?.content
      ? String((payload.choices[0] as { message?: { content?: string } }).message?.content || '')
      : '';

  const directDelta =
    typeof payload.delta === 'object' && payload.delta && 'text' in payload.delta
      ? String((payload.delta as { text?: string }).text || '')
      : '';

  return tokenText || choiceDelta || choiceMessage || directDelta || generatedText || '';
}

function extractNvidiaDelta(payload: Record<string, unknown>) {
  const choice =
    Array.isArray(payload.choices) && payload.choices[0] && typeof payload.choices[0] === 'object'
      ? (payload.choices[0] as { delta?: { content?: string; reasoning_content?: string }; message?: { content?: string } })
      : null;

  const content = choice?.delta?.content ? String(choice.delta.content) : '';
  const message = choice?.message?.content ? String(choice.message.content) : '';

  return content || message || '';
}

function normalizeNvidiaMessages(messages: Array<{ role: string; content: string }>) {
  const prepared = messages.map((message) => {
    if (message.role === 'system') {
      return {
        role: 'user' as const,
        content: `[Instruction]\n${String(message.content || '')}`,
      };
    }

    if (message.role === 'assistant') {
      return {
        role: 'assistant' as const,
        content: String(message.content || ''),
      };
    }

    return {
      role: 'user' as const,
      content: String(message.content || ''),
    };
  });

  const merged: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const message of prepared) {
    if (!message.content.trim()) {
      continue;
    }

    const last = merged[merged.length - 1];
    if (last && last.role === message.role) {
      // NVIDIA expects strict user/assistant alternation, so merge same-role neighbors.
      last.content = `${last.content}\n\n${message.content}`;
      continue;
    }

    merged.push(message);
  }

  if (merged.length === 0) {
    merged.push({
      role: 'user',
      content: 'Continue the discussion in one concise turn.',
    });
  }

  if (merged[0].role !== 'user') {
    merged.unshift({
      role: 'user',
      content: 'Follow the prior context and continue the discussion.',
    });
  }

  return merged;
}

function normalizeHuggingFaceMessages(messages: Array<{ role: string; content: string }>) {
  const prepared = normalizeMessages(messages).map((message) => {
    if (message.role === 'system') {
      return {
        role: 'user',
        content: `[Instruction]\n${String(message.content || '')}`,
      };
    }

    if (message.role === 'assistant') {
      return {
        role: 'assistant',
        content: String(message.content || ''),
      };
    }

    return {
      role: 'user',
      content: String(message.content || ''),
    };
  });

  return normalizeAlternatingMessages(prepared);
}

async function createNvidiaStreamResponse({
  modelId,
  messages,
  sessionId,
  admission,
}: {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
  admission?: AdmissionContext;
}) {
  const nvidiaKeys = shuffleInPlace(resolveNvidiaApiKeys());
  if (nvidiaKeys.length === 0) {
    return Response.json(
      {
        error:
          'Missing NVIDIA API keys. Set NVIDIA_KEY_1 (and optional NVIDIA_KEY_2, NVIDIA_KEY_3...) in environment variables.',
      },
      { status: 500 },
    );
  }

  const normalizedMessages = normalizeMessages(messages).map((message) => ({
    role: message.role,
    content: typeof message.content === 'string' ? message.content : String(message.content || ''),
  }));

  const nvidiaMessages = normalizeNvidiaMessages(normalizedMessages);

  const resolvedModelId = normalizeNvidiaModelId(modelId);
  const isGlmModel = resolvedModelId === 'z-ai/glm4.7' || resolvedModelId.startsWith('z-ai/glm');
  const isMistralLargeModel = resolvedModelId === 'mistralai/mistral-large-3-675b-instruct-2512';
  const isKimiModel = resolvedModelId === 'moonshotai/kimi-k2-instruct';
  const nvidiaBaseBody: Record<string, unknown> = {
    model: resolvedModelId,
    messages: nvidiaMessages,
    temperature: admission?.temperature ?? (isGlmModel ? 1 : isMistralLargeModel ? 0.15 : isKimiModel ? 0.6 : 0.7),
    top_p: isGlmModel ? 1 : isMistralLargeModel ? 1 : isKimiModel ? 0.9 : 0.9,
    max_tokens: admission?.max_tokens ?? (isGlmModel ? 16384 : isMistralLargeModel ? 2048 : isKimiModel ? 4096 : 900),
    frequency_penalty: isMistralLargeModel ? 0 : 0,
    presence_penalty: isMistralLargeModel ? 0 : 0,
    stream: true,
  };

  const nvidiaBodies: Array<Record<string, unknown>> = isGlmModel
    ? [
        {
          ...nvidiaBaseBody,
          extra_body: {
            chat_template_kwargs: {
              enable_thinking: true,
              clear_thinking: true,
            },
          },
        },
        {
          ...nvidiaBaseBody,
          chat_template_kwargs: {
            enable_thinking: true,
            clear_thinking: true,
          },
        },
        {
          ...nvidiaBaseBody,
        },
      ]
    : [nvidiaBaseBody];

  let upstream: Response | null = null;
  let lastErrorText = '';
  let rateLimitedCount = 0;

  for (let keyIndex = 0; keyIndex < nvidiaKeys.length; keyIndex += 1) {
    const apiKey = nvidiaKeys[keyIndex];

    for (const nvidiaBody of nvidiaBodies) {
      const candidate = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
        },
        body: JSON.stringify(nvidiaBody),
      });

      upstream = candidate;
      if (candidate.ok) {
        break;
      }

      lastErrorText = await candidate.text();

      if (candidate.status === 429) {
        break;
      }

      const lowerError = lastErrorText.toLowerCase();
      const retryablePayloadError =
        candidate.status === 400 &&
        (lowerError.includes('unsupported parameter') ||
          lowerError.includes('extra_body') ||
          lowerError.includes('chat_template_kwargs'));

      if (!retryablePayloadError) {
        break;
      }
    }

    if (upstream?.ok) {
      break;
    }

    if (upstream?.status === 429) {
      rateLimitedCount += 1;
      console.warn(`[api/chat] NVIDIA key ${keyLabel(apiKey, keyIndex)} rate-limited, rotating...`);
      continue;
    }

    break;
  }

  if (!upstream) {
    return Response.json({ error: 'NVIDIA request failed before reaching upstream.' }, { status: 500 });
  }

  if (!upstream.ok) {
    if (upstream.status === 429 && rateLimitedCount === nvidiaKeys.length) {
      return Response.json(
        {
          error: 'All AI engines are currently yapping too hard. Please try again in 60s.',
          reason: 'all_keys_rate_limited',
          retryAfter: 60,
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        },
      );
    }

    const errorText = lastErrorText || (await upstream.text());
    return Response.json({ error: `NVIDIA error ${upstream.status}: ${errorText}` }, { status: upstream.status });
  }

  if (!upstream.body) {
    return Response.json({ error: 'NVIDIA stream body is empty.' }, { status: 500 });
  }

  const upstreamBody = upstream.body;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const write = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const reader = upstreamBody.getReader();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const lines = block.split('\n').map((line) => line.trim());
            const dataLine = lines.find((line) => line.startsWith('data:'));

            if (!dataLine) {
              continue;
            }

            const raw = dataLine.slice(5).trim();
            if (!raw || raw === '[DONE]') {
              continue;
            }

            let payload: Record<string, unknown>;
            try {
              payload = JSON.parse(raw) as Record<string, unknown>;
            } catch {
              write({ delta: raw });
              continue;
            }

            if (payload.error) {
              throw new Error(String(payload.error));
            }

            const delta = extractNvidiaDelta(payload);
            if (delta) {
              write({ delta });
            }
          }
        }

        await incrementUsage(sessionId);
        if (admission) {
          await markConversationTurnComplete({
            conversationKey: admission.conversationKey,
            sessionId: admission.sessionId,
            maxTurns: admission.maxTurns,
          });
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        if (admission) {
          await releaseConversationAdmissionOnFailure({
            conversationKey: admission.conversationKey,
            sessionId: admission.sessionId,
            reason: safeErrorMessage(error),
          });
        }
        write({ error: String((error as Error)?.message || 'NVIDIA stream failed') });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

async function createHuggingFaceStreamResponse({
  modelId,
  messages,
  sessionId,
  admission,
}: {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
  admission?: AdmissionContext;
}) {
  const hfKeys = shuffleInPlace(resolveHuggingFaceApiKeys());
  if (hfKeys.length === 0) {
    return Response.json(
      {
        error: 'Missing Hugging Face API keys. Set HUGGINGFACE_KEY_1 (and optional HUGGINGFACE_KEY_2, HUGGINGFACE_KEY_3...) in environment variables.',
      },
      { status: 500 },
    );
  }

  const normalizedMessages = normalizeAlternatingMessages(messages);
  const hfSafeMessages = normalizeHuggingFaceMessages(messages);

  const deepSeekConfig = resolveDeepSeekR1Config(modelId);
  const hfEndpoint = deepSeekConfig?.endpointUrl || HF_CHAT_COMPLETIONS_URL;

  const HF_SAFE_FALLBACK_MODEL = 'mistral-community/Mistral-7B-Instruct-v0.2:hf-inference';
  const modelCandidates = deepSeekConfig
    ? [deepSeekConfig.model]
    : (() => {
      const explicitModel = modelId;
      const hfInferenceVariant = modelId.includes(':') ? modelId : `${modelId}:hf-inference`;
      const plainVariant = modelId.replace(/:hf-inference$/, '');
      return [explicitModel, plainVariant, hfInferenceVariant, HF_SAFE_FALLBACK_MODEL].filter(
        (candidate, index, arr) => candidate && arr.indexOf(candidate) === index,
      );
    })();

  let upstream: Response | null = null;
  let upstreamModel = modelCandidates[0];
  let lastErrorText = '';

  let rateLimitedCount = 0;

  for (let keyIndex = 0; keyIndex < hfKeys.length; keyIndex += 1) {
    const apiKey = hfKeys[keyIndex];

    for (const candidateModel of modelCandidates) {
      let candidateResponse = await fetch(hfEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
        },
        body: JSON.stringify({
          model: candidateModel,
          messages: normalizedMessages,
          stream: true,
          max_tokens: admission?.max_tokens ?? 500,
          ...(admission?.temperature !== undefined && { temperature: admission.temperature }),
        }),
      });

      upstream = candidateResponse;
      upstreamModel = candidateModel;

      if (!candidateResponse.ok && candidateResponse.status !== 503 && candidateResponse.status !== 429) {
        lastErrorText = await candidateResponse.text();
        const lowerInitialError = lastErrorText.toLowerCase();
        const retryableRequestShapeError =
          candidateResponse.status === 400 &&
          (
            lowerInitialError.includes('stream') ||
            lowerInitialError.includes('unsupported parameter') ||
            lowerInitialError.includes('messages') ||
            lowerInitialError.includes('role') ||
            lowerInitialError.includes('system') ||
            lowerInitialError.includes('conversation')
          );
        const retryableTokenParamError =
          candidateResponse.status === 400 &&
          (
            lowerInitialError.includes('max_tokens') ||
            lowerInitialError.includes('max token') ||
            lowerInitialError.includes('max_new_tokens')
          );

        if (retryableRequestShapeError || retryableTokenParamError) {
          const fallbackBody: Record<string, unknown> = {
            model: candidateModel,
            messages: hfSafeMessages,
            stream: false,
            ...(admission?.temperature !== undefined && { temperature: admission.temperature }),
          };

          if (!retryableTokenParamError) {
            fallbackBody.max_tokens = admission?.max_tokens ?? 500;
          }

          candidateResponse = await fetch(hfEndpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              Accept: 'text/event-stream, application/json',
            },
            body: JSON.stringify(fallbackBody),
          });

          upstream = candidateResponse;
          upstreamModel = candidateModel;

          if (!candidateResponse.ok && candidateResponse.status !== 503 && candidateResponse.status !== 429) {
            lastErrorText = await candidateResponse.text();
          }
        }
      }

      if (candidateResponse.ok || candidateResponse.status === 503 || candidateResponse.status === 429) {
        break;
      }

      if (!lastErrorText) {
        lastErrorText = await candidateResponse.text();
      }

      const lowerError = lastErrorText.toLowerCase();
      const retryableModelError =
        candidateResponse.status === 404 ||
        lowerError.includes('model_not_supported') ||
        lowerError.includes('not supported by provider') ||
        lowerError.includes('invalid_request_error') ||
        lowerError.includes('param":"model');

      if (!retryableModelError) {
        break;
      }
    }

    if (upstream?.ok || upstream?.status === 503) {
      break;
    }

    if (upstream?.status === 429) {
      rateLimitedCount += 1;
      console.warn(`[api/chat] Hugging Face key ${keyLabel(apiKey, keyIndex)} rate-limited, rotating...`);
      continue;
    }

    break;
  }

  if (!upstream) {
    return Response.json({ error: 'Hugging Face request failed before reaching upstream.' }, { status: 500 });
  }

  if (upstream.status === 429 && rateLimitedCount === hfKeys.length) {
    return Response.json(
      {
        error: 'All AI engines are currently yapping too hard. Please try again in 60s.',
        reason: 'all_keys_rate_limited',
        retryAfter: 60,
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      },
    );
  }

  if (upstream.status === 503) {
    return Response.json(
      { error: 'Hugging Face is waking up this model... please wait 20 seconds.' },
      { status: 503 },
    );
  }

  if (!upstream.ok) {
    const errorText = lastErrorText || (await upstream.text());
    const reason =
      upstream.status === 400
        ? 'provider_bad_request'
        : upstream.status === 401 || upstream.status === 403
          ? 'provider_auth_error'
          : 'provider_upstream_error';
    return Response.json(
      {
        error: `Hugging Face error ${upstream.status} (${upstreamModel}): ${errorText}`,
        reason,
        provider: 'huggingface',
        model: upstreamModel,
      },
      { status: upstream.status },
    );
  }

  if (!upstream.body) {
    return Response.json({ error: 'Hugging Face stream body is empty.' }, { status: 500 });
  }

  const upstreamBody = upstream.body;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const contentType = upstream.headers.get('content-type') || '';

  const stream = new ReadableStream({
    async start(controller) {
      const write = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        if (contentType.includes('application/json')) {
          const text = await new Response(upstreamBody).text();
          let parsed: unknown = null;

          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text;
          }

          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && typeof item === 'object' && 'generated_text' in item) {
                const delta = String((item as { generated_text?: string }).generated_text || '');
                if (delta) {
                  write({ delta });
                }
              }
            }
          } else if (parsed && typeof parsed === 'object') {
            const delta = extractHfDelta(parsed as Record<string, unknown>);
            if (delta) {
              write({ delta });
            }
          } else if (typeof parsed === 'string' && parsed) {
            write({ delta: parsed });
          }
        } else {
          const reader = upstreamBody.getReader();
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split('\n\n');
            buffer = blocks.pop() || '';

            for (const block of blocks) {
              const lines = block.split('\n').map((line) => line.trim());
              const dataLine = lines.find((line) => line.startsWith('data:'));

              if (!dataLine) {
                continue;
              }

              const raw = dataLine.slice(5).trim();
              if (!raw || raw === '[DONE]') {
                continue;
              }

              let payload: Record<string, unknown>;
              try {
                payload = JSON.parse(raw) as Record<string, unknown>;
              } catch {
                write({ delta: raw });
                continue;
              }

              if (payload.error) {
                throw new Error(String(payload.error));
              }

              const delta = extractHfDelta(payload);
              if (delta) {
                write({ delta });
              }
            }
          }
        }

        await incrementUsage(sessionId);
        if (admission) {
          await markConversationTurnComplete({
            conversationKey: admission.conversationKey,
            sessionId: admission.sessionId,
            maxTurns: admission.maxTurns,
          });
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        if (admission) {
          await releaseConversationAdmissionOnFailure({
            conversationKey: admission.conversationKey,
            sessionId: admission.sessionId,
            reason: safeErrorMessage(error),
          });
        }
        write({ error: String((error as Error)?.message || 'Hugging Face stream failed') });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

async function createGroqStreamResponse({
  modelId,
  messages,
  sessionId,
  admission,
}: {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
  admission?: AdmissionContext;
}) {
  const normalizedMessages = normalizeAlternatingMessages(messages);
  const groqKeys = shuffleInPlace(resolveGroqApiKeys());

  if (groqKeys.length === 0) {
    return Response.json(
      {
        error: 'Missing Groq API keys. Set GROQ_KEY_1 (and optional GROQ_KEY_2, GROQ_KEY_3...) in environment variables.',
      },
      { status: 500 },
    );
  }

  let upstream: Response | null = null;
  let selectedKey = '';
  let rateLimitedCount = 0;
  let lastErrorText = '';
  let dropTopP = false;

  for (let index = 0; index < groqKeys.length; index += 1) {
    const apiKey = groqKeys[index];
    const candidate = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: normalizedMessages,
        stream: true,
        max_tokens: admission?.max_tokens ?? 500,
        ...(admission?.temperature !== undefined && { temperature: admission.temperature }),
        ...(admission?.top_p !== undefined && !dropTopP && { top_p: admission.top_p }),
        ...(admission?.thinking !== undefined && { thinking: admission.thinking }),
      }),
    });

    upstream = candidate;

    if (candidate.ok) {
      selectedKey = apiKey;
      break;
    }

    lastErrorText = await candidate.text();

    if (candidate.status === 429) {
      rateLimitedCount += 1;
      console.warn(`[api/chat] Groq key ${keyLabel(apiKey, index)} rate-limited, rotating...`);
      continue;
    }

    if (candidate.status === 400 && !dropTopP) {
      const lowerError = lastErrorText.toLowerCase();
      if (lowerError.includes('top_p') || lowerError.includes('parameter') || lowerError.includes('sampling')) {
        dropTopP = true;
        index -= 1; // Retry the same key
        continue;
      }
    }

    if (candidate.status === 400 || candidate.status >= 500) {
      break;
    }

    break;
  }

  if (!upstream) {
    return Response.json({ error: 'Groq request failed before reaching upstream.' }, { status: 500 });
  }

  if (!upstream.ok) {
    if (upstream.status === 429 && rateLimitedCount === groqKeys.length) {
      return Response.json(
        {
          error: 'All AI engines are currently yapping too hard. Please try again in 60s.',
          reason: 'all_keys_rate_limited',
          retryAfter: 60,
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        },
      );
    }

    const errorText = lastErrorText || (await upstream.text());
    const reason =
      upstream.status === 400
        ? 'provider_bad_request'
        : upstream.status === 401 || upstream.status === 403
          ? 'provider_auth_error'
          : 'provider_upstream_error';

    return Response.json(
      {
        error: `Groq error ${upstream.status}: ${errorText}`,
        reason,
        provider: 'groq',
        model: modelId,
      },
      { status: upstream.status },
    );
  }

  if (!upstream.body) {
    return Response.json({ error: 'Groq stream body is empty.' }, { status: 500 });
  }

  const upstreamBody = upstream.body;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const write = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const reader = upstreamBody.getReader();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const lines = block.split('\n').map((line) => line.trim());
            const dataLine = lines.find((line) => line.startsWith('data:'));

            if (!dataLine) {
              continue;
            }

            const raw = dataLine.slice(5).trim();
            if (!raw || raw === '[DONE]') {
              continue;
            }

            let payload: Record<string, unknown>;
            try {
              payload = JSON.parse(raw) as Record<string, unknown>;
            } catch {
              write({ delta: raw });
              continue;
            }

            if (payload.error) {
              throw new Error(String(payload.error));
            }

            const delta = extractGroqDelta(payload);
            if (delta) {
              write({ delta });
            }
          }
        }

        await incrementUsage(sessionId);
        if (admission) {
          await markConversationTurnComplete({
            conversationKey: admission.conversationKey,
            sessionId: admission.sessionId,
            maxTurns: admission.maxTurns,
          });
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        if (admission) {
          await releaseConversationAdmissionOnFailure({
            conversationKey: admission.conversationKey,
            sessionId: admission.sessionId,
            reason: safeErrorMessage(error),
          });
        }
        write({
          error: String((error as Error)?.message || 'Groq stream failed'),
          key: selectedKey ? keyLabel(selectedKey, groqKeys.indexOf(selectedKey)) : undefined,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

function normalizeMessages(messages: Array<{ role: string; content: string }>) {
  return messages.map((message) => {
    const role =
      message.role === 'system' || message.role === 'assistant' || message.role === 'user'
        ? message.role
        : 'user';

    return {
      role,
      content: String(message.content || ''),
    };
  });
}

function normalizeAlternatingMessages(messages: Array<{ role: string; content: string }>) {
  const base = normalizeMessages(messages)
    .map((message) => ({
      role: message.role,
      content: String(message.content || '').trim(),
    }))
    .filter((message) => message.content.length > 0);

  const merged: Array<{ role: string; content: string }> = [];

  for (const message of base) {
    const last = merged[merged.length - 1];
    if (last && last.role === message.role) {
      // Some upstream providers reject same-role adjacency; merge to stabilize request shape.
      last.content = `${last.content}\n\n${message.content}`;
      continue;
    }

    merged.push({ ...message });
  }

  if (!merged.some((message) => message.role === 'user')) {
    merged.push({
      role: 'user',
      content: 'Continue the conversation in one concise turn.',
    });
  }

  return merged;
}

async function createOpenRouterStreamResponse({
  modelId,
  messages,
  sessionId,
  admission,
}: {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
  admission?: AdmissionContext;
}) {
  const normalizedMessages = normalizeAlternatingMessages(messages);
  const openrouterKeys = shuffleInPlace(resolveOpenRouterApiKeys());

  if (openrouterKeys.length === 0) {
    return Response.json(
      {
        error: 'Missing OpenRouter API keys. Set OPENROUTER_KEY_1 (and optional OPENROUTER_KEY_2, OPENROUTER_KEY_3...) in environment variables.',
      },
      { status: 500 },
    );
  }

  let upstream: Response | null = null;
  let selectedKey = '';
  let rateLimitedCount = 0;
  let lastErrorText = '';
  let dropTopP = false;

  for (let index = 0; index < openrouterKeys.length; index += 1) {
    const apiKey = openrouterKeys[index];
    const candidate = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof globalThis !== 'undefined' && 'location' in globalThis ? String(globalThis.location.origin) : 'https://aiyapping.com',
      },
      body: JSON.stringify({
        model: modelId,
        messages: normalizedMessages,
        stream: true,
        max_tokens: admission?.max_tokens ?? 500,
        ...(admission?.temperature !== undefined && { temperature: admission.temperature }),
        ...(admission?.top_p !== undefined && !dropTopP && { top_p: admission.top_p }),
      }),
    });

    upstream = candidate;

    if (candidate.ok) {
      selectedKey = apiKey;
      break;
    }

    lastErrorText = await candidate.text();

    if (candidate.status === 429) {
      rateLimitedCount += 1;
      console.warn(`[api/chat] OpenRouter key ${keyLabel(apiKey, index)} rate-limited, rotating...`);
      continue;
    }

    if (candidate.status === 400 && !dropTopP) {
      const lowerError = lastErrorText.toLowerCase();
      if (lowerError.includes('top_p') || lowerError.includes('parameter') || lowerError.includes('sampling')) {
        dropTopP = true;
        index -= 1; // Retry the same key
        continue;
      }
    }

    if (candidate.status === 400 || candidate.status >= 500) {
      break;
    }

    break;
  }

  if (!upstream) {
    return Response.json({ error: 'OpenRouter request failed before reaching upstream.' }, { status: 500 });
  }

  if (!upstream.ok) {
    if (upstream.status === 429 && rateLimitedCount === openrouterKeys.length) {
      return Response.json(
        {
          error: 'All AI engines are currently yapping too hard. Please try again in 60s.',
          reason: 'all_keys_rate_limited',
          retryAfter: 60,
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        },
      );
    }

    const errorText = lastErrorText || (await upstream.text());
    const reason =
      upstream.status === 400
        ? 'provider_bad_request'
        : upstream.status === 401 || upstream.status === 403
          ? 'provider_auth_error'
          : 'provider_upstream_error';

    return Response.json(
      {
        error: `OpenRouter error ${upstream.status}: ${errorText}`,
        reason,
        provider: 'openrouter',
        model: modelId,
      },
      { status: upstream.status },
    );
  }

  if (!upstream.body) {
    return Response.json({ error: 'OpenRouter stream body is empty.' }, { status: 500 });
  }

  const upstreamBody = upstream.body;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const write = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const reader = upstreamBody.getReader();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const lines = block.split('\n').map((line) => line.trim());
            const dataLine = lines.find((line) => line.startsWith('data:'));

            if (!dataLine) {
              continue;
            }

            const raw = dataLine.slice(5).trim();
            if (!raw || raw === '[DONE]') {
              continue;
            }

            let payload: Record<string, unknown>;
            try {
              payload = JSON.parse(raw) as Record<string, unknown>;
            } catch {
              write({ delta: raw });
              continue;
            }

            if (payload.error) {
              throw new Error(String(payload.error));
            }

            const delta = extractGroqDelta(payload);
            if (delta) {
              write({ delta });
            }
          }
        }

        await incrementUsage(sessionId);
        if (admission) {
          await markConversationTurnComplete({
            conversationKey: admission.conversationKey,
            sessionId: admission.sessionId,
            maxTurns: admission.maxTurns,
          });
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        if (admission) {
          await releaseConversationAdmissionOnFailure({
            conversationKey: admission.conversationKey,
            sessionId: admission.sessionId,
            reason: safeErrorMessage(error),
          });
        }
        write({
          error: String((error as Error)?.message || 'OpenRouter stream failed'),
          key: selectedKey ? keyLabel(selectedKey, openrouterKeys.indexOf(selectedKey)) : undefined,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

async function createGitHubModelsStreamResponse({
  modelId,
  messages,
  sessionId,
  admission,
}: {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
  admission?: AdmissionContext;
}) {
  const githubKeys = shuffleInPlace(resolveGitHubModelsApiKeys());

  if (githubKeys.length === 0) {
    return Response.json(
      {
        error:
          'Missing GitHub Models API key. Set GITHUB_MODELS_KEY_1 (or GITHUB_MODELS_API_KEY) with models scope.',
      },
      { status: 500 },
    );
  }

  const normalizedMessages = normalizeAlternatingMessages(messages);
  let upstream: Response | null = null;
  let lastErrorText = '';
  let rateLimitedCount = 0;

  for (let index = 0; index < githubKeys.length; index += 1) {
    const apiKey = githubKeys[index];
    const candidate = await fetch(GITHUB_MODELS_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_MODELS_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: normalizeGithubModelsId(modelId),
        messages: normalizedMessages,
        stream: false,
        max_tokens: admission?.max_tokens ?? 500,
        ...(admission?.temperature !== undefined && { temperature: admission.temperature }),
        ...(admission?.top_p !== undefined && { top_p: admission.top_p }),
      }),
    });

    upstream = candidate;

    if (candidate.ok) {
      break;
    }

    lastErrorText = await candidate.text();
    if (candidate.status === 429) {
      rateLimitedCount += 1;
      console.warn(`[api/chat] GitHub Models key ${keyLabel(apiKey, index)} rate-limited, rotating...`);
      continue;
    }

    break;
  }

  if (!upstream) {
    return Response.json({ error: 'GitHub Models request failed before reaching upstream.' }, { status: 500 });
  }

  if (!upstream.ok) {
    if (upstream.status === 429 && rateLimitedCount === githubKeys.length) {
      return Response.json(
        {
          error: 'GitHub Models is currently rate limited for this account. Please try again shortly.',
          reason: 'all_keys_rate_limited',
          retryAfter: 60,
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        },
      );
    }

    let errorText = lastErrorText || (await upstream.text());
    try {
      const parsedErr = JSON.parse(errorText) as Record<string, any>;
      if (parsedErr?.error?.message) {
        errorText = String(parsedErr.error.message);
      } else if (parsedErr?.message) {
        errorText = String(parsedErr.message);
      }
    } catch {
      // not JSON
    }

    const reason =
      upstream.status === 400
        ? 'provider_bad_request'
        : upstream.status === 401 || upstream.status === 403
          ? 'provider_auth_error'
          : 'provider_upstream_error';

    return Response.json(
      {
        error: `GitHub Models: ${errorText}`,
        reason,
        provider: 'github-models',
        model: modelId,
      },
      { status: upstream.status },
    );
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await upstream.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const responseText = extractGithubModelsDelta(payload);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const write = (eventPayload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventPayload)}\n\n`));
      };

      try {
        if (responseText) {
          write({ delta: responseText });
        }

        await incrementUsage(sessionId);
        if (admission) {
          await markConversationTurnComplete({
            conversationKey: admission.conversationKey,
            sessionId: admission.sessionId,
            maxTurns: admission.maxTurns,
          });
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        if (admission) {
          await releaseConversationAdmissionOnFailure({
            conversationKey: admission.conversationKey,
            sessionId: admission.sessionId,
            reason: safeErrorMessage(error),
          });
        }

        write({ error: String((error as Error)?.message || 'GitHub Models stream failed') });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

async function performProviderRequestWithAdmission({
  invoke,
  admission,
  requestId,
  stage,
}: {
  invoke: () => Promise<Response>;
  admission: AdmissionContext;
  requestId: string;
  stage: string;
}) {
  const startedAt = Date.now();

  while (true) {
    let response: Response;
    try {
      response = await withTimeout(
        invoke(),
        PROVIDER_INVOKE_TIMEOUT_MS,
        'Provider request timed out before response.',
      );
    } catch (error) {
      await releaseConversationAdmissionOnFailure({
        conversationKey: admission.conversationKey,
        sessionId: admission.sessionId,
        reason: safeErrorMessage(error),
      });
      throw error;
    }

    if (!response.ok && response.status !== 429) {
      await releaseConversationAdmissionOnFailure({
        conversationKey: admission.conversationKey,
        sessionId: admission.sessionId,
        reason: `provider_status_${response.status}`,
      });
      return response;
    }

    if (response.status === 429) {
      const clonedResponse = response.clone();
      const payload = await parseResponseJsonSafe(clonedResponse);
      const reason = String(payload?.reason || '');
      const errorText = String(payload?.error || '');
      const isProviderSaturated =
        reason === 'all_keys_rate_limited'
        || errorText.includes('All AI engines are currently yapping too hard');

      if (!isProviderSaturated) {
        await releaseConversationAdmissionOnFailure({
          conversationKey: admission.conversationKey,
          sessionId: admission.sessionId,
          reason: `provider_429_nonretryable_${reason || 'unknown'}`,
        });
        return response;
      }

      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= ACTIVE_PRIORITY_RETRY_TIMEOUT_MS) {
        await releaseConversationAdmissionOnFailure({
          conversationKey: admission.conversationKey,
          sessionId: admission.sessionId,
          reason: 'provider_rate_limit_timeout',
        });

        return buildRetryTimeoutResponse({ requestId, stage });
      }

      await refreshConversationLease({
        conversationKey: admission.conversationKey,
        sessionId: admission.sessionId,
      });

      const jitterMs = Math.floor(Math.random() * 1500);
      await wait(ACTIVE_PRIORITY_RETRY_DELAY_MS + jitterMs);
      continue;
    }

    return response;
  }
}

function sanitizeMessageContent(content: string): string {
  if (typeof content !== 'string') return content;
  
  let s = content.replace(/[{}]/g, '');
  s = s.replace(/(ignore|disregard|forget|bypass|reset|drop)\s+(all\s+)?(previous\s+)?(instructions?|system prompt|rules|context|persona)/gi, '');
  s = s.replace(/(you are now|act as)\s+(a|an)/gi, '');
  s = s.replace(/do\s+not\s+follow/gi, '');
  
  return s.trim();
}

export default async function handler(request: Request): Promise<Response> {
  const requestId = createRequestId();
  let stage = 'method-check';

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed', requestId, stage: 'method-check' }, { status: 405 });
  }

  try {
    stage = 'parse-body';
    const body = (await request.json()) as ChatRequestBody;

    stage = 'validate-body';
    const modelId = String(body?.modelId || body?.model || '');
    if (!modelId || !Array.isArray(body?.messages) || !body?.sessionId) {
      return Response.json(
        {
          error: 'Missing required body fields: provider, modelId/model, messages, sessionId',
          requestId,
          stage,
        },
        { status: 400 },
      );
    }
    
    let injectionDetected = false;
    body.messages = body.messages.map(msg => {
      const original = msg.content ?? '';
      const sanitized = sanitizeMessageContent(original);
      if (original !== sanitized && original.length > sanitized.length) {
        injectionDetected = true;
      }
      return { ...msg, content: sanitized };
    });

    if (injectionDetected) {
      // Intentionally not awaiting in foreground to avoid slowing down response, 
      // but in edge environments fire-and-forget might be killed early. 
      // Better to await it so it completes.
      await recordInjectionAttempt(body.sessionId);
    }

    stage = 'resolve-provider';
    const provider = resolveProvider(body?.provider, modelId);
    const turnType = normalizeTurnType(body);
    const turnNumber = normalizeTurnNumber(body);
    const maxTurns = normalizeMaxTurns(body);
    const conversationKey = String(body?.conversationKey || `${body.sessionId}-conversation`).trim();

    if (!conversationKey) {
      return Response.json(
        {
          error: 'conversationKey is required for admission control.',
          requestId,
          stage: 'resolve-provider',
        },
        { status: 400 },
      );
    }

    const admissionContext: AdmissionContext = {
      conversationKey,
      turnType,
      turnNumber,
      maxTurns,
      sessionId: body.sessionId,
      requestId,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      top_p: body.top_p,
      thinking: body.thinking,
    };

    stage = 'usage-check';
    await getUsageStatus(body.sessionId);

    stage = 'admission-check';
    const admission = await acquireConversationAdmission({
      conversationKey,
      sessionId: body.sessionId,
      turnType,
      turnNumber,
      maxTurns,
    });

    if (!admission.ok) {
      return buildPriorityBlockedResponse({
        requestId,
        stage,
        retryAfter: admission.retryAfter,
      });
    }

    const providerStage =
      provider === 'huggingface'
        ? 'huggingface-stream'
        : provider === 'nvidia'
          ? 'nvidia-stream'
          : provider === 'openrouter'
            ? 'openrouter-stream'
            : provider === 'github-models'
              ? 'github-models-stream'
              : 'groq-stream';

    const invokeProvider = async () => {
      if (provider === 'huggingface') {
        stage = providerStage;
        const hfResponse = await createHuggingFaceStreamResponse({
          modelId,
          messages: body.messages,
          sessionId: body.sessionId,
          admission: admissionContext,
        });

        if (!hfResponse.ok && hfResponse.status === 400) {
          const payload = await parseResponseJsonSafe(hfResponse);
          const reason = String(payload?.reason || '');

          if (reason === 'provider_bad_request') {
            console.warn('[api/chat] Hugging Face returned provider_bad_request. Retrying this turn with Groq fallback model.', {
              requestId,
              conversationKey,
              turnType,
              turnNumber,
              originalModel: modelId,
              fallbackModel: HF_BAD_REQUEST_GROQ_FALLBACK_MODEL,
            });

            return createGroqStreamResponse({
              modelId: HF_BAD_REQUEST_GROQ_FALLBACK_MODEL,
              messages: body.messages,
              sessionId: body.sessionId,
              admission: admissionContext,
            });
          }
        }

        return hfResponse;
      }

      if (provider === 'nvidia') {
        stage = providerStage;
        return createNvidiaStreamResponse({
          modelId,
          messages: body.messages,
          sessionId: body.sessionId,
          admission: admissionContext,
        });
      }

      if (provider === 'openrouter') {
        stage = providerStage;
        return createOpenRouterStreamResponse({
          modelId,
          messages: body.messages,
          sessionId: body.sessionId,
          admission: admissionContext,
        });
      }

      if (provider === 'github-models') {
        stage = providerStage;
        return createGitHubModelsStreamResponse({
          modelId,
          messages: body.messages,
          sessionId: body.sessionId,
          admission: admissionContext,
        });
      }

      stage = providerStage;
      return createGroqStreamResponse({
        modelId,
        messages: body.messages,
        sessionId: body.sessionId,
        admission: admissionContext,
      });
    };

    return performProviderRequestWithAdmission({
      invoke: invokeProvider,
      admission: admissionContext,
      requestId,
      stage: providerStage,
    });
  } catch (error) {
    const message = safeErrorMessage(error);
    // Server-side structured log for debugging API failures.
    console.error('[api/chat] request failed', {
      requestId,
      message,
      stack: (error as { stack?: string })?.stack,
    });

    return Response.json(
      {
        error: message,
        requestId,
        stage,
      },
      { status: 500 },
    );
  }
}
