export const config = {
  runtime: 'edge',
};

const GITHUB_MODELS_URL = 'https://models.github.ai/inference/chat/completions';
const VERDICT_MODEL = 'gpt-4o';

function normalizeApiKeyValue(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/^['"]+|['"]+$/g, '');
}

function resolveApiKeysByPrefix(prefix: string, fallbackKeyName?: string): string[] {
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

function resolveGithubModelsToken() {
  const keys = [
    ...resolveApiKeysByPrefix('GITHUB_MODELS_KEY_', 'GITHUB_MODELS_API_KEY'),
    normalizeApiKeyValue(process.env.GITHUB_MODELS_KEY),
    normalizeApiKeyValue(process.env.GITHUB_MODELS_TOKEN),
    normalizeApiKeyValue(process.env.GITHUB_TOKEN),
    normalizeApiKeyValue(process.env.GH_TOKEN),
  ].filter(Boolean);

  return keys[0] || '';
}

function extractMessageContent(content: any): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .join('')
      .trim();
  }

  return '';
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { prompt, system } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'Missing prompt' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    const token = resolveGithubModelsToken();

    if (!token) {
      return Response.json({ error: 'GitHub Models token not configured on server (set GITHUB_MODELS_KEY_1, GITHUB_MODELS_API_KEY, or GITHUB_MODELS_TOKEN)' }, {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    const response = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        model: VERDICT_MODEL,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ error: `GitHub Models API error: ${response.status}`, details: errorText }, {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    const data = await response.json();
    const verdict = extractMessageContent(data?.choices?.[0]?.message?.content);

    return Response.json({ verdict, judgeModel: VERDICT_MODEL }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('[api/judge] failure:', error);
    return Response.json({ error: 'Internal Server Error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
