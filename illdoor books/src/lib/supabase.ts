import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholder = !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('YOUR_PROJECT_REF') ||
  supabaseAnonKey.includes('YOUR_SUPABASE');

export const supabaseConfigError: string | null = isPlaceholder
  ? 'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing or set to placeholder values.'
  : null;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
