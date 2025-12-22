import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

export const supabaseError = !supabaseConfigured
  ? 'Configuración de Supabase incompleta. Verifica las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  : null;

const createSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseConfigured) {
    console.error('Supabase not configured:', supabaseError);
    return null;
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
};

export const supabase = createSupabaseClient()!;
