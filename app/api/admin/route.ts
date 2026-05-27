import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─── Layer 2: Server-side admin guard ─────────────────────────────────────────
// Middleware (Layer 1) blocks the /admin page.
// This API route adds a second independent check so even a direct API call
// from a non-admin is rejected before any data is returned.

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},                              // read-only in Route Handlers
      },
    }
  )

  // Must be authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Must be admin (RLS + explicit check)
  const { data: self } = await supabase
    .from('student_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!self?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ─── Fetch all users (RLS "Admin reads all profiles" policy allows this) ───
  const { data: users, error: usersError } = await supabase
    .from('student_profiles')
    .select('id, name, email, university_name, major, year_of_study, gpa, is_admin, created_at')
    .order('created_at', { ascending: false })

  if (usersError) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const universities = new Set(
    (users ?? []).map(u => u.university_name).filter(Boolean)
  )

  return NextResponse.json({
    users: users ?? [],
    stats: {
      total:       users?.length ?? 0,
      newThisWeek: (users ?? []).filter(u => new Date(u.created_at) > oneWeekAgo).length,
      universities: universities.size,
      admins:      (users ?? []).filter(u => u.is_admin).length,
    },
  })
}
