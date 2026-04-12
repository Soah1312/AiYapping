export const config = {
  runtime: 'edge',
};

type TitleRequestBody = {
  topic?: string;
  prompt1?: string;
  prompt2?: string;
};

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const NVIDIA_CHAT_COMPLETIONS_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const TITLE_MODEL_GROQ = 'llama-3.3-70b-versatile';
const TITLE_MODEL_NVIDIA_BACKUP = 'moonshotai/kimi-k2-instruct';
const TITLE_MIN_WORDS = 4;
const TITLE_MAX_WORDS = 6;

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

function resolveGroqTitleApiKeys() {
  return [...new Set([
    ...resolveApiKeysByPrefix('GROQ_TITLE_KEY_', 'GROQ_TITLE_API_KEY'),
    ...resolveApiKeysByPrefix('GROQ_KEY_', 'GROQ_API_KEY'),
  ].filter(Boolean))];
}

function resolveNvidiaTitleApiKeys() {
  return [...new Set([
    ...resolveApiKeysByPrefix('NVIDIA_TITLE_KEY_', 'NVIDIA_TITLE_API_KEY'),
    ...resolveApiKeysByPrefix('NVIDIA_KEY_', 'NVIDIA_API_KEY'),
  ].filter(Boolean))];
}

function shuffleInPlace<T>(values: T[]) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  return next;
}

function tokenizeWords(text: string) {
  return String(text || '').match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) || [];
}

function normalizeTitle(rawTitle: string, fallbackSource: string) {
  const candidateWords = tokenizeWords(rawTitle);
  const fallbackWords = tokenizeWords(fallbackSource);

  const selected: string[] = [];

  for (const word of candidateWords) {
    selected.push(word);
    if (selected.length >= TITLE_MAX_WORDS) {
      break;
    }
  }

  if (selected.length < TITLE_MIN_WORDS) {
    for (const word of fallbackWords) {
      selected.push(word);
      if (selected.length >= TITLE_MIN_WORDS) {
        break;
      }
    }
  }

  const finalWords = selected.slice(0, TITLE_MAX_WORDS);

  if (finalWords.length === 0) {
    return 'Untitled chat';
  }

  const title = finalWords
    .map((word, index) => {
      if (/^[A-Z0-9]{2,}$/.test(word)) {
        return word;
      }

      const lowered = word.toLowerCase();
      if (index === 0) {
        return `${lowered.charAt(0).toUpperCase()}${lowered.slice(1)}`;
      }

      return lowered;
    })
    .join(' ')
    .trim();

  return title || 'Untitled chat';
}

function extractAssistantText(payload: Record<string, unknown>) {
  const firstChoice =
    Array.isArray(payload.choices) && payload.choices[0] && typeof payload.choices[0] === 'object'
      ? (payload.choices[0] as { message?: { content?: string }; text?: string })
      : null;

  if (firstChoice?.message?.content) {
    return String(firstChoice.message.content);
  }

  if (firstChoice?.text) {
    return String(firstChoice.text);
  }

  if (typeof payload.generated_text === 'string') {
    return payload.generated_text;
  }

  return '';
}

function isSyntheticTopic(topic: string) {
  const normalized = String(topic || '').trim();
  if (!normalized) {
    return false;
  }

  return /^ai-1:/i.test(normalized) || /\|\s*ai-2:/i.test(normalized);
}

function createTitleRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `title-${Math.random().toString(36).slice(2, 10)}${Date.now()}`;
}

export default async function handler(request: Request): Promise<Response> {
  const requestId = createTitleRequestId();

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed', requestId }, { status: 405 });
  }

  try {
    const body = (await request.json()) as TitleRequestBody;
    const prompt1 = String(body?.prompt1 || '').trim();
    const prompt2 = String(body?.prompt2 || '').trim();
    const topic = String(body?.topic || '').trim();
    const fallbackSource = !isSyntheticTopic(topic) ? topic : '';

    if (!prompt1 && !prompt2 && !topic) {
      console.warn('[api/title] Empty input. Returning fallback title.', { requestId });
      return Response.json({ title: normalizeTitle('', fallbackSource), fallback: true, source: 'fallback.empty_input', requestId }, { status: 200 });
    }

    const groqKeys = shuffleInPlace(resolveGroqTitleApiKeys());
    const nvidiaKeys = shuffleInPlace(resolveNvidiaTitleApiKeys());

    const titlePrompt = [
      'Generate a concise chat title from these two AI prompts.',
      'Return only the title, plain text, no quotes, 4 to 6 words.',
      `Topic: ${topic || 'N/A'}`,
      `Prompt 1: ${prompt1 || 'N/A'}`,
      `Prompt 2: ${prompt2 || 'N/A'}`,
    ].join('\n');

    if (groqKeys.length === 0 && nvidiaKeys.length === 0) {
      console.warn('[api/title] Missing title provider keys. Returning fallback title.', {
        requestId,
        hasGroqTitleKeys: groqKeys.length > 0,
        hasNvidiaTitleKeys: nvidiaKeys.length > 0,
      });
      return Response.json({ title: normalizeTitle('', fallbackSource), fallback: true, source: 'fallback.no_keys', requestId }, { status: 200 });
    }

    async function requestTitle(
      keys: string[],
      url: string,
      provider: 'groq' | 'nvidia',
      model: string,
      extraHeaders: Record<string, string> = {},
    ) {
      let upstream: Response | null = null;
      let lastErrorText = '';

      for (const key of keys) {
        const candidate = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...extraHeaders,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'You produce short, high-quality chat titles.',
              },
              {
                role: 'user',
                content: titlePrompt,
              },
            ],
            stream: false,
            temperature: 0.2,
            max_tokens: 24,
          }),
        });

        upstream = candidate;
        if (candidate.ok) {
          const payload = (await candidate.json()) as Record<string, unknown>;
          return {
            rawTitle: extractAssistantText(payload),
            provider,
            status: candidate.status,
            lastErrorText: '',
          };
        }

        lastErrorText = await candidate.text();
        if (candidate.status === 429) {
          continue;
        }

        break;
      }

      return {
        rawTitle: '',
        provider,
        status: upstream?.status || 0,
        lastErrorText,
      };
    }

    let rawTitle = '';
    let selectedSource = 'fallback.normalized';

    if (groqKeys.length > 0) {
      const groqResult = await requestTitle(groqKeys, GROQ_CHAT_COMPLETIONS_URL, 'groq', TITLE_MODEL_GROQ);
      rawTitle = groqResult.rawTitle;
      if (rawTitle) {
        selectedSource = 'provider.groq';
      } else if (groqResult.status) {
        console.warn('[api/title] Groq title request failed, trying NVIDIA backup.', {
          requestId,
          status: groqResult.status,
          provider: groqResult.provider,
          errorSnippet: String(groqResult.lastErrorText || '').slice(0, 240),
        });
      }
    }

    if (!rawTitle && nvidiaKeys.length > 0) {
      const nvidiaResult = await requestTitle(nvidiaKeys, NVIDIA_CHAT_COMPLETIONS_URL, 'nvidia', TITLE_MODEL_NVIDIA_BACKUP, {
        Accept: 'application/json',
      });
      rawTitle = nvidiaResult.rawTitle;
      if (rawTitle) {
        selectedSource = 'provider.nvidia';
      } else if (nvidiaResult.status) {
        console.warn('[api/title] NVIDIA title backup request failed.', {
          requestId,
          status: nvidiaResult.status,
          provider: nvidiaResult.provider,
          errorSnippet: String(nvidiaResult.lastErrorText || '').slice(0, 240),
        });
      }
    }

    const title = normalizeTitle(rawTitle, fallbackSource);
    const fallback = !rawTitle;
    if (fallback) {
      console.warn('[api/title] Falling back to normalized local title.', {
        requestId,
        source: selectedSource,
      });
    }

    return Response.json({ title, fallback, source: fallback ? 'fallback.normalized' : selectedSource, requestId }, { status: 200 });
  } catch (error) {
    const message = String((error as Error)?.message || 'Title generation failed');
    console.error('[api/title] Unhandled failure. Returning fallback title.', {
      requestId,
      error: message,
    });
    return Response.json({ title: 'Untitled chat', fallback: true, source: 'fallback.exception', requestId, error: message }, { status: 200 });
  }
}
