'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export type StudentProfile = {
  id: string
  name: string
  email: string
  major?: string | null
  year_of_study?: number | null
  university_name?: string | null
  gpa?: number | null
  is_admin?: boolean | null
}

type AuthContextType = {
  user: User | null
  profile: StudentProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('student_profiles')
      .select('id, name, email, major, year_of_study, university_name, gpa, is_admin')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          void loadProfile(session.user.id)
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
          void loadProfile(session.user.id)
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

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
