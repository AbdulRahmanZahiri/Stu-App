'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Info, Search, ChevronRight, Plus, Trash2,
  CheckCircle2, AlertTriangle, Circle, Clock, BookOpen, X,
  Users, CalendarDays, BarChart3, ArrowLeft, Sparkles, Check,
  AlertCircle, Copy, RotateCcw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { usePlanner } from '@/lib/planner-store'
import { MUN_COURSES, MUN_PROGRAMS, FACULTIES, UNIVERSITIES, SUGGESTED_PLANS, describePrereqs, getCourse, getProgram, getFaculty } from '@/lib/planner-data'
import type { MUNCourse, Term, CompletedEntry } from '@/lib/planner-types'
import { toast } from 'sonner'

// ── Colour palettes ───────────────────────────────────────────────────────────

const DEPT_CHIP: Record<string, string> = {
  COMP:'bg-violet-100 text-violet-800 border-violet-200',
  MATH:'bg-blue-100 text-blue-800 border-blue-200',
  STAT:'bg-emerald-100 text-emerald-800 border-emerald-200',
  BIOL:'bg-green-100 text-green-800 border-green-200',
  CHEM:'bg-amber-100 text-amber-800 border-amber-200',
  PHYS:'bg-orange-100 text-orange-800 border-orange-200',
  ENGL:'bg-pink-100 text-pink-800 border-pink-200',
  ENGI:'bg-blue-100 text-blue-900 border-blue-300',
  BUSI:'bg-teal-100 text-teal-800 border-teal-200',
  PSYC:'bg-rose-100 text-rose-800 border-rose-200',
  POLS:'bg-indigo-100 text-indigo-800 border-indigo-200',
  HIST:'bg-yellow-100 text-yellow-800 border-yellow-200',
  PHIL:'bg-purple-100 text-purple-800 border-purple-200',
  SOCI:'bg-cyan-100 text-cyan-800 border-cyan-200',
  EARTH:'bg-lime-100 text-lime-800 border-lime-200',
  GEOG:'bg-green-100 text-green-900 border-green-300',
  ANTH:'bg-orange-100 text-orange-900 border-orange-300',
  FREN:'bg-blue-50 text-blue-800 border-blue-200',
  SPAN:'bg-red-100 text-red-800 border-red-200',
  GERM:'bg-gray-100 text-gray-800 border-gray-300',
  LING:'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  MUSC:'bg-purple-50 text-purple-700 border-purple-200',
  FINE:'bg-pink-50 text-pink-700 border-pink-200',
  RELI:'bg-amber-50 text-amber-700 border-amber-200',
  FOLK:'bg-teal-50 text-teal-700 border-teal-200',
  WGST:'bg-rose-50 text-rose-700 border-rose-200',
  SWRK:'bg-emerald-50 text-emerald-700 border-emerald-200',
  OCEA:'bg-sky-100 text-sky-800 border-sky-200',
  BIOC:'bg-green-50 text-green-700 border-green-200',
  ECON:'bg-slate-100 text-slate-700 border-slate-300',
}

const DEPT_DOT: Record<string, string> = {
  COMP:'bg-violet-500', MATH:'bg-blue-500', STAT:'bg-emerald-500', BIOL:'bg-green-500',
  CHEM:'bg-amber-500', PHYS:'bg-orange-500', ENGL:'bg-pink-500', ENGI:'bg-blue-700',
  BUSI:'bg-teal-500', PSYC:'bg-rose-500', POLS:'bg-indigo-500', HIST:'bg-yellow-500',
  PHIL:'bg-purple-500', SOCI:'bg-cyan-500', EARTH:'bg-lime-500', GEOG:'bg-green-700',
  ANTH:'bg-orange-600', FREN:'bg-blue-400', SPAN:'bg-red-500', GERM:'bg-gray-500',
  LING:'bg-fuchsia-500', MUSC:'bg-purple-400', FINE:'bg-pink-400', RELI:'bg-amber-400',
  FOLK:'bg-teal-400', WGST:'bg-rose-400', SWRK:'bg-emerald-400', OCEA:'bg-sky-500',
  BIOC:'bg-green-400', ECON:'bg-slate-500',
}

function dc(dept: string) { return DEPT_CHIP[dept] ?? 'bg-slate-100 text-slate-700 border-slate-200' }
function dd(dept: string) { return DEPT_DOT[dept] ?? 'bg-slate-400' }

// ══ WIZARD ════════════════════════════════════════════════════════════════════

const YEAR_OPTIONS = [
  { value: 1, label: 'First Year', subtitle: 'Also called "General" or Foundation Year', description: 'You haven\'t picked a major yet — that\'s totally normal. First-year courses let you explore different subjects before declaring.' },
  { value: 2, label: 'Second Year', subtitle: 'Entering your declared major', description: 'You\'re starting or continuing a specific program. Your plan will include major-specific courses.' },
  { value: 3, label: 'Third Year', subtitle: 'Upper-year studies', description: 'Junior-level courses and electives tailored to your program.' },
  { value: 4, label: 'Fourth Year', subtitle: 'Final year', description: 'Senior courses, capstone projects, and graduation requirements.' },
]

function PlannerWizard() {
  const { completeWizard } = usePlanner()
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null)
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null)
  const [yearOfStudy, setYearOfStudy] = useState<number | null>(null)
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null)
  const [startYear, setStartYear] = useState(new Date().getFullYear())
  const [startTerm, setStartTerm] = useState<Term>('Fall')

  // Step 6: prior course state — plan-based checkboxes + per-term custom entries
  // checkedCourses: courseCode -> termSlotId (e.g. "Fall-2024")
  const [checkedCourses, setCheckedCourses] = useState<Map<string, string>>(new Map())
  // extraPerTerm: termSlotId -> array of custom course codes
  const [extraPerTerm, setExtraPerTerm] = useState<Map<string, string[]>>(new Map())
  // per-term typing input state
  const [termInputs, setTermInputs] = useState<Map<string, string>>(new Map())

  const faculty = selectedFaculty ? getFaculty(selectedFaculty) : null
  const program = selectedProgram ? getProgram(selectedProgram) : null

  const programsForStep = selectedFaculty
    ? MUN_PROGRAMS.filter((p) => {
        if (p.facultyId !== selectedFaculty) return false
        const isGeneral = p.id.endsWith('-general')
        if (yearOfStudy === 1) return isGeneral
        return !isGeneral
      })
    : []

  // Organize suggested plan by relativeYear → term → codes (for Step 6)
  const planByYearTerm = (() => {
    const plan = SUGGESTED_PLANS[selectedProgram ?? ''] ?? []
    const acc: Record<number, Partial<Record<Term, string[]>>> = {}
    for (const entry of plan) {
      if (!acc[entry.relativeYear]) acc[entry.relativeYear] = {}
      if (!acc[entry.relativeYear][entry.term]) acc[entry.relativeYear][entry.term] = []
      acc[entry.relativeYear][entry.term]!.push(entry.courseCode)
    }
    return acc
  })()

  // Only show years already completed (relativeYear < yearOfStudy)
  const priorPlanYears = Object.entries(planByYearTerm)
    .map(([ry, terms]) => ({ ry: parseInt(ry), terms }))
    .filter(({ ry }) => ry < (yearOfStudy ?? 1))
    .sort((a, b) => a.ry - b.ry)

  const toggleChecked = (code: string, termId: string) => {
    setCheckedCourses((prev) => {
      const next = new Map(prev)
      if (next.has(code)) next.delete(code)
      else next.set(code, termId)
      return next
    })
  }

  const addExtra = (termId: string) => {
    const val = (termInputs.get(termId) ?? '').trim().toUpperCase()
    if (!val) return
    setExtraPerTerm((prev) => {
      const next = new Map(prev)
      const existing = next.get(termId) ?? []
      if (!existing.includes(val)) next.set(termId, [...existing, val])
      return next
    })
    setTermInputs((prev) => { const n = new Map(prev); n.delete(termId); return n })
  }

  const removeExtra = (termId: string, code: string) => {
    setExtraPerTerm((prev) => {
      const next = new Map(prev)
      next.set(termId, (next.get(termId) ?? []).filter((c) => c !== code))
      return next
    })
  }

  const finish = () => {
    if (!selectedProgram) return
    const priorEntries: CompletedEntry[] = [
      ...[...checkedCourses.entries()].map(([code, termId]) => ({
        courseCode: code,
        grade: 80,
        letterGrade: 'A-',
        term: termId.replace('-', ' '),
        isTransfer: false,
      })),
      ...[...extraPerTerm.entries()].flatMap(([termId, codes]) =>
        codes.map((code) => ({
          courseCode: code,
          grade: 80,
          letterGrade: 'A-',
          term: termId.replace('-', ' '),
          isTransfer: true,
        }))
      ),
    ]
    completeWizard(selectedProgram, startYear, priorEntries)
    toast.success('Your plan has been generated! Customize it from the Semester Board.')
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i)

  const STEP_LABELS = ['University', 'Faculty', 'Year of Study', 'Program', 'Start Date', 'Prior Courses']
  const TOTAL_STEPS = 6

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-green-50/30 p-6">
      <div className="w-full max-w-3xl">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Step {step} of {TOTAL_STEPS}</span>
            <span className="text-xs text-slate-400">{STEP_LABELS[step - 1]}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
          {/* Step indicators */}
          <div className="mt-3 flex gap-1.5">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className={cn('h-1 w-full rounded-full transition-all', i + 1 <= step ? 'bg-emerald-500' : 'bg-slate-200')} />
                <span className="hidden sm:block text-[9px] text-slate-400 truncate w-full text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: University ─────────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}>
              <div className="mb-8 text-center">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg">
                  <GraduationCap className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to the Degree Planner</h1>
                <p className="text-sm text-slate-500 max-w-lg mx-auto">
                  Map out your entire degree — from day one to graduation. First, select your <strong>university</strong>.
                </p>
              </div>

              <div className="space-y-3">
                {UNIVERSITIES.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { if (u.available) setSelectedUniversity(u.id) }}
                    disabled={!u.available}
                    className={cn(
                      'w-full rounded-2xl border-2 p-4 text-left transition-all',
                      u.available ? 'hover:shadow-md cursor-pointer' : 'opacity-50 cursor-not-allowed',
                      selectedUniversity === u.id ? 'border-emerald-400 bg-emerald-50 shadow-md' : 'border-slate-200 bg-white hover:border-emerald-200',
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{u.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className={cn('text-sm font-bold', selectedUniversity === u.id ? 'text-emerald-800' : 'text-slate-800')}>{u.name}</p>
                          {!u.available && (
                            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 font-medium">Coming soon</span>
                          )}
                          {u.available && (
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-700 font-medium">Available now</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{u.city} · {u.studentCount}</p>
                        {u.tagline && <p className="mt-1 text-xs text-slate-400 leading-relaxed">{u.tagline}</p>}
                      </div>
                      {selectedUniversity === u.id && <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!selectedUniversity} variant="gradient" size="sm" className="gap-2 px-6">
                  Next: Choose Faculty <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Faculty ────────────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}>
              <div className="mb-6">
                <button onClick={() => setStep(1)} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to University
                </button>
                <h2 className="text-xl font-bold text-slate-900">Which faculty are you in?</h2>
                <p className="mt-1 text-sm text-slate-500">At MUN, your faculty determines your overall degree requirements. You can switch programs within the same faculty without extra requirements.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {FACULTIES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFaculty(f.id); setSelectedProgram(null) }}
                    className={cn(
                      'group rounded-2xl border-2 p-5 text-left transition-all hover:shadow-md',
                      selectedFaculty === f.id ? 'border-emerald-400 bg-emerald-50 shadow-md' : 'border-slate-200 bg-white hover:border-emerald-200',
                    )}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="text-2xl">{f.emoji}</span>
                      <div>
                        <p className={cn('text-sm font-bold', selectedFaculty === f.id ? 'text-emerald-800' : 'text-slate-800')}>{f.shortName}</p>
                        <p className="text-[10px] text-slate-400">{f.programs.length} programs</p>
                      </div>
                      {selectedFaculty === f.id && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" />}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{f.description}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-between">
                <Button onClick={() => setStep(1)} variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!selectedFaculty} variant="gradient" size="sm" className="gap-2 px-6">
                  Next: Year of Study <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Year of Study ──────────────────────────────────── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}>
              <div className="mb-6">
                <button onClick={() => setStep(2)} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <h2 className="text-xl font-bold text-slate-900">What year of university are you in?</h2>
                <p className="mt-1 text-sm text-slate-500">This helps us show the right courses. First year is often called <strong>&quot;General&quot;</strong> because most students haven&apos;t declared a specific major yet.</p>
              </div>

              <div className="space-y-3">
                {YEAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setYearOfStudy(opt.value); setSelectedProgram(null) }}
                    className={cn(
                      'w-full rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md',
                      yearOfStudy === opt.value ? 'border-emerald-400 bg-emerald-50 shadow-md' : 'border-slate-200 bg-white hover:border-emerald-200',
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all',
                        yearOfStudy === opt.value ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600',
                      )}>
                        {opt.value}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={cn('text-sm font-bold', yearOfStudy === opt.value ? 'text-emerald-800' : 'text-slate-800')}>{opt.label}</p>
                          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full',
                            yearOfStudy === opt.value ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          )}>{opt.subtitle}</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{opt.description}</p>
                      </div>
                      {yearOfStudy === opt.value && <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-1" />}
                    </div>
                  </button>
                ))}
              </div>

              {yearOfStudy === 1 && (
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2">
                  <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>First year tip:</strong> At MUN, most students in Science, Engineering, Arts, and Business share common first-year courses. You declare your specific major in second year — so relax and explore!
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <Button onClick={() => setStep(2)} variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <Button onClick={() => setStep(4)} disabled={yearOfStudy === null} variant="gradient" size="sm" className="gap-2 px-6">
                  Next: Choose Program <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Program ────────────────────────────────────────── */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}>
              <div className="mb-6">
                <button onClick={() => setStep(3)} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <h2 className="text-xl font-bold text-slate-900">{faculty?.emoji} {faculty?.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {yearOfStudy === 1
                    ? 'Since you\'re in first year, we\'ve pre-selected the General foundation program for your faculty. You can switch to a specific major any time in second year.'
                    : 'Choose your declared program or major below.'}
                </p>
              </div>

              <div className="space-y-3">
                {programsForStep.map((prog) => (
                  <button
                    key={prog.id}
                    onClick={() => setSelectedProgram(prog.id)}
                    className={cn(
                      'w-full rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md',
                      selectedProgram === prog.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn('text-sm font-bold', selectedProgram === prog.id ? 'text-emerald-800' : 'text-slate-800')}>{prog.name}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{prog.degreeType}</span>
                          <span className="text-[10px] text-slate-400">{prog.totalCreditHoursRequired} cr · {prog.typicalYears} yrs</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-2">{prog.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {prog.highlights.map((h) => (
                            <span key={h} className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">{h}</span>
                          ))}
                        </div>
                      </div>
                      {selectedProgram === prog.id && <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-1" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-between">
                <Button onClick={() => setStep(3)} variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <Button onClick={() => setStep(5)} disabled={!selectedProgram} variant="gradient" size="sm" className="gap-2 px-6">
                  Next: Start Date <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 5: Start year ─────────────────────────────────────── */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}>
              <div className="mb-6">
                <button onClick={() => setStep(4)} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <h2 className="text-xl font-bold text-slate-900">When did/will you start university?</h2>
                <p className="mt-1 text-sm text-slate-500">We&apos;ll build a semester-by-semester plan from your start date.</p>
              </div>

              <Card className="mb-4">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Starting Term</label>
                    <div className="flex gap-2">
                      {(['Fall', 'Winter'] as Term[]).map((t) => (
                        <button key={t}
                          onClick={() => setStartTerm(t)}
                          className={cn('flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-all',
                            startTerm === t ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                          )}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Starting Year</label>
                    <div className="grid grid-cols-4 gap-2">
                      {years.map((y) => (
                        <button key={y}
                          onClick={() => setStartYear(y)}
                          className={cn('rounded-xl border-2 py-2 text-sm font-medium transition-all',
                            startYear === y ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                          )}>{y}</button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                    <p className="text-xs text-emerald-700">
                      <strong>Your plan:</strong> {program?.name} · Starting {startTerm} {startYear} · Graduating ~{startTerm} {startYear + (program?.typicalYears ?? 4)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button onClick={() => setStep(4)} variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <Button onClick={() => setStep(6)} variant="gradient" size="sm" className="gap-2 px-6">
                  Next: Prior Courses <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 6: Prior courses ──────────────────────────────────── */}
          {step === 6 && (
            <motion.div key="step6" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}>
              <div className="mb-6">
                <button onClick={() => setStep(5)} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <h2 className="text-xl font-bold text-slate-900">Which courses have you already completed?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {yearOfStudy === 1
                    ? 'You\'re just starting — no courses to mark yet. You can still add transfer credits below if applicable.'
                    : `Check off everything you've finished before ${startTerm} ${startYear + (yearOfStudy ?? 1) - 1}. We've pre-organized your expected courses by semester.`}
                </p>
              </div>

              {priorPlanYears.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-6 text-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-800 mb-1">Fresh start!</p>
                  <p className="text-xs text-emerald-600">As a first-year student you haven&apos;t completed any university courses yet. Your semester plan will start clean.</p>
                </div>
              ) : (
                <div className="space-y-5 mb-4 max-h-[50vh] overflow-y-auto pr-1">
                  {priorPlanYears.map(({ ry, terms }) => {
                    const actualYear = startYear + (ry - 1)
                    return (
                      <div key={ry}>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                          Year {ry} — {actualYear}/{actualYear + 1}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(['Fall', 'Winter'] as Term[]).map((term) => {
                            const termId = `${term}-${actualYear}`
                            const planCodes = terms[term] ?? []
                            const extras = extraPerTerm.get(termId) ?? []
                            if (planCodes.length === 0 && extras.length === 0 && !termInputs.get(termId)) {
                              return (
                                <div key={termId} className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                                  <p className="text-[11px] font-semibold text-slate-400 mb-2">{term} {actualYear}</p>
                                  <p className="text-[10px] text-slate-300 italic mb-2">No courses suggested for this term</p>
                                  <div className="flex gap-1.5">
                                    <Input value={termInputs.get(termId) ?? ''}
                                      onChange={(e) => setTermInputs((p) => new Map(p).set(termId, e.target.value))}
                                      onKeyDown={(e) => { if (e.key === 'Enter') addExtra(termId) }}
                                      placeholder="Add course code..." className="h-7 text-[11px] flex-1" />
                                    <Button onClick={() => addExtra(termId)} variant="outline" size="sm" className="h-7 px-2 text-[11px]">+</Button>
                                  </div>
                                </div>
                              )
                            }
                            return (
                              <div key={termId} className="rounded-xl border border-slate-200 bg-white p-3">
                                <p className="text-[11px] font-semibold text-slate-600 mb-2">{term} {actualYear}</p>
                                <div className="space-y-1 mb-2">
                                  {planCodes.map((code) => {
                                    const course = getCourse(code)
                                    const checked = checkedCourses.has(code)
                                    return (
                                      <button key={code} onClick={() => toggleChecked(code, termId)}
                                        className={cn(
                                          'flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-left transition-colors',
                                          checked ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50 border border-transparent',
                                        )}>
                                        <div className={cn('h-4 w-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all',
                                          checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300')}>
                                          {checked && <Check className="h-2.5 w-2.5 text-white" />}
                                        </div>
                                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold flex-shrink-0', dc(course?.department ?? code.split(' ')[0]))}>{code}</span>
                                        <span className="text-[11px] text-slate-600 flex-1 truncate">{course?.title ?? code}</span>
                                        <span className="text-[10px] text-slate-400 flex-shrink-0">{course?.creditHours ?? 3}cr</span>
                                      </button>
                                    )
                                  })}
                                  {extras.map((code) => (
                                    <div key={code} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-blue-50 border border-blue-100">
                                      <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                      <span className="text-[11px] text-blue-800 font-medium flex-1">{code}</span>
                                      <span className="text-[10px] text-blue-500">custom</span>
                                      <button onClick={() => removeExtra(termId, code)} className="text-blue-300 hover:text-rose-500 ml-1">
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                {/* Add unlisted course for this term */}
                                <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                                  <Input value={termInputs.get(termId) ?? ''}
                                    onChange={(e) => setTermInputs((p) => new Map(p).set(termId, e.target.value))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') addExtra(termId) }}
                                    placeholder="Course not listed? Add code…" className="h-7 text-[11px] flex-1" />
                                  <Button onClick={() => addExtra(termId)} variant="outline" size="sm" className="h-7 px-2 text-[11px]">+</Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Transfer / other credits not in plan */}
              <div className="rounded-xl border border-dashed border-slate-200 p-3 mb-4">
                <p className="text-[11px] font-semibold text-slate-500 mb-2">Transfer credits or courses not in your program plan</p>
                <div className="flex gap-2">
                  <Input id="transfer-code" placeholder="Course code (e.g. COMP 1001)" className="h-8 text-xs flex-1" />
                  <select id="transfer-term" className="rounded-lg border border-slate-200 bg-white px-2 text-xs h-8">
                    {Array.from({ length: (yearOfStudy ?? 1) }, (_, i) => startYear + i).flatMap((yr) => [
                      <option key={`Fall-${yr}`} value={`Fall-${yr}`}>Fall {yr}</option>,
                      <option key={`Winter-${yr}`} value={`Winter-${yr}`}>Winter {yr}</option>,
                    ])}
                  </select>
                  <Button onClick={() => {
                    const codeEl = document.getElementById('transfer-code') as HTMLInputElement
                    const termEl = document.getElementById('transfer-term') as HTMLSelectElement
                    const code = codeEl.value.trim().toUpperCase()
                    const termId = termEl.value
                    if (!code || !termId) return
                    setExtraPerTerm((prev) => {
                      const next = new Map(prev)
                      const ex = next.get(termId) ?? []
                      if (!ex.includes(code)) next.set(termId, [...ex, code])
                      return next
                    })
                    codeEl.value = ''
                  }} variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>

              {/* Summary of selected */}
              {(checkedCourses.size > 0 || [...extraPerTerm.values()].some((v) => v.length > 0)) && (
                <div className="mb-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <p className="text-xs text-emerald-800 font-medium">
                    {checkedCourses.size + [...extraPerTerm.values()].reduce((s, v) => s + v.length, 0)} course{(checkedCourses.size + [...extraPerTerm.values()].reduce((s, v) => s + v.length, 0)) !== 1 ? 's' : ''} marked as completed
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button onClick={() => setStep(5)} variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <Button onClick={finish} variant="gradient" size="sm" className="gap-2 px-6">
                  <Sparkles className="h-4 w-4" /> Generate My Plan
                </Button>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400">Skip this step if you haven&apos;t taken anything yet — you can mark courses complete later.</p>
            </motion.div>
          )}

        </AnimatePresence>

        <p className="mt-8 text-center text-[11px] text-slate-400">
          <Info className="inline h-3 w-3 mr-1" />
          Informational only. Verify requirements with a MUN academic advisor.
        </p>
      </div>
    </div>
  )
}

// ══ COURSE CHIP ═══════════════════════════════════════════════════════════════

function CourseChip({ code, onRemove, draggable, isCompleted, hasWarning }: {
  code: string; onRemove?: () => void; draggable?: boolean; isCompleted?: boolean; hasWarning?: boolean
}) {
  const course = getCourse(code)
  const dept = course?.department ?? code.split(' ')[0]
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => e.dataTransfer.setData('courseCode', code) : undefined}
      className={cn(
        'group flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium select-none transition-all',
        isCompleted ? 'bg-emerald-50 text-emerald-800 border-emerald-200 opacity-75' : dc(dept),
        draggable && 'cursor-grab active:cursor-grabbing hover:shadow-sm',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', isCompleted ? 'bg-emerald-500' : dd(dept))} />
      <span className="truncate max-w-[90px]">{code}</span>
      {hasWarning && <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />}
      {onRemove && (
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 hover:text-rose-500 flex-shrink-0">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ══ MAIN PLANNER PAGE ═════════════════════════════════════════════════════════

export default function PlannerPage() {
  const planner = usePlanner()

  if (!planner.wizardDone) return <PlannerWizard />

  const {
    activeScenario, scenarios, activeScenarioId,
    placeCourse, removeCourse, markCompleted, removeCompleted,
    addScenario, duplicateScenario, deleteScenario, switchScenario,
    requirements, prereqWarnings, totalCreditsEarned, totalCreditsPlanned,
    resetWizard,
  } = planner

  return <PlannerMain
    activeScenario={activeScenario} scenarios={scenarios} activeScenarioId={activeScenarioId}
    placeCourse={placeCourse} removeCourse={removeCourse} markCompleted={markCompleted}
    removeCompleted={removeCompleted} addScenario={addScenario} duplicateScenario={duplicateScenario}
    deleteScenario={deleteScenario} switchScenario={switchScenario}
    requirements={requirements} prereqWarnings={prereqWarnings}
    totalCreditsEarned={totalCreditsEarned} totalCreditsPlanned={totalCreditsPlanned}
    resetWizard={resetWizard}
  />
}

// ══ PLANNER MAIN (separated so the file stays readable) ══════════════════════

import type { PlannerScenario, RequirementSatisfaction } from '@/lib/planner-types'
import type { PrereqWarning } from '@/lib/planner-store'
import { evaluateRequirements, checkPrerequisites } from '@/lib/planner-store'

function PlannerMain({
  activeScenario, scenarios, activeScenarioId,
  placeCourse, removeCourse, markCompleted, removeCompleted,
  addScenario, duplicateScenario, deleteScenario, switchScenario,
  requirements, prereqWarnings, totalCreditsEarned, totalCreditsPlanned,
  resetWizard,
}: {
  activeScenario: PlannerScenario
  scenarios: PlannerScenario[]
  activeScenarioId: string
  placeCourse: (code: string, termId: string) => void
  removeCourse: (code: string, termId: string) => void
  markCompleted: (entry: CompletedEntry) => void
  removeCompleted: (code: string) => void
  addScenario: (name: string, fromProgramId?: string, startYear?: number) => void
  duplicateScenario: (id: string, name: string) => void
  deleteScenario: (id: string) => void
  switchScenario: (id: string) => void
  requirements: RequirementSatisfaction[]
  prereqWarnings: PrereqWarning[]
  totalCreditsEarned: number
  totalCreditsPlanned: number
  resetWizard: () => void
}) {
  const [tab, setTab] = useState('board')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogDept, setCatalogDept] = useState('ALL')
  const [catalogLevel, setCatalogLevel] = useState('ALL')
  const [catalogTerm, setCatalogTerm] = useState<Term | 'ALL'>('ALL')
  const [selectedCourse, setSelectedCourse] = useState<MUNCourse | null>(null)
  const [markingComplete, setMarkingComplete] = useState<string | null>(null)
  const [completeGrade, setCompleteGrade] = useState('80')
  const [completeTerm, setCompleteTerm] = useState('Fall 2024')
  const [addingScenario, setAddingScenario] = useState(false)
  const [newScenarioName, setNewScenarioName] = useState('')
  const [inlineAddTerm, setInlineAddTerm] = useState<string | null>(null)
  const [inlineAddInput, setInlineAddInput] = useState('')

  const prog = activeScenario.declaredPrograms[0] ? getProgram(activeScenario.declaredPrograms[0]) : null
  const fac = prog ? getFaculty(prog.facultyId) : null
  const totalCreds = totalCreditsEarned + totalCreditsPlanned
  const graduationTarget = prog?.totalCreditHoursRequired ?? 120
  const progressPct = Math.min(100, Math.round((totalCreds / graduationTarget) * 100))

  // Catalog filter
  const filteredCourses = MUN_COURSES.filter((c) => {
    if (catalogDept !== 'ALL' && c.department !== catalogDept) return false
    if (catalogLevel !== 'ALL' && !String(c.level).startsWith(catalogLevel[0])) return false
    if (catalogTerm !== 'ALL' && !c.typicalAvailability.includes(catalogTerm as Term)) return false
    if (catalogSearch) {
      const q = catalogSearch.toLowerCase()
      return c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    }
    return true
  })

  const allCodesInPlan = new Set([
    ...activeScenario.completed.map((c) => c.courseCode),
    ...activeScenario.termSlots.flatMap((s) => s.courses),
  ])

  const onDropToTerm = useCallback((e: React.DragEvent, termId: string) => {
    e.preventDefault()
    const code = e.dataTransfer.getData('courseCode')
    if (!code) return
    removeCompleted(code)
    placeCourse(code, termId)
    toast.success(`${code} added to ${termId.replace('-', ' ')}`)
  }, [placeCourse, removeCompleted])

  const onDropToCompleted = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const code = e.dataTransfer.getData('courseCode')
    if (!code) return
    setMarkingComplete(code)
  }, [])

  function handleMarkComplete() {
    if (!markingComplete) return
    const g = parseInt(completeGrade)
    const letter = g >= 90 ? 'A+' : g >= 85 ? 'A' : g >= 80 ? 'A-' : g >= 77 ? 'B+' : g >= 73 ? 'B' : g >= 70 ? 'B-' : g >= 67 ? 'C+' : g >= 63 ? 'C' : g >= 60 ? 'C-' : g >= 55 ? 'D' : 'F'
    markCompleted({ courseCode: markingComplete, grade: g, letterGrade: letter, term: completeTerm })
    toast.success(`${markingComplete} marked as completed (${letter})`)
    setMarkingComplete(null)
  }

  const termsByYear = activeScenario.termSlots.reduce<Record<number, typeof activeScenario.termSlots>>((acc, slot) => {
    acc[slot.year] = acc[slot.year] ?? []
    acc[slot.year].push(slot)
    return acc
  }, {})

  const warningCodes = new Set(prereqWarnings.map((w) => w.course))
  const depts = Array.from(new Set(MUN_COURSES.map((c) => c.department))).sort()

  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} className="mb-4 flex items-start flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="text-xl">{fac?.emoji ?? '🎓'}</span>
              {prog?.name ?? 'Degree Planner'}
            </h1>
            <Badge className={cn('text-[10px]', fac?.color, fac?.textColor, fac?.borderColor)}>{prog?.degreeType}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Memorial University of Newfoundland · {fac?.shortName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scenario switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {scenarios.map((s) => (
              <button key={s.id} onClick={() => switchScenario(s.id)}
                className={cn('rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all',
                  s.id === activeScenarioId ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                )}>{s.name}</button>
            ))}
            <button onClick={() => setAddingScenario(true)} className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-emerald-600">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {scenarios.length > 1 && (
            <button
              onClick={() => {
                if (window.confirm(`Delete the "${activeScenario.name}" scenario?`)) deleteScenario(activeScenarioId)
              }}
              title="Delete current scenario"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={resetWizard} title="Change program" className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all">
            <RotateCcw className="h-3 w-3" /> Change Program
          </button>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
        <p className="text-[11px] text-amber-800"><strong>Informational only.</strong> Always verify requirements with your academic advisor and MUN&apos;s official catalog.</p>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label:'Completed', value:totalCreditsEarned, sub:`${activeScenario.completed.length} courses`, color:'text-emerald-700', bg:'bg-emerald-50' },
          { label:'Planned', value:totalCreditsPlanned, sub:'in future terms', color:'text-emerald-700', bg:'bg-emerald-50' },
          { label:'Progress', value:`${progressPct}%`, sub:`of ${graduationTarget} cr`, color:'text-blue-700', bg:'bg-blue-50' },
          { label:'Warnings', value:prereqWarnings.length, sub:prereqWarnings.length===0?'All clear':'prereq issues', color:prereqWarnings.length>0?'text-rose-700':'text-emerald-700', bg:prereqWarnings.length>0?'bg-rose-50':'bg-emerald-50' },
        ].map((s) => (
          <Card key={s.label} className={`border-0 shadow-none ${s.bg}`}>
            <CardContent className="p-3">
              <p className="text-[10px] text-slate-500 mb-0.5">{s.label}</p>
              <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-400">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-l-full transition-all"
            style={{ width: `${Math.min(100, Math.round((totalCreditsEarned / graduationTarget) * 100))}%` }} />
          <div className="absolute inset-y-0 bg-emerald-400/70 transition-all"
            style={{
              left: `${Math.min(100, Math.round((totalCreditsEarned / graduationTarget) * 100))}%`,
              width: `${Math.min(100 - Math.round((totalCreditsEarned / graduationTarget) * 100), Math.round((totalCreditsPlanned / graduationTarget) * 100))}%`,
            }} />
        </div>
        <div className="mt-1 flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Completed</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Planned</span>
          <span className="ml-auto">{Math.max(0, graduationTarget - totalCreds)} cr remaining to graduate</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 h-9 gap-0.5">
          <TabsTrigger value="board" className="text-xs gap-1"><CalendarDays className="h-3.5 w-3.5" />Semester Board</TabsTrigger>
          <TabsTrigger value="requirements" className="text-xs gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Requirements</TabsTrigger>
          <TabsTrigger value="catalog" className="text-xs gap-1"><BookOpen className="h-3.5 w-3.5" />Catalog</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" />Audit</TabsTrigger>
        </TabsList>

        {/* ── BOARD ──────────────────────────────────────────────────── */}
        <TabsContent value="board">
          <p className="mb-3 text-xs text-slate-400">Drag courses from <strong>Catalog</strong> or between terms. Drop to the <strong>Completed</strong> zone to record a grade.</p>

          {/* Completed pool */}
          <div className="mb-5 min-h-[56px] rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-3"
            onDragOver={(e) => e.preventDefault()} onDrop={onDropToCompleted}>
            <p className="mb-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed — drop here to mark done
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activeScenario.completed.map((entry) => (
                <div key={entry.courseCode} className="flex items-center gap-1">
                  <CourseChip code={entry.courseCode} draggable isCompleted onRemove={() => removeCompleted(entry.courseCode)} />
                  <span className="text-[10px] text-emerald-600 font-bold">{entry.letterGrade}</span>
                </div>
              ))}
              {activeScenario.completed.length === 0 && <p className="text-[11px] text-emerald-300 italic">No completed courses yet</p>}
            </div>
          </div>

          {/* Year groups */}
          {Object.entries(termsByYear).map(([year, slots]) => (
            <div key={year} className="mb-6">
              <h3 className="mb-2 text-xs font-bold text-slate-600 uppercase tracking-widest">Year {parseInt(year) - (activeScenario.termSlots[0]?.year ?? parseInt(year)) + 1} — {year}/{parseInt(year)+1}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {slots.map((slot) => {
                  const load = slot.courses.reduce((s, c) => s + (getCourse(c)?.creditHours ?? 3), 0)
                  const heavy = load > 15
                  return (
                    <div key={slot.id}
                      className={cn('min-h-[90px] rounded-xl border-2 border-dashed p-3 transition-all',
                        heavy ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-white hover:border-emerald-300'
                      )}
                      onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDropToTerm(e, slot.id)}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-700">{slot.term} {slot.year}</span>
                        <span className={cn('text-[10px] font-bold', heavy ? 'text-rose-600' : 'text-slate-400')}>{load} cr{heavy && ' ⚠'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {slot.courses.map((code) => (
                          <CourseChip key={code} code={code} draggable hasWarning={warningCodes.has(code)} onRemove={() => removeCourse(code, slot.id)} />
                        ))}
                        {slot.courses.length === 0 && <p className="text-[11px] text-slate-300 italic">Drop courses here</p>}
                      </div>
                      {/* Inline add course */}
                      {inlineAddTerm === slot.id ? (
                        <form className="mt-2 flex gap-1" onSubmit={(e) => {
                          e.preventDefault()
                          const code = inlineAddInput.trim().toUpperCase()
                          if (code) { placeCourse(code, slot.id); toast.success(`${code} added`) }
                          setInlineAddTerm(null); setInlineAddInput('')
                        }}>
                          <Input autoFocus value={inlineAddInput}
                            onChange={(e) => setInlineAddInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Escape') { setInlineAddTerm(null); setInlineAddInput('') } }}
                            placeholder="Course code…" className="h-6 text-[11px] flex-1" />
                          <button type="submit" className="rounded-md bg-emerald-500 px-2 text-[10px] text-white hover:bg-emerald-600">Add</button>
                          <button type="button" onClick={() => { setInlineAddTerm(null); setInlineAddInput('') }}
                            className="text-slate-300 hover:text-slate-500"><X className="h-3.5 w-3.5" /></button>
                        </form>
                      ) : (
                        <button onClick={() => { setInlineAddTerm(slot.id); setInlineAddInput('') }}
                          className="mt-1.5 text-[10px] text-slate-300 hover:text-emerald-500 flex items-center gap-0.5 transition-colors">
                          <Plus className="h-3 w-3" /> add course
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {prereqWarnings.length > 0 && (
            <Card className="mt-2 border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Prerequisite Warnings
                </p>
                <div className="space-y-1">
                  {prereqWarnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700"><strong>{w.course}</strong> in {w.termId.replace('-', ' ')}: {w.message}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── REQUIREMENTS ───────────────────────────────────────────── */}
        <TabsContent value="requirements">
          <div className="space-y-3">
            {requirements.map((sat) => {
              const pct = sat.creditsRequired > 0 ? Math.min(100, Math.round((sat.creditsSatisfied / sat.creditsRequired) * 100)) : (sat.isComplete ? 100 : 0)
              return (
                <Card key={sat.req.id} className={cn(sat.isComplete && 'border-emerald-200 bg-emerald-50/30')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {sat.isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        : sat.creditsSatisfied > 0 ? <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        : <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />}
                      <span className={cn('text-sm font-semibold flex-1', sat.isComplete ? 'text-emerald-800' : 'text-slate-800')}>{sat.req.label}</span>
                      <span className="text-xs text-slate-400">{sat.creditsSatisfied}/{sat.creditsRequired > 0 ? sat.creditsRequired : '?'} cr</span>
                    </div>
                    {sat.creditsRequired > 0 && (
                      <Progress value={pct} className="h-1.5 mb-2"
                        indicatorClassName={sat.isComplete ? 'bg-emerald-500' : 'bg-emerald-500'} />
                    )}
                    {sat.satisfiedBy.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] text-slate-400 mr-0.5 mt-0.5">By:</span>
                        {sat.satisfiedBy.map((code) => {
                          const doubleCount = requirements.filter((r) => r.satisfiedBy.includes(code) && r.req.id !== sat.req.id).length > 0
                          return (
                            <span key={code} className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', dc(getCourse(code)?.department ?? 'COMP'), doubleCount && 'ring-1 ring-emerald-400')}
                              title={doubleCount ? 'Double-counted' : undefined}>
                              {code}{doubleCount && ' ×2'}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    {sat.req.ruleType === 'SPECIFIC_COURSES' && sat.req.courses && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {sat.req.courses.filter((c) => !sat.satisfiedBy.includes(c)).map((c) => (
                          <span key={c} className="rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-400">{c}</span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" /> <span>Courses marked <strong>×2</strong> satisfy multiple requirements simultaneously — verify with your advisor whether this is permitted.</span>
          </p>
        </TabsContent>

        {/* ── CATALOG ──────────────────────────────────────────────────── */}
        <TabsContent value="catalog">
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search by code, title, description..." className="pl-9 h-9 text-sm" />
            </div>
            <div className="flex flex-wrap gap-1">
              {(['ALL', ...depts]).map((d) => (
                <button key={d} onClick={() => setCatalogDept(d)}
                  className={cn('rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all',
                    catalogDept === d ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                  )}>{d}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <select value={catalogLevel} onChange={(e) => setCatalogLevel(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs h-9">
                <option value="ALL">All Levels</option>
                <option value="1000">1000-level</option>
                <option value="2000">2000-level</option>
                <option value="3000">3000-level</option>
                <option value="4000">4000-level</option>
              </select>
              <select value={catalogTerm} onChange={(e) => setCatalogTerm(e.target.value as Term | 'ALL')}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs h-9">
                <option value="ALL">All Terms</option>
                <option value="Fall">Fall</option>
                <option value="Winter">Winter</option>
                <option value="Spring">Spring</option>
              </select>
            </div>
          </div>

          <p className="mb-3 text-xs text-slate-400">{filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}</p>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => {
              const inPlan = allCodesInPlan.has(course.code)
              const isDone = activeScenario.completed.some((c) => c.courseCode === course.code)
              const isExpanded = selectedCourse?.code === course.code
              return (
                <div key={course.code}
                  draggable onDragStart={(e) => e.dataTransfer.setData('courseCode', course.code)}
                  onClick={() => setSelectedCourse(isExpanded ? null : course)}
                  className={cn('rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md select-none',
                    isExpanded ? 'border-emerald-400 bg-emerald-50' : isDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white hover:border-emerald-200'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold', dc(course.department))}>{course.code}</span>
                        <span className="text-[10px] text-slate-400">{course.creditHours} cr</span>
                        {isDone && <Badge variant="success" className="text-[9px] py-0">Done</Badge>}
                        {inPlan && !isDone && <Badge variant="info" className="text-[9px] py-0">In Plan</Badge>}
                        {course.hasLab && <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded">Lab</span>}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-tight">{course.title}</p>
                    </div>
                    <ChevronRight className={cn('h-4 w-4 flex-shrink-0 text-slate-300 transition-transform mt-0.5', isExpanded && 'rotate-90 text-emerald-500')} />
                  </div>

                  {isExpanded && (
                    <div className="mt-3 border-t border-slate-100 pt-3 space-y-2.5">
                      <p className="text-[11px] leading-relaxed text-slate-600">{course.description}</p>

                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Prerequisites</p>
                        <p className="text-[11px] text-slate-600">{describePrereqs(course.prerequisites)}</p>
                      </div>

                      {course.corequisites && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Corequisites</p>
                          <p className="text-[11px] text-slate-600">{course.corequisites.join(', ')}</p>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Offered</p>
                          <div className="flex gap-1">
                            {course.typicalAvailability.map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{t}</span>)}
                          </div>
                        </div>
                        {course.mutuallyExclusiveWith && (
                          <div>
                            <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wide mb-0.5">Cannot credit with</p>
                            <p className="text-[11px] text-rose-600">{course.mutuallyExclusiveWith.join(', ')}</p>
                          </div>
                        )}
                      </div>

                      {course.professors && course.professors.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <Users className="h-3 w-3" /> Typical Instructors
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {course.professors.map((p) => (
                              <span key={p} className="rounded bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">{p}</span>
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5 italic">Assignments vary each year — verify with MUN course schedule.</p>
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Add to term:</p>
                        <div className="flex flex-wrap gap-1">
                          {activeScenario.termSlots.slice(0, 10).map((slot) => (
                            <button key={slot.id}
                              onClick={(e) => { e.stopPropagation(); placeCourse(course.code, slot.id); toast.success(`${course.code} → ${slot.term} ${slot.year}`) }}
                              className="rounded border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition-all">
                              {slot.term} {slot.year}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* ── AUDIT ────────────────────────────────────────────────────── */}
        <TabsContent value="audit">
          <div className="grid gap-5 lg:grid-cols-2">

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">What&apos;s Left</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                {requirements.filter((r) => !r.isComplete).map((sat) => (
                  <div key={sat.req.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{sat.req.label}</span>
                      <span className="text-xs text-slate-400">{Math.max(0, sat.creditsRequired - sat.creditsSatisfied)} cr left</span>
                    </div>
                    <Progress value={sat.creditsRequired > 0 ? Math.min(100, Math.round((sat.creditsSatisfied / sat.creditsRequired) * 100)) : 0}
                      className="h-1.5" indicatorClassName="bg-emerald-500" />
                  </div>
                ))}
                {requirements.filter((r) => !r.isComplete).length === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-emerald-700">All requirements satisfied!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Credit Summary</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5 space-y-2.5">
                {[
                  { label:'Completed', value:totalCreditsEarned, color:'text-emerald-600' },
                  { label:'Planned', value:totalCreditsPlanned, color:'text-emerald-600' },
                  { label:'Total', value:totalCreds, color:'text-slate-800' },
                  { label:'Required', value:graduationTarget, color:'text-slate-500' },
                  { label:'Still needed', value:Math.max(0, graduationTarget - totalCreds), color:'text-rose-600' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{row.label}</span>
                    <span className={cn('text-sm font-bold', row.color)}>{row.value} cr</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Graduation estimate */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Estimated Graduation</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5">
                {(() => {
                  const remaining = Math.max(0, graduationTarget - totalCreds)
                  const termsNeeded = Math.ceil(remaining / 15)
                  const startSlot = activeScenario.termSlots[0]
                  let gradYear = startSlot?.year ?? new Date().getFullYear()
                  let gradTerm: Term = startSlot?.term ?? 'Fall'
                  const cycle: Term[] = ['Fall', 'Winter']
                  let ti = cycle.indexOf(gradTerm)
                  for (let i = 0; i < termsNeeded; i++) {
                    ti = (ti + 1) % cycle.length
                    if (ti === 0) gradYear++
                  }
                  gradTerm = cycle[ti]
                  return (
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                        <GraduationCap className="h-6 w-6 text-emerald-600" />
                        <div>
                          <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wide">Estimated</p>
                          <p className="text-lg font-extrabold text-emerald-800">{gradTerm} {gradYear}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Based on <strong>{remaining} credits remaining</strong> at ~15 cr/term (Fall + Winter).<br />
                        Drag courses on the board to update this estimate.
                      </p>
                    </div>
                  )
                })()}

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {requirements.map((sat) => (
                    <div key={sat.req.id} className="flex items-center gap-2">
                      {sat.isComplete
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        : <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />}
                      <span className={cn('text-xs flex-1', sat.isComplete ? 'text-emerald-700 line-through' : 'text-slate-700')}>{sat.req.label}</span>
                      {!sat.isComplete && <span className="text-[10px] text-slate-400">{Math.max(0, sat.creditsRequired - sat.creditsSatisfied)} cr</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Scenario comparison */}
            {scenarios.length > 1 && (
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Scenario Comparison</CardTitle></CardHeader>
                <CardContent className="px-5 pb-5 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left text-slate-500 font-medium pb-2 pr-4">Metric</th>
                        {scenarios.map((s) => (
                          <th key={s.id} className={cn('text-left pb-2 pr-4 font-semibold', s.id === activeScenarioId ? 'text-emerald-700' : 'text-slate-700')}>
                            {s.name}{s.id === activeScenarioId && ' ✓'}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { label:'Completed (cr)', fn: (s: PlannerScenario) => s.completed.reduce((t, c) => t + (getCourse(c.courseCode)?.creditHours ?? 3), 0) },
                        { label:'Planned (cr)', fn: (s: PlannerScenario) => s.termSlots.flatMap((sl) => sl.courses).reduce((t, c) => t + (getCourse(c)?.creditHours ?? 3), 0) },
                        { label:'Reqs complete', fn: (s: PlannerScenario) => { const r = evaluateRequirements(s, s.declaredPrograms); return `${r.filter((x) => x.isComplete).length}/${r.length}` } },
                        { label:'Prereq warnings', fn: (s: PlannerScenario) => checkPrerequisites(s).length },
                      ].map((row) => (
                        <tr key={row.label}>
                          <td className="py-2 pr-4 text-slate-500">{row.label}</td>
                          {scenarios.map((s) => (
                            <td key={s.id} className={cn('py-2 pr-4 font-medium', s.id === activeScenarioId ? 'text-emerald-700' : 'text-slate-700')}>
                              {String(row.fn(s))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Mark complete modal ────────────────────────────────────────── */}
      {markingComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-1 text-base font-bold text-slate-900">Mark as Completed</h3>
            <p className="mb-4 text-sm text-slate-500">{markingComplete} · {getCourse(markingComplete)?.title}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Final Grade (%)</label>
                <Input type="number" min={0} max={100} value={completeGrade}
                  onChange={(e) => setCompleteGrade(e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Term Taken</label>
                <Input value={completeTerm} onChange={(e) => setCompleteTerm(e.target.value)}
                  placeholder="e.g. Fall 2024" className="h-9 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleMarkComplete} variant="gradient" size="sm" className="flex-1">
                <Check className="h-3.5 w-3.5 mr-1.5" />Confirm
              </Button>
              <Button onClick={() => setMarkingComplete(null)} variant="outline" size="sm" className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add scenario modal ─────────────────────────────────────────── */}
      {addingScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-3 text-base font-bold text-slate-900">New Scenario</h3>
            <Input value={newScenarioName} onChange={(e) => setNewScenarioName(e.target.value)}
              placeholder="e.g. With Math Minor" className="h-9 text-sm mb-3" autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && newScenarioName.trim()) { addScenario(newScenarioName.trim()); setNewScenarioName(''); setAddingScenario(false) }}} />
            <div className="flex gap-2">
              <Button onClick={() => { if (newScenarioName.trim()) { addScenario(newScenarioName.trim()); setNewScenarioName(''); setAddingScenario(false) }}}
                variant="gradient" size="sm" className="flex-1">Create blank</Button>
              <Button onClick={() => { if (newScenarioName.trim()) { duplicateScenario(activeScenarioId, newScenarioName.trim()); setNewScenarioName(''); setAddingScenario(false) }}}
                variant="outline" size="sm" className="flex-1"><Copy className="h-3 w-3 mr-1" />Clone</Button>
              <Button onClick={() => setAddingScenario(false)} variant="ghost" size="sm"><X className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
