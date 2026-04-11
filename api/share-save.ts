import { setSharedConversation } from './_lib/firebase';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const conversationData = await request.json();

    if (!conversationData || !conversationData.id) {
      return Response.json({ error: 'Invalid conversation data' }, { status: 400 });
    }

    // Save to Firestore and return the ID
    await setSharedConversation(conversationData);

    return Response.json({ id: conversationData.id }, { status: 201 });
  } catch (error) {
    console.error('Share save error:', error);
    return Response.json(
      { error: String((error as Error)?.message || 'Failed to save share') },
      { status: 500 },
    );
  }
}
