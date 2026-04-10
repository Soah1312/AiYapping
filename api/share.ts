import { getConversationByShareId } from './_lib/firebase';

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

    const conversation = await getConversationByShareId(shareId);
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
