export const config = {
  runtime: 'edge',
};

type TitleRequestBody = {
  topic?: string;
  prompt1?: string;
  prompt2?: string;
};

const HF_CHAT_COMPLETIONS_URL = 'https://router.huggingface.co/v1/chat/completions';
const TITLE_MODEL = 'mistral-community/Mistral-7B-Instruct-v0.2';
const TITLE_MIN_WORDS = 4;
const TITLE_MAX_WORDS = 9;

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

function resolveHuggingFaceApiKeys() {
  return [
    ...resolveApiKeysByPrefix('HUGGINGFACE_KEY_', 'HUGGINGFACE_API_KEY'),
    normalizeApiKeyValue(process.env.HF_TOKEN),
  ].filter(Boolean);
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

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as TitleRequestBody;
    const prompt1 = String(body?.prompt1 || '').trim();
    const prompt2 = String(body?.prompt2 || '').trim();
    const topic = String(body?.topic || '').trim();

    if (!prompt1 && !prompt2 && !topic) {
      return Response.json({ error: 'Missing prompt text for title generation.' }, { status: 400 });
    }

    const hfKeys = resolveHuggingFaceApiKeys();
    if (hfKeys.length === 0) {
      return Response.json({ error: 'Missing Hugging Face API keys for title generation.' }, { status: 500 });
    }

    let upstream: Response | null = null;
    let lastErrorText = '';

    const titlePrompt = [
      'Generate a concise chat title from these two AI prompts.',
      'Return only the title, plain text, no quotes, 4 to 9 words.',
      `Topic: ${topic || 'N/A'}`,
      `Prompt 1: ${prompt1 || 'N/A'}`,
      `Prompt 2: ${prompt2 || 'N/A'}`,
    ].join('\n');

    for (const key of hfKeys) {
      const candidate = await fetch(HF_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: TITLE_MODEL,
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
        break;
      }

      lastErrorText = await candidate.text();
      if (candidate.status === 429) {
        continue;
      }

      break;
    }

    if (!upstream) {
      return Response.json({ error: 'Title generation request did not reach provider.' }, { status: 500 });
    }

    if (!upstream.ok) {
      return Response.json(
        { error: `Title generation failed (${upstream.status}): ${lastErrorText || 'Unknown upstream error'}` },
        { status: upstream.status },
      );
    }

    const payload = (await upstream.json()) as Record<string, unknown>;
    const rawTitle = extractAssistantText(payload);
    const fallbackSource = [topic, prompt1, prompt2].filter(Boolean).join(' ');
    const title = normalizeTitle(rawTitle, fallbackSource);

    return Response.json({ title }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: String((error as Error)?.message || 'Title generation failed') },
      { status: 500 },
    );
  }
}
