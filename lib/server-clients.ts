import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function getAuthenticatedServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Supabase is not configured')

  const cookieStore = await cookies()
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {},
    },
  })
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return { client, user: null }
  return { client, user }
}
