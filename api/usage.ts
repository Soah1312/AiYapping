import { getUsageStatus } from './_lib/firebase';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as { sessionId?: string };
    if (!body.sessionId) {
      return Response.json({ error: 'sessionId is required.' }, { status: 400 });
    }

    const usage = await getUsageStatus(body.sessionId);
    return Response.json(
      {
        remaining: usage.remaining,
        limit: usage.limit,
      },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      { error: String((error as Error)?.message || 'Usage lookup failed') },
      { status: 500 },
    );
  }
}
