import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Lazy singleton — only created when first accessed in the browser
let _client: ReturnType<typeof createBrowserClient> | null = null

function getClient() {
  if (!_client) {
    _client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return _client
}

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string, unknown>)[prop as string]
  },
})

export function isSupabaseReady() {
  return !!(supabaseUrl && supabaseAnonKey)
}
