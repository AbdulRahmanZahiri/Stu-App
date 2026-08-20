import 'server-only'

import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from './server-clients'

export async function requireApiUser() {
  try {
    const { client, user } = await getAuthenticatedServerClient()
    if (!user) {
      return { ok: false as const, response: NextResponse.json({ error: 'Sign in to use this feature.' }, { status: 401 }) }
    }

    return { ok: true as const, client, user }
  } catch {
    return { ok: false as const, response: NextResponse.json({ error: 'Authentication service is unavailable.' }, { status: 503 }) }
  }
}

// Allows unauthenticated users — caller decides what to do when user is null
export async function optionalApiUser() {
  try {
    const { client, user } = await getAuthenticatedServerClient()
    return { client, user: user ?? null }
  } catch {
    return { client: null, user: null }
  }
}
