'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Eye, EyeOff, ArrowRight, AlertCircle, Sparkles,
  BookOpen, BarChart3, Users, GraduationCap, Zap,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

const features = [
  { icon: BookOpen,   label: 'AI Syllabus Parser',       color: 'from-violet-400 to-purple-400' },
  { icon: BarChart3,  label: 'Smart Grade Tracking',     color: 'from-indigo-400 to-blue-400'   },
  { icon: Sparkles,   label: 'AI Study Assistant',       color: 'from-purple-400 to-pink-400'   },
  { icon: Users,      label: 'Student Community',        color: 'from-blue-400 to-cyan-400'     },
]

const stats = [
  { value: '10K+', label: 'Students' },
  { value: '50+',  label: 'Universities' },
  { value: '98%',  label: 'Satisfaction' },
]

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.email) void supabase.auth.signOut()
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
        setError('Incorrect email or password. Please try again.')
      } else if (authError.message.includes('Email not confirmed')) {
        setError('Email not confirmed. Disable "Confirm email" in your Supabase Auth settings.')
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
    <div className="flex min-h-screen bg-slate-950">
      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div className="relative hidden w-[52%] overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Layered gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-violet-950/80 to-indigo-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.2),transparent_60%)]" />

        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Floating orbs */}
        <motion.div
          animate={{ y: [0, -18, 0], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-[10%] top-[20%] h-64 w-64 rounded-full bg-violet-600/20 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[20%] right-[5%] h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 12, 0], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute bottom-[40%] left-[30%] h-48 w-48 rounded-full bg-purple-500/15 blur-2xl"
        />

        {/* Content */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/30">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Scholar<span className="text-violet-400">Flow</span>
          </span>
        </div>

        <div className="relative z-10 space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white">
              Your academic life,{' '}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                reimagined.
              </span>
            </h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-white/50">
              The all-in-one AI-powered student portal trusted by thousands of university students.
            </p>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="grid grid-cols-2 gap-3"
          >
            {features.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3 backdrop-blur-sm"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${color} shadow-sm`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium text-white/75">{label}</span>
              </div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex items-center gap-8"
          >
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-xs text-white/40">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <GraduationCap className="h-4 w-4 text-white/20" />
          <p className="text-xs text-white/20">ScholarFlow — Built for students, by students</p>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-white">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900">
              Scholar<span className="text-violet-600">Flow</span>
            </span>
          </div>
          <Link href="/onboarding" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
            Create account →
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[400px]"
          >
            {/* Heading */}
            <div className="mb-8">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Sign in to your ScholarFlow account
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-sm text-rose-700">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email Address
                </Label>
                <div className={`relative transition-all duration-200 ${focused === 'email' ? 'ring-2 ring-violet-500/20 rounded-xl' : ''}`}>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@university.ca"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:border-violet-400"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </Label>
                <div className={`relative transition-all duration-200 ${focused === 'password' ? 'ring-2 ring-violet-500/20 rounded-xl' : ''}`}>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:border-violet-400"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !form.email || !form.password}
                  className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In to ScholarFlow
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                  {/* Shimmer */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/10 transition-transform duration-700 hover:translate-x-full" />
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-xs text-slate-400">New to ScholarFlow?</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            {/* Sign up link */}
            <Link href="/onboarding">
              <button className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700">
                Create a free account
              </button>
            </Link>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
              By signing in, you agree to ScholarFlow&apos;s{' '}
              <a href="#" className="underline underline-offset-2 hover:text-violet-600">Terms</a>
              {' '}and{' '}
              <a href="#" className="underline underline-offset-2 hover:text-violet-600">Privacy Policy</a>.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
