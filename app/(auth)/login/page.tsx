'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Zap, Eye, EyeOff, ArrowRight, GraduationCap, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '' })

  // Clear any leftover anonymous session so the login form always starts fresh
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.email) {
        void supabase.auth.signOut()
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('No account found with that email and password. Please check your credentials or create an account.')
      } else if (authError.message.includes('Email not confirmed')) {
        setError('Your email is not confirmed yet. Go to Supabase Dashboard → Authentication → Users → click your user → "Send confirmation email", or enable Auto Confirm.')
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Zap className="h-5 w-5 text-violet-400" />
          </div>
          <span className="text-xl font-bold text-white">
            Scholar<span className="text-violet-400">Flow</span>
          </span>
        </div>

        <div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
              <GraduationCap className="h-8 w-8 text-violet-300" />
            </div>
            <h2 className="mb-4 text-4xl font-extrabold leading-tight text-white">
              Your academic life,{' '}
              <span className="text-violet-400">in one place.</span>
            </h2>
            <p className="text-lg leading-relaxed text-white/50">
              Manage courses, track grades, study with AI, and connect with
              classmates — all through one beautifully designed portal.
            </p>
          </motion.div>

          <div className="mt-8 space-y-3">
            {[
              'AI-powered syllabus parsing',
              'Smart grade tracking & projections',
              'Study notes library & community',
              'Personalized academic planning',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                <span className="text-sm text-white/60">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/20">ScholarFlow · Winter 2026 Beta</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">
              Scholar<span className="text-violet-600">Flow</span>
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Sign in to your student account to continue
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700">Student Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.name@university.ca"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="h-10 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-violet-500/30"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50 pr-10 focus-visible:ring-violet-500/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full rounded-xl mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link href="/onboarding" className="font-semibold text-violet-600 hover:text-violet-700">
                Create one free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
