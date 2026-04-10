import { nanoid } from 'nanoid';
import { createConversationSkeleton, saveConversation } from './_lib/firebase';

export const config = {
  runtime: 'edge',
};

type SaveRequestBody = {
  initialize?: boolean;
  sessionId: string;
  conversationId?: string;
  topic?: string;
  config?: {
    model1: string;
    model2: string;
    mode: 'debate' | 'chat';
  };
  transcript?: Array<{
    role: string;
    content: string;
    model?: string;
    timestamp?: string;
  }>;
  verdict?: Record<string, unknown> | null;
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as SaveRequestBody;

    if (!body?.sessionId) {
      return Response.json({ error: 'sessionId is required.' }, { status: 400 });
    }

    if (body.initialize) {
      if (!body.topic || !body.config) {
        return Response.json({ error: 'topic and config are required for initialize.' }, { status: 400 });
      }

      const conversationId = await createConversationSkeleton({
        ownerId: body.sessionId,
        topic: body.topic,
        config: body.config,
      });

      return Response.json({ conversationId }, { status: 200 });
    }

    if (!body.topic || !body.config || !Array.isArray(body.transcript)) {
      return Response.json({ error: 'topic, config, and transcript are required.' }, { status: 400 });
    }

    const shareId = nanoid(10);
    const conversationId = await saveConversation({
      conversationId: body.conversationId,
      ownerId: body.sessionId,
      shareId,
      topic: body.topic,
      config: body.config,
      transcript: body.transcript,
      verdict: body.verdict || null,
    });

    return Response.json({ shareId, conversationId }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: String((error as Error)?.message || 'Save failed') },
      { status: 500 },
    );
  }
}
