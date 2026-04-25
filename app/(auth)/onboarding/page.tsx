'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronLeft, Check, GraduationCap,
  BookOpen, Target, User, AlertCircle, Eye, EyeOff, Zap,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const steps = [
  { id: 1, title: 'Account',       icon: User,          description: 'Create your credentials'  },
  { id: 2, title: 'University',    icon: GraduationCap, description: 'Where do you study?'       },
  { id: 3, title: 'Academic Info', icon: BookOpen,      description: 'Program & year'            },
  { id: 4, title: 'Your Goals',    icon: Target,        description: 'What matters to you?'      },
]

const universities = [
  'Memorial University of Newfoundland', 'University of Toronto',
  'McGill University', 'University of British Columbia',
  'University of Alberta', 'Queens University',
  'Dalhousie University', 'University of Waterloo', 'Other',
]

const majors = [
  'Computer Science', 'Software Engineering', 'Electrical Engineering',
  'Mechanical Engineering', 'Business Administration', 'Economics',
  'Mathematics', 'Physics', 'Biology', 'Chemistry',
  'Psychology', 'English Literature', 'Political Science', 'Other',
]

const goals = [
  { id: 'gpa',        label: 'Maintain High GPA',       icon: '🎯' },
  { id: 'internship', label: 'Land an Internship',       icon: '💼' },
  { id: 'organized',  label: 'Stay Organized',           icon: '📋' },
  { id: 'study',      label: 'Study More Effectively',   icon: '📚' },
  { id: 'graduate',   label: 'Graduate On Time',         icon: '🎓' },
  { id: 'network',    label: 'Build a Network',          icon: '🤝' },
]

const stepColors = [
  'from-violet-500 to-indigo-500',
  'from-indigo-500 to-blue-500',
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-violet-500',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', studentId: '',
    university: '', major: '', year: '', semester: '',
    goals: [] as string[],
  })

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleGoal(id: string) {
    setForm((f) => ({
      ...f,
      goals: f.goals.includes(id) ? f.goals.filter((g) => g !== id) : [...f.goals, id],
    }))
  }

  function canContinue() {
    if (step === 1) return form.name.trim() && form.email.trim() && form.password.length >= 6
    if (step === 2) return !!form.university
    return true
  }

  async function handleFinish() {
    setLoading(true)
    setError(null)

    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name } },
    })

    if (signUpError || !user) {
      setError(signUpError?.message ?? 'Failed to create account. Please try again.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('student_profiles').insert({
      id: user.id,
      name: form.name.trim(),
      email: form.email.trim(),
      student_id: form.studentId.trim() || null,
      university_name: form.university || null,
      major: form.major || null,
      year_of_study: form.year ? parseInt(form.year) : null,
      semester: form.semester || null,
      goals: form.goals,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const progress = (step / steps.length) * 100
  const currentColor = stepColors[step - 1]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/60 to-indigo-950 flex items-center justify-center p-4">
      {/* Background orbs */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none fixed left-[5%] top-[10%] h-96 w-96 rounded-full bg-violet-600/20 blur-3xl"
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="pointer-events-none fixed bottom-[10%] right-[5%] h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-center gap-2.5"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${currentColor} shadow-lg`}>
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Scholar<span className="text-violet-400">Flow</span>
          </span>
        </motion.div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-white/60">Step {step} of {steps.length}</p>
            <p className="text-sm font-semibold text-white/80">{Math.round(progress)}%</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${currentColor}`}
            />
          </div>

          {/* Step dots */}
          <div className="mt-4 flex items-center justify-between">
            {steps.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300',
                  s.id < step
                    ? `border-transparent bg-gradient-to-br ${stepColors[s.id - 1]} text-white shadow-lg`
                    : s.id === step
                    ? `border-transparent bg-gradient-to-br ${currentColor} text-white ring-4 ring-violet-500/20`
                    : 'border-white/20 bg-white/5 text-white/30'
                )}>
                  {s.id < step ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                <span className={cn(
                  'hidden text-[10px] font-medium sm:block transition-colors',
                  s.id === step ? 'text-white' : s.id < step ? 'text-violet-400' : 'text-white/30'
                )}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-black/40">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="p-8"
            >
              {/* Step header */}
              <div className="mb-6 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${currentColor} shadow-lg`}>
                  {(() => { const Icon = steps[step - 1].icon; return <Icon className="h-5 w-5 text-white" /> })()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{steps[step - 1].title}</h2>
                  <p className="text-sm text-white/50">{steps[step - 1].description}</p>
                </div>
              </div>

              {error && step === 4 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <p className="text-sm text-rose-300">{error}</p>
                </motion.div>
              )}

              {/* Step 1: Account */}
              {step === 1 && (
                <div className="space-y-4">
                  {[
                    { key: 'name',      label: 'Full Name',     type: 'text',     placeholder: 'Alex Chen'         },
                    { key: 'email',     label: 'Student Email', type: 'email',    placeholder: 'alex@university.ca' },
                  ].map(({ key, label, type, placeholder }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">{label}</Label>
                      <Input
                        type={type}
                        placeholder={placeholder}
                        value={form[key as keyof typeof form] as string}
                        onChange={(e) => update(key, e.target.value)}
                        className="h-11 rounded-xl border-white/10 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-violet-400 focus-visible:ring-1 focus-visible:ring-violet-400/30"
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                        className="h-11 rounded-xl border-white/10 bg-white/8 pr-11 text-white placeholder:text-white/25 focus-visible:border-violet-400 focus-visible:ring-1 focus-visible:ring-violet-400/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {form.password.length > 0 && form.password.length < 6 && (
                      <p className="text-xs text-amber-400">Password must be at least 6 characters</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      Student ID <span className="text-white/25 normal-case font-normal">(optional)</span>
                    </Label>
                    <Input
                      placeholder="202312345"
                      value={form.studentId}
                      onChange={(e) => update('studentId', e.target.value)}
                      className="h-11 rounded-xl border-white/10 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-violet-400 focus-visible:ring-1 focus-visible:ring-violet-400/30"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: University */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">University / College</Label>
                    <Select onValueChange={(v) => update('university', v)}>
                      <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/8 text-white focus:ring-violet-400/30">
                        <SelectValue placeholder="Select your university" />
                      </SelectTrigger>
                      <SelectContent>
                        {universities.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">Or type your university</Label>
                    <Input
                      placeholder="e.g., Memorial University"
                      value={form.university}
                      onChange={(e) => update('university', e.target.value)}
                      className="h-11 rounded-xl border-white/10 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-violet-400 focus-visible:ring-1 focus-visible:ring-violet-400/30"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Academic */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">Major / Program</Label>
                    <Select onValueChange={(v) => update('major', v)}>
                      <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/8 text-white focus:ring-violet-400/30">
                        <SelectValue placeholder="Select your major" />
                      </SelectTrigger>
                      <SelectContent>
                        {majors.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">Year</Label>
                      <Select onValueChange={(v) => update('year', v)}>
                        <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/8 text-white focus:ring-violet-400/30">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {['1','2','3','4','5'].map((y) => <SelectItem key={y} value={y}>Year {y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">Semester</Label>
                      <Select onValueChange={(v) => update('semester', v)}>
                        <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/8 text-white focus:ring-violet-400/30">
                          <SelectValue placeholder="Term" />
                        </SelectTrigger>
                        <SelectContent>
                          {['Fall 2025','Winter 2026','Summer 2026','Fall 2026'].map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Goals */}
              {step === 4 && (
                <div>
                  <p className="mb-4 text-sm text-white/50">
                    Pick your academic goals — we&apos;ll personalize your dashboard.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {goals.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => toggleGoal(g.id)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-medium transition-all duration-150',
                          form.goals.includes(g.id)
                            ? 'border-violet-400/50 bg-violet-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-white/60 hover:border-violet-400/30 hover:bg-white/8'
                        )}
                      >
                        <span className="text-lg">{g.icon}</span>
                        <span className="text-xs leading-tight">{g.label}</span>
                        {form.goals.includes(g.id) && (
                          <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-violet-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer nav */}
          <div className="flex items-center justify-between border-t border-white/8 px-8 py-4">
            <button
              onClick={() => { setStep((s) => Math.max(1, s - 1)); setError(null) }}
              disabled={step === 1}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white/70 disabled:opacity-0"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            {step < steps.length ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canContinue()}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200',
                  canContinue()
                    ? `bg-gradient-to-r ${currentColor} shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02]`
                    : 'bg-white/10 cursor-not-allowed opacity-50'
                )}
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={loading}
                className={`flex items-center gap-2 rounded-xl bg-gradient-to-r ${currentColor} px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-violet-500/40 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Launch ScholarFlow
                    <Zap className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-violet-400 hover:text-violet-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
