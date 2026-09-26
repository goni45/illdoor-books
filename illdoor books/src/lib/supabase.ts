import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zpzjhiagtsvmzomvyxdv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwempoaWFndHN2bXpvbXZ5eGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Nzg4NjIsImV4cCI6MjEwNTE1NDg2Mn0.DWnNpFZnsVdW1CaNUGnLp8GyupNmX2OjLDNnXooy8Fk';

const isPlaceholder = !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('YOUR_PROJECT_REF') ||
  supabaseAnonKey.includes('YOUR_SUPABASE');

export const supabaseConfigError: string | null = isPlaceholder
  ? 'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing or set to placeholder values.'
  : null;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
