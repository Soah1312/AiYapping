import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

export function assertSupabaseConfigured() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured. Set SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL.');
  }
}
