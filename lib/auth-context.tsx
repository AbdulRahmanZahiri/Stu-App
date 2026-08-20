'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export type StudentProfile = {
  id: string
  name: string
  email: string
  student_id?: string | null
  major?: string | null
  year_of_study?: number | null
  university_name?: string | null
  semester?: string | null
  gpa?: number | null
  avatar_url?: string | null
  bio?: string | null
  goals?: string[] | null
  expected_graduation?: string | null
  preferences?: Record<string, string | number | boolean> | null
  is_admin?: boolean | null
}

type AuthContextType = {
  user: User | null
  profile: StudentProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (patch: Partial<Omit<StudentProfile, 'id' | 'email' | 'is_admin'>>) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (authUser: User) => {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!error && data) {
      setProfile(data as StudentProfile)
      setLoading(false)
      return
    }

    // Existing projects may not have the auth trigger yet. With an active
    // session, RLS allows the user to repair their own missing profile.
    if (error?.code === 'PGRST116') {
      const metadata = authUser.user_metadata ?? {}
      const { data: created, error: createError } = await supabase
        .from('student_profiles')
        .upsert({
          id: authUser.id,
          name: typeof metadata.name === 'string' && metadata.name.trim()
            ? metadata.name.trim()
            : authUser.email?.split('@')[0] ?? 'Student',
          email: authUser.email ?? '',
          student_id: typeof metadata.student_id === 'string' ? metadata.student_id || null : null,
          university_name: typeof metadata.university_name === 'string' ? metadata.university_name || null : null,
          major: typeof metadata.major === 'string' ? metadata.major || null : null,
          year_of_study: Number.isFinite(Number(metadata.year_of_study)) ? Number(metadata.year_of_study) : null,
          semester: typeof metadata.semester === 'string' ? metadata.semester || null : null,
          goals: Array.isArray(metadata.goals) ? metadata.goals : [],
        })
        .select('*')
        .single()

      if (!createError && created) setProfile(created as StudentProfile)
      else setProfile(null)
    } else {
      setProfile(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          void loadProfile(session.user)
        } else {
          setLoading(false)
        }
      })
      .catch(() => {
        // Supabase unreachable — clear loading so UI doesn't hang on a spinner
        setLoading(false)
      })

    let subscription: { unsubscribe: () => void } | null = null
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          void loadProfile(session.user)
        } else {
          setProfile(null)
          setLoading(false)
        }
      })
      subscription = data.subscription
    } catch {
      // Supabase unreachable — skip listener
    }

    return () => subscription?.unsubscribe()
  }, [loadProfile])

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (user) await loadProfile(user)
  }

  async function updateProfile(patch: Partial<Omit<StudentProfile, 'id' | 'email' | 'is_admin'>>) {
    if (!user) throw new Error('Sign in to save profile changes')
    const { data, error } = await supabase
      .from('student_profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    setProfile(data as StudentProfile)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
