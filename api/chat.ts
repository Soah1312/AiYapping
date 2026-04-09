import { streamText, type ModelMessage } from 'ai';
import { groq } from '@ai-sdk/groq';
import { getUsageStatus, incrementUsage } from './_lib/firebase';

export const config = {
  runtime: 'edge',
};

type ChatRequestBody = {
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
