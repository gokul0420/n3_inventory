import { createClient } from '@supabase/supabase-js';

// Vite exposes only vars prefixed with VITE_ to the browser.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud in dev so a missing .env is obvious instead of silent 401s.
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env and fill in your project credentials.'
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,      // keep users logged in across refreshes
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 10 } },
});

// True only when both env vars are present — lets the app fall back to
// in-memory mock mode during local dev if Supabase isn't configured yet.
export const isSupabaseConfigured = Boolean(url && anonKey);
