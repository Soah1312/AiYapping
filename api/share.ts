import { getSharedConversation } from './_lib/firebase';

function transformSharedForDisplay(data: any) {
  const model1 = data.m?.ai1 || 'Unknown';
  const model2 = data.m?.ai2 || 'Unknown';

  const resolveSide = (msg: any, index: number) => {
    if (msg?.s === 'ai1' || msg?.s === 'ai2') {
      return msg.s;
    }

    if (msg?.m && msg.m === model1) {
      return 'ai1';
    }

    if (msg?.m && msg.m === model2) {
      return 'ai2';
    }

    return index % 2 === 0 ? 'ai1' : 'ai2';
  };

  // Transform space-optimized data back to display format
  return {
    title: data.title || data.t || 'Untitled Arena',
    topic: data.t || data.title || 'Untitled Arena',
    config: {
      mode: 'chat',
      model1,
      model2,
    },
    turnCount: data.messages?.length || 0,
    transcript: (data.messages || []).map((msg: any, index: number) => {
      const side = resolveSide(msg, index);

      return {
      id: Math.random().toString(36).slice(2),
      role: msg.r,
      content: msg.c,
      model: msg.m,
      side,
      persona: side === 'ai1' ? 'AI-1' : 'AI-2',
      turn: index + 1,
      timestamp: new Date().toISOString(),
      status: 'done',
      };
    }),
  };
}

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const shareId = url.searchParams.get('id');

    if (!shareId) {
      return Response.json({ error: 'Missing share id' }, { status: 400 });
    }

    const rawData = await getSharedConversation(shareId);
    const conversation = rawData ? transformSharedForDisplay(rawData) : null;
    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json(conversation, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: String((error as Error)?.message || 'Share lookup failed') },
      { status: 500 },
    );
  }
}
