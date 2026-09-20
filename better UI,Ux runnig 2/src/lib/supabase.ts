import { createClient } from '@supabase/supabase-js';

const configuredUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const configuredKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
const hasValidUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(configuredUrl);

export const supabaseConfigError = !hasValidUrl || !configuredKey
  ? 'Missing or invalid VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and restart Vite.'
  : null;

const supabaseUrl = supabaseConfigError ? 'http://127.0.0.1:54321' : configuredUrl;
const supabaseAnonKey = supabaseConfigError ? 'missing-public-key' : configuredKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
