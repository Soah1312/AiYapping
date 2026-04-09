import { readJsonBody, sendJson } from './_lib/body';
import { getUsageSummary } from './_lib/usage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const sessionId = body?.sessionId;

    if (!sessionId) {
      sendJson(res, 400, { error: 'sessionId is required' });
      return;
    }

    const usage = await getUsageSummary(sessionId);
    sendJson(res, 200, usage);
  } catch (error) {
    sendJson(res, 500, {
      error: String(error?.message || 'Failed to fetch usage'),
    });
  }
}
