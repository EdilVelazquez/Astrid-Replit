import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-key';

let supabaseInstance: SupabaseClient | null = null;
let configLoaded = false;
let configError: string | null = null;

function hasValidConfig(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http') && supabaseUrl !== PLACEHOLDER_URL);
}

async function loadConfigFromServer(): Promise<void> {
  if (configLoaded) return;
  
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      if (config.supabaseUrl && config.supabaseAnonKey) {
        supabaseUrl = config.supabaseUrl;
        supabaseAnonKey = config.supabaseAnonKey;
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          },
        });
        configError = null;
      }
    }
  } catch (e) {
    console.warn('Could not load config from server:', e);
  }
  
  configLoaded = true;
}

function createSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;
  
  const url = hasValidConfig() ? supabaseUrl : PLACEHOLDER_URL;
  const key = hasValidConfig() ? supabaseAnonKey : PLACEHOLDER_KEY;
  
  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
  
  return supabaseInstance;
}

export async function initSupabase(): Promise<{ configured: boolean; error: string | null }> {
  if (!hasValidConfig()) {
    await loadConfigFromServer();
  }
  
  const configured = hasValidConfig();
  if (!configured) {
    configError = 'Configuración de Supabase incompleta. Verifica las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.';
  }
  
  return { configured, error: configError };
}

export function getSupabaseConfigured(): boolean {
  return hasValidConfig();
}

export function getSupabaseError(): string | null {
  return hasValidConfig() ? null : configError;
}

export const supabaseConfigured = hasValidConfig();
export const supabaseError = !hasValidConfig()
  ? 'Configuración de Supabase incompleta. Verifica las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  : null;

export const supabase: SupabaseClient = createSupabaseClient();

export async function getSupabase(): Promise<SupabaseClient> {
  await initSupabase();
  return supabaseInstance || createSupabaseClient();
}
