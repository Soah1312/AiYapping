import { streamText, type ModelMessage } from 'ai';
import { groq } from '@ai-sdk/groq';
import { getUsageStatus, incrementUsage } from './_lib/firebase';

export const config = {
  runtime: 'edge',
};

type ChatRequestBody = {
  provider?: 'groq' | 'huggingface' | 'nvidia' | string;
  model?: string;
  modelId?: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
};

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

const NVIDIA_MODEL_MATCHERS = [
  /^deepseek-ai\//i,
  /^z-ai\//i,
  /^google\/gemma-7b$/i,
  /^mistralai\/mistral-large-3-675b-instruct-2512$/i,
  /^moonshotai\/kimi-k2-instruct@nvidia$/i,
];

const GROQ_MODEL_MATCHERS = [
  /^llama-3\.3-70b-versatile$/i,
  /^llama-3\.1-8b-instant$/i,
  /^meta-llama\/llama-4-scout-17b-16e-instruct$/i,
  /^qwen\/qwen3-32b$/i,
  /^moonshotai\/kimi-k2-instruct$/i,
  /^openai\/gpt-oss-20b$/i,
];

function resolveProvider(provider: string | undefined, modelId: string) {
  if (provider === 'groq' || provider === 'huggingface' || provider === 'nvidia') {
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

function resolveNvidiaApiKey(modelId: string) {
  const resolvedModelId = normalizeNvidiaModelId(modelId);
  const isDeepseekModel = resolvedModelId === 'deepseek-ai/deepseek-v3.2' || resolvedModelId.includes('deepseek');
  const isGemmaModel = resolvedModelId.includes('gemma-7b') || resolvedModelId.includes('/gemma-7b');
  const isGlmModel = resolvedModelId === 'z-ai/glm4.7' || resolvedModelId.startsWith('z-ai/glm');
  const isMistralLargeModel = resolvedModelId === 'mistralai/mistral-large-3-675b-instruct-2512';
  const isKimiModel = resolvedModelId === 'moonshotai/kimi-k2-instruct';

  if (isDeepseekModel) {
    return process.env.NVIDIA_API_KEY_DEEPSEEK || '';
  }

  if (isGemmaModel) {
    return process.env.NVIDIA_API_KEY_GEMMA || '';
  }

  if (isGlmModel) {
    return process.env.NVIDIA_API_KEY_GLM_MODEL || '';
  }

  if (isMistralLargeModel) {
    return process.env.NVIDIA_API_KEY_MISTRAL_LARGE || '';
  }

  if (isKimiModel) {
    return process.env.NVIDIA_API_KEY_KIMI || '';
  }

  return process.env.NVIDIA_API_KEY_GENERAL || '';
}

async function createNvidiaStreamResponse({
  modelId,
  messages,
  sessionId,
}: {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
}) {
  const apiKey = resolveNvidiaApiKey(modelId);
  if (!apiKey) {
    return Response.json(
      {
        error:
          'Missing NVIDIA API key for this model. Set the exact model key: NVIDIA_API_KEY_DEEPSEEK, NVIDIA_API_KEY_GEMMA, NVIDIA_API_KEY_GLM_MODEL, NVIDIA_API_KEY_MISTRAL_LARGE, NVIDIA_API_KEY_KIMI, or NVIDIA_API_KEY_GENERAL.',
      },
      { status: 500 },
    );
  }

  const normalizedMessages = normalizeMessages(messages).map((message) => ({
    role: message.role,
    content: typeof message.content === 'string' ? message.content : String(message.content || ''),
  }));

  const nvidiaMessages = normalizedMessages.map((message) => {
    if (message.role === 'system') {
      return {
        role: 'user',
        content: `[Instruction]\n${message.content}`,
      };
    }

    return message;
  });

  const resolvedModelId = normalizeNvidiaModelId(modelId);
  const isGlmModel = resolvedModelId === 'z-ai/glm4.7' || resolvedModelId.startsWith('z-ai/glm');
  const isMistralLargeModel = resolvedModelId === 'mistralai/mistral-large-3-675b-instruct-2512';
  const isKimiModel = resolvedModelId === 'moonshotai/kimi-k2-instruct';
  const nvidiaBaseBody: Record<string, unknown> = {
    model: resolvedModelId,
    messages: nvidiaMessages,
    temperature: isGlmModel ? 1 : isMistralLargeModel ? 0.15 : isKimiModel ? 0.6 : 0.7,
    top_p: isGlmModel ? 1 : isMistralLargeModel ? 1 : isKimiModel ? 0.9 : 0.9,
    max_tokens: isGlmModel ? 16384 : isMistralLargeModel ? 2048 : isKimiModel ? 4096 : 900,
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

  if (!upstream) {
    return Response.json({ error: 'NVIDIA request failed before reaching upstream.' }, { status: 500 });
  }

  if (!upstream.ok) {
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
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
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
}: {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
}) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Missing HUGGINGFACE_API_KEY environment variable.' }, { status: 500 });
  }

  const normalizedMessages = normalizeMessages(messages).map((message) => ({
    role: message.role,
    content: typeof message.content === 'string' ? message.content : String(message.content || ''),
  }));

  const HF_SAFE_FALLBACK_MODEL = 'katanemo/Arch-Router-1.5B:hf-inference';
  const explicitModel = modelId;
  const hfInferenceVariant = modelId.includes(':') ? modelId : `${modelId}:hf-inference`;
  const plainVariant = modelId.replace(/:hf-inference$/, '');
  const modelCandidates = [explicitModel, plainVariant, hfInferenceVariant, HF_SAFE_FALLBACK_MODEL].filter(
    (candidate, index, arr) => candidate && arr.indexOf(candidate) === index,
  );

  let upstream: Response | null = null;
  let upstreamModel = modelCandidates[0];
  let lastErrorText = '';

  for (const candidateModel of modelCandidates) {
    const candidateResponse = await fetch('https://router.huggingface.co/v1/chat/completions', {
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
        max_tokens: 500,
      }),
    });

    upstream = candidateResponse;
    upstreamModel = candidateModel;

    if (candidateResponse.ok || candidateResponse.status === 503) {
      break;
    }

    lastErrorText = await candidateResponse.text();
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

  if (!upstream) {
    return Response.json({ error: 'Hugging Face request failed before reaching upstream.' }, { status: 500 });
  }

  if (upstream.status === 503) {
    return Response.json(
      { error: 'Hugging Face is waking up this model... please wait 20 seconds.' },
      { status: 503 },
    );
  }

  if (!upstream.ok) {
    const errorText = lastErrorText || (await upstream.text());
    return Response.json(
      { error: `Hugging Face error ${upstream.status} (${upstreamModel}): ${errorText}` },
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
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
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

function normalizeMessages(messages: Array<{ role: string; content: string }>): ModelMessage[] {
  return messages.map((message) => {
    const role =
      message.role === 'system' || message.role === 'assistant' || message.role === 'user'
        ? message.role
        : 'user';

    return {
      role,
      content: String(message.content || ''),
    };
  }) as ModelMessage[];
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

    stage = 'resolve-provider';
    const provider = resolveProvider(body?.provider, modelId);

    stage = 'usage-check';
    await getUsageStatus(body.sessionId);

    if (provider === 'huggingface') {
      stage = 'huggingface-stream';
      return createHuggingFaceStreamResponse({
        modelId,
        messages: body.messages,
        sessionId: body.sessionId,
      });
    }

    if (provider === 'nvidia') {
      stage = 'nvidia-stream';
      return createNvidiaStreamResponse({
        modelId,
        messages: body.messages,
        sessionId: body.sessionId,
      });
    }

    stage = 'groq-stream';
    const result = streamText({
      model: groq(modelId),
      messages: normalizeMessages(body.messages),
      maxOutputTokens: 500,
      onFinish: async () => {
        await incrementUsage(body.sessionId);
      },
    });

    const dataResponse = (result as unknown as { toDataStreamResponse?: () => Response }).toDataStreamResponse;
    if (typeof dataResponse === 'function') {
      return dataResponse.call(result);
    }

    return result.toTextStreamResponse();
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
