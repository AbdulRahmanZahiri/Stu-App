'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ChevronRight, ChevronLeft, Check, GraduationCap, BookOpen, Target, User, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const steps = [
  { id: 1, title: 'Account', icon: User, description: 'Create your login credentials' },
  { id: 2, title: 'University', icon: GraduationCap, description: 'Where do you study?' },
  { id: 3, title: 'Academic Info', icon: BookOpen, description: 'Your program & year' },
  { id: 4, title: 'Your Goals', icon: Target, description: 'What do you want to achieve?' },
]

const universities = [
  'Memorial University of Newfoundland',
  'University of Toronto',
  'McGill University',
  'University of British Columbia',
  'University of Alberta',
  'Queens University',
  'Dalhousie University',
  'University of Waterloo',
  'Other',
]

const majors = [
  'Computer Science', 'Software Engineering', 'Electrical Engineering',
  'Mechanical Engineering', 'Business Administration', 'Economics',
  'Mathematics', 'Physics', 'Biology', 'Chemistry',
  'Psychology', 'English Literature', 'Political Science', 'Other',
]

const goals = [
  { id: 'gpa', label: 'Maintain High GPA', icon: '🎯' },
  { id: 'internship', label: 'Land an Internship', icon: '💼' },
  { id: 'organized', label: 'Stay Organized', icon: '📋' },
  { id: 'study', label: 'Study More Effectively', icon: '📚' },
  { id: 'graduate', label: 'Graduate On Time', icon: '🎓' },
  { id: 'network', label: 'Build a Network', icon: '🤝' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    university: '',
    major: '',
    year: '',
    semester: '',
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

    // Create Supabase auth account
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

    // Create student profile
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/20 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">
            Scholar<span className="text-violet-600">Flow</span>
          </span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Step {step} of {steps.length}</p>
            <p className="text-sm text-slate-400">{Math.round(progress)}% complete</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            {steps.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-200',
                  s.id < step ? 'border-violet-500 bg-violet-500 text-white'
                    : s.id === step ? 'border-violet-500 bg-white text-violet-600'
                    : 'border-slate-200 bg-white text-slate-300'
                )}>
                  {s.id < step ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                <span className={cn('text-[10px] font-medium hidden sm:block', s.id === step ? 'text-violet-600' : 'text-slate-400')}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                  {(() => { const Icon = steps[step - 1].icon; return <Icon className="h-5 w-5 text-violet-600" /> })()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{steps[step - 1].title}</h2>
                  <p className="text-sm text-slate-500">{steps[step - 1].description}</p>
                </div>
              </div>

              {error && step === 4 && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Step 1: Account credentials */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="Alex Chen"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Student Email</Label>
                    <Input
                      type="email"
                      placeholder="alex@university.ca"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                        className="h-10 rounded-xl pr-10"
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
                  <div className="space-y-1.5">
                    <Label>Student ID <span className="text-slate-400">(optional)</span></Label>
                    <Input
                      placeholder="202312345"
                      value={form.studentId}
                      onChange={(e) => update('studentId', e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: University */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>University / College</Label>
                    <Select onValueChange={(v) => update('university', v)}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="Select your university" />
                      </SelectTrigger>
                      <SelectContent>
                        {universities.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Or type your university name</Label>
                    <Input
                      placeholder="e.g., Memorial University of Newfoundland"
                      value={form.university}
                      onChange={(e) => update('university', e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Academic */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Major / Program</Label>
                    <Select onValueChange={(v) => update('major', v)}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="Select your major" />
                      </SelectTrigger>
                      <SelectContent>
                        {majors.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Year of Study</Label>
                      <Select onValueChange={(v) => update('year', v)}>
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {['1', '2', '3', '4', '5'].map((y) => (
                            <SelectItem key={y} value={y}>Year {y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Current Semester</Label>
                      <Select onValueChange={(v) => update('semester', v)}>
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue placeholder="Semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {['Fall 2025', 'Winter 2026', 'Summer 2026', 'Fall 2026'].map((s) => (
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
                  <p className="mb-4 text-sm text-slate-500">
                    Select your academic goals. We&apos;ll personalize your experience.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {goals.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => toggleGoal(g.id)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-medium transition-all duration-150',
                          form.goals.includes(g.id)
                            ? 'border-violet-300 bg-violet-50 text-violet-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/50'
                        )}
                      >
                        <span className="text-xl">{g.icon}</span>
                        <span className="leading-tight">{g.label}</span>
                        {form.goals.includes(g.id) && (
                          <Check className="ml-auto h-4 w-4 shrink-0 text-violet-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between border-t border-slate-100 px-8 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStep((s) => Math.max(1, s - 1)); setError(null) }}
              disabled={step === 1}
              className="gap-1.5 text-slate-500"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {step < steps.length ? (
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                className="gap-1.5"
                disabled={!canContinue()}
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="gradient"
                size="sm"
                onClick={handleFinish}
                disabled={loading}
                className="gap-1.5"
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
              </Button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-violet-600 hover:text-violet-700">Sign in</a>
        </p>
      </div>
    </div>
  )
}
