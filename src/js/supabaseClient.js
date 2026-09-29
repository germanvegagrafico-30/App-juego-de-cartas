/* ==========================================================================
   SUPABASE CLIENT INITIALIZER
   ========================================================================== */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase credentials not found in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).\n' +
    'The app will operate in local fallback mode. Connect your Supabase project for real-time multiplayer across devices!'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;
