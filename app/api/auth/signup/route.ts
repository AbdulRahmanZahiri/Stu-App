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

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }

  // Admin client — bypasses email confirmation entirely
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Create user with email_confirm: true = auto-confirmed, no email sent
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: name.trim(),
      student_id: studentId?.trim() || null,
      university_name: university || null,
      major: major || null,
      year_of_study: year || null,
      semester: semester || null,
      goals: goals ?? [],
    },
  })

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create account' }, { status: 400 })
  }

  return NextResponse.json({ userId: data.user.id })
}
