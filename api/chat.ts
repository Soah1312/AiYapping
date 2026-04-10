import { streamText, type ModelMessage } from 'ai';
import { groq } from '@ai-sdk/groq';
import { getUsageStatus, incrementUsage } from './_lib/firebase';

export const config = {
  runtime: 'edge',
};

type ChatRequestBody = {
  provider?: 'groq' | 'huggingface';
  model: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
};

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

function toPrompt(messages: Array<{ role: string; content: string }>) {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${String(message.content || '')}`)
    .join('\n\n');
}

async function runHuggingFace(model: string, messages: Array<{ role: string; content: string }>) {
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) {
    throw new Error('Missing HUGGINGFACE_API_KEY for Hugging Face inference.');
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: toPrompt(messages),
      parameters: {
        max_new_tokens: 500,
        return_full_text: false,
        temperature: 0.8,
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error || payload?.message || 'Hugging Face request failed';
    throw new Error(String(message));
  }

  if (Array.isArray(payload) && payload[0]?.generated_text) {
    return String(payload[0].generated_text);
  }

  if (typeof payload?.generated_text === 'string') {
    return payload.generated_text;
  }

  if (Array.isArray(payload) && payload[0]?.summary_text) {
    return String(payload[0].summary_text);
  }

  return String(payload?.text || payload?.output || '');
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as ChatRequestBody;

    if (!body?.model || !Array.isArray(body?.messages) || !body?.sessionId) {
      return Response.json(
        { error: 'Missing required body fields: model, messages, sessionId' },
        { status: 400 },
      );
    }

    const usage = await getUsageStatus(body.sessionId);
    if (usage.turnsUsed >= usage.limit) {
      return Response.json(
        {
          error: 'Daily free turn limit reached (10).',
          usage: {
            remaining: 0,
            limit: usage.limit,
          },
        },
        { status: 429 },
      );
    }

    const provider = body.provider || 'groq';

    if (provider === 'huggingface') {
      const text = await runHuggingFace(body.model, body.messages);
      await incrementUsage(body.sessionId);

      return new Response(text, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    const result = streamText({
      model: groq(body.model),
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
    return Response.json(
      { error: String((error as Error)?.message || 'Chat stream failed') },
      { status: 500 },
    );
  }
}
