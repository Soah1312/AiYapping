import { readJsonBody, sendJson } from './_lib/body';
import { supabaseAdmin, assertSupabaseConfigured } from './_lib/supabaseAdmin';
import { randomUUID } from 'node:crypto';

function createShareId() {
  return randomUUID();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    assertSupabaseConfigured();
    const body = await readJsonBody(req);

    const {
      sessionId,
      transcript,
      topic,
      mode,
      models,
      turnCount,
      verdict = null,
    } = body;

    if (!sessionId || !topic || !mode || !models || !Array.isArray(transcript)) {
      sendJson(res, 400, { error: 'Missing required fields' });
      return;
    }

    const shareId = createShareId();

    const { error } = await supabaseAdmin.from('conversations').insert({
      share_id: shareId,
      session_id: sessionId,
      topic,
      mode,
      models,
      transcript,
      turn_count: Number(turnCount || 0),
      verdict,
    });

    if (error) {
      throw error;
    }

    sendJson(res, 200, { shareId });
  } catch (error) {
    sendJson(res, 500, {
      error: String(error?.message || 'Save failed'),
    });
  }
}
