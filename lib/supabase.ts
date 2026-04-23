import { createBrowserClient } from '@supabase/ssr'

// Fallback values prevent createBrowserClient from throwing at build time
// when env vars aren't set. Auth calls will fail gracefully at runtime.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL    || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
)

export function isSupabaseReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
