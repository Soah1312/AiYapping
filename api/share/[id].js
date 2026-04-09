import { sendJson } from '../_lib/body';
import { supabaseAdmin, assertSupabaseConfigured } from '../_lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    assertSupabaseConfigured();
    const shareId = req.query?.id;

    if (!shareId) {
      sendJson(res, 400, { error: 'Share ID is required' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('share_id', shareId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      sendJson(res, 404, { error: 'Conversation not found' });
      return;
    }

    sendJson(res, 200, data);
  } catch (error) {
    sendJson(res, 500, {
      error: String(error?.message || 'Share lookup failed'),
    });
  }
}
