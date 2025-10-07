import { createClient } from '@supabase/supabase-js'

// Support both build-time and runtime env vars
const getEnv = (key: string): string | undefined => {
  // @ts-ignore - window.__ENV__ is injected at runtime
  if (typeof window !== 'undefined' && window.__ENV__) {
    // @ts-ignore
    return window.__ENV__[key]
  }
  return import.meta.env[key]
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
