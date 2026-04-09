import { supabaseAdmin, assertSupabaseConfigured } from './supabaseAdmin';

export const FREE_DAILY_LIMIT = 10;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getUsageRecord(sessionId) {
  assertSupabaseConfigured();

  const today = todayIsoDate();
  const { data: existing, error } = await supabaseAdmin
    .from('free_usage')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!existing) {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('free_usage')
      .insert({ session_id: sessionId, turns_used: 0, date: today })
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    return inserted;
  }

  if (existing.date !== today) {
    const { data: reset, error: resetError } = await supabaseAdmin
      .from('free_usage')
      .update({ turns_used: 0, date: today })
      .eq('session_id', sessionId)
      .select('*')
      .single();

    if (resetError) {
      throw resetError;
    }

    return reset;
  }

  return existing;
}

export async function getUsageSummary(sessionId) {
  const record = await getUsageRecord(sessionId);
  return {
    remaining: Math.max(0, FREE_DAILY_LIMIT - Number(record.turns_used || 0)),
    limit: FREE_DAILY_LIMIT,
  };
}

export async function consumeFreeTurn(sessionId) {
  const record = await getUsageRecord(sessionId);
  const turnsUsed = Number(record.turns_used || 0);

  if (turnsUsed >= FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      limit: FREE_DAILY_LIMIT,
    };
  }

  const nextTurnsUsed = turnsUsed + 1;
  const { error } = await supabaseAdmin
    .from('free_usage')
    .update({ turns_used: nextTurnsUsed })
    .eq('session_id', sessionId);

  if (error) {
    throw error;
  }

  return {
    allowed: true,
    remaining: FREE_DAILY_LIMIT - nextTurnsUsed,
    limit: FREE_DAILY_LIMIT,
  };
}
