import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { email, password, name, studentId, university, major, year, semester, goals } =
    await req.json() as {
      email: string; password: string; name: string
      studentId?: string; university?: string; major?: string
      year?: string; semester?: string; goals?: string[]
    }

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Email, password and name are required' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }

  const userMeta = {
    name: name.trim(),
    student_id: studentId?.trim() || null,
    university_name: university || null,
    major: major || null,
    year_of_study: year || null,
    semester: semester || null,
    goals: goals ?? [],
  }

  // Preferred path: service role key lets us auto-confirm the email immediately
  if (serviceKey) {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMeta,
    })
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create account' }, { status: 400 })
    }
    return NextResponse.json({ userId: data.user.id })
  }

  // Fallback: regular signUp using the anon key (always available in production).
  // Works as long as "Enable email confirmations" is OFF in the Supabase dashboard
  // (Authentication → Settings → Email), or the user confirms via the email link.
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: userMeta },
  })

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create account' }, { status: 400 })
  }

  return NextResponse.json({ userId: data.user.id })
}
