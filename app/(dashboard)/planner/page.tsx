'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Info, Search, ChevronRight, Plus, Trash2,
  CheckCircle2, AlertTriangle, Circle, Clock, BookOpen, X,
  CalendarDays, BarChart3, ArrowLeft, Sparkles, Check,
  AlertCircle, Copy, RotateCcw, ExternalLink, ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { usePlanner } from '@/lib/planner-store'
import { MUN_COURSES, MUN_PROGRAMS, FACULTIES, UNIVERSITIES, PLANNER_SOURCE_LINKS, describePrereqs, getCourse, getProgram, getFaculty, getUniversity } from '@/lib/planner-data'
import { creditsFor, generateDegreePlan } from '@/lib/planner-engine'
import type { MUNCourse, Term, TermSlot, CompletedEntry } from '@/lib/planner-types'
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
  { value: 1, label: 'First Year', subtitle: 'Starting university', description: 'Choose an intended major or an official undeclared/exploratory pathway where one is available.' },
  { value: 2, label: 'Second Year', subtitle: 'Program study', description: 'Record completed first-year courses so the planner can place later requirements correctly.' },
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

  const university = selectedUniversity ? getUniversity(selectedUniversity) : null
  const faculty = selectedFaculty ? getFaculty(selectedFaculty) : null
  const program = selectedProgram ? getProgram(selectedProgram) : null

  const programsForStep = selectedFaculty
    ? MUN_PROGRAMS
        .filter((candidate) => candidate.facultyId === selectedFaculty && candidate.universityId === selectedUniversity)
        .sort((left, right) => Number(Boolean(right.isExploratory)) - Number(Boolean(left.isExploratory)) || left.name.localeCompare(right.name))
    : []

  const previewPlan = selectedProgram
    ? generateDegreePlan(selectedProgram, startYear, startTerm)
    : null

  const priorPlanYears = Object.values((previewPlan?.termSlots ?? []).reduce<Record<number, { ry: number; slots: TermSlot[] }>>((groups, slot, index) => {
    const relativeYear = slot.relativeYear ?? Math.floor(index / 3) + 1
    groups[relativeYear] = groups[relativeYear] ?? { ry: relativeYear, slots: [] }
    groups[relativeYear].slots.push(slot)
    return groups
  }, {}))
    .filter(({ ry }) => ry < (yearOfStudy ?? 1))
    .sort((left, right) => left.ry - right.ry)

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
        term: termId.replace('-', ' '),
        isTransfer: false,
      })),
      ...[...extraPerTerm.entries()].flatMap(([termId, codes]) =>
        codes.map((code) => ({
          courseCode: code,
          term: termId.replace('-', ' '),
          isTransfer: true,
        }))
      ),
    ]
    completeWizard(selectedProgram, startYear, startTerm, priorEntries)
    toast.success(program?.planningMode === 'verified'
      ? 'Catalog-backed plan generated. Review elective choices and current offerings.'
      : 'Manual degree workspace created from the official program listing.')
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
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Build a Catalog-Backed Degree Plan</h1>
                <p className="text-sm text-slate-500 max-w-lg mx-auto">
                  Start with a university catalog ScholarFlow has actually verified. Unsupported institutions are not shown as fake choices.
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
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-700 font-medium">Catalog connected</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{u.city} · {u.studentCount}</p>
                        {u.tagline && <p className="mt-1 text-xs text-slate-400 leading-relaxed">{u.tagline}</p>}
                        <p className="mt-1 text-[10px] font-medium text-emerald-700">Catalog {u.catalogYear} · verified {u.lastVerified}</p>
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
                <h2 className="text-xl font-bold text-slate-900">Which academic area are you planning?</h2>
                <p className="mt-1 text-sm text-slate-500">These areas and program names come from {university?.name}&apos;s official directory. Detailed audits are enabled only where requirements are mapped.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {FACULTIES.filter((candidate) => candidate.universityId === selectedUniversity).map((f) => (
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
                <p className="mt-1 text-sm text-slate-500">This controls which earlier terms are offered when you record completed courses. It does not assume every faculty declares majors on the same timeline.</p>
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
                    <strong>First-year tip:</strong> Choose your intended program if you know it, or select an official undeclared, Business One, or Engineering One pathway when it applies.
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
                  Choose the official program you are in or intend to enter. A mapped degree plan and a manual catalog workspace are clearly distinguished.
                </p>
              </div>

              <div className="space-y-3">
                {programsForStep.map((prog) => (
                  <button
                    key={prog.id}
                    onClick={() => { if (prog.acceptingNewStudents !== false) setSelectedProgram(prog.id) }}
                    disabled={prog.acceptingNewStudents === false}
                    className={cn(
                      'w-full rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md',
                      prog.acceptingNewStudents === false && 'cursor-not-allowed opacity-55 hover:shadow-none',
                      selectedProgram === prog.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn('text-sm font-bold', selectedProgram === prog.id ? 'text-emerald-800' : 'text-slate-800')}>{prog.name}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{prog.degreeType}</span>
                          {prog.totalCreditHoursRequired !== null && <span className="text-[10px] text-slate-400">{prog.totalCreditHoursRequired} cr</span>}
                          {prog.typicalYears !== null && <span className="text-[10px] text-slate-400">· {prog.typicalYears} yrs</span>}
                          <span className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                            prog.planningMode === 'verified'
                              ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                              : 'border-slate-200 bg-slate-100 text-slate-600',
                          )}>
                            {prog.planningMode === 'verified' ? 'Degree map available' : 'Manual plan'}
                          </span>
                          {prog.acceptingNewStudents === false && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">Not accepting new students</span>}
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

              {program && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-emerald-900">{program.catalogYear}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-800">{program.statusNote}</p>
                    <a href={program.officialUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline">
                      Open official source <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

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
                      {(['Fall', 'Winter', 'Spring'] as Term[]).map((t) => (
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
                      <strong>Your plan:</strong> {program?.name} · Starting {startTerm} {startYear}
                      {program?.typicalYears !== null && program?.typicalYears !== undefined ? ` · published length ${program.typicalYears} years` : ' · confirm program length in the official source'}
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
                    : program?.planningMode === 'verified'
                      ? 'Check the mapped courses you actually completed, then add any other transcript courses by their exact code.'
                      : 'This program is in manual mode. Add completed courses from your transcript; ScholarFlow will not invent a sequence.'}
                </p>
              </div>

              {priorPlanYears.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-6 text-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-800 mb-1">Fresh start!</p>
                  <p className="text-xs text-emerald-600">No prior university terms are expected. You can still enter transfer credit below.</p>
                </div>
              ) : (
                <div className="space-y-5 mb-4 max-h-[50vh] overflow-y-auto pr-1">
                  {priorPlanYears.map(({ ry, slots }) => (
                      <div key={ry}>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                          Year {ry}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {slots.map((slot) => {
                            const termId = slot.id
                            const planCodes = slot.courses
                            const extras = extraPerTerm.get(termId) ?? []
                            if (planCodes.length === 0 && extras.length === 0 && !termInputs.get(termId)) {
                              return (
                                <div key={termId} className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                                  <p className="text-[11px] font-semibold text-slate-400 mb-2">{slot.term} {slot.year}</p>
                                  <p className="text-[10px] text-slate-300 italic mb-2">No catalog requirement auto-placed</p>
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
                                <p className="text-[11px] font-semibold text-slate-600 mb-2">{slot.term} {slot.year}</p>
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
                                        <span className="text-[10px] text-slate-400 flex-shrink-0">{course ? `${course.creditHours}cr` : 'credits unverified'}</span>
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
                  ))}
                </div>
              )}

              {/* Transfer / other credits not in plan */}
              <div className="rounded-xl border border-dashed border-slate-200 p-3 mb-4">
                <p className="text-[11px] font-semibold text-slate-500 mb-2">Transfer credits or courses not in your program plan</p>
                <div className="flex gap-2">
                  <Input id="transfer-code" placeholder="Course code (e.g. COMP 1001)" className="h-8 text-xs flex-1" />
                  <select id="transfer-term" className="rounded-lg border border-slate-200 bg-white px-2 text-xs h-8">
                    {(previewPlan?.termSlots ?? [])
                      .filter((slot, index) => (slot.relativeYear ?? Math.floor(index / 3) + 1) < (yearOfStudy ?? 1))
                      .map((slot) => <option key={slot.id} value={slot.id}>{slot.term} {slot.year}</option>)}
                    {yearOfStudy === 1 && <option value={`${startTerm}-${startYear}`}>{startTerm} {startYear}</option>}
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
                  <Sparkles className="h-4 w-4" /> {program?.planningMode === 'verified' ? 'Build Catalog Plan' : 'Create Manual Workspace'}
                </Button>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400">Skip this step if you haven&apos;t taken anything yet — you can mark courses complete later.</p>
            </motion.div>
          )}

        </AnimatePresence>

        <p className="mt-8 text-center text-[11px] text-slate-400">
          <Info className="inline h-3 w-3 mr-1" />
          Catalog provenance is shown for every program. Always verify the final schedule with a Memorial academic advisor.
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
  const [selectedCourse, setSelectedCourse] = useState<MUNCourse | null>(null)
  const [markingComplete, setMarkingComplete] = useState<string | null>(null)
  const [completeGrade, setCompleteGrade] = useState('')
  const [completeTerm, setCompleteTerm] = useState('')
  const [addingScenario, setAddingScenario] = useState(false)
  const [newScenarioName, setNewScenarioName] = useState('')
  const [inlineAddTerm, setInlineAddTerm] = useState<string | null>(null)
  const [inlineAddInput, setInlineAddInput] = useState('')

  const prog = activeScenario.declaredPrograms[0] ? getProgram(activeScenario.declaredPrograms[0]) : null
  const fac = prog ? getFaculty(prog.facultyId) : null
  const university = getUniversity(activeScenario.universityId ?? prog?.universityId ?? 'mun')
  const totalCreds = totalCreditsEarned + totalCreditsPlanned
  const graduationTarget = prog?.totalCreditHoursRequired ?? null
  const progressPct = graduationTarget ? Math.min(100, Math.round((totalCreds / graduationTarget) * 100)) : null

  // Catalog filter
  const filteredCourses = MUN_COURSES.filter((c) => {
    if (catalogDept !== 'ALL' && c.department !== catalogDept) return false
    if (catalogLevel !== 'ALL' && !String(c.level).startsWith(catalogLevel[0])) return false
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
    const term = completeTerm.trim()
    if (!term) {
      toast.error('Enter the term when you completed this course.')
      return
    }

    const gradeText = completeGrade.trim()
    const grade = gradeText ? Number(gradeText) : undefined
    if (grade !== undefined && (!Number.isFinite(grade) || grade < 0 || grade > 100)) {
      toast.error('Grade must be between 0 and 100, or left blank.')
      return
    }

    const letterGrade = grade === undefined
      ? undefined
      : grade >= 90 ? 'A+' : grade >= 85 ? 'A' : grade >= 80 ? 'A-' : grade >= 77 ? 'B+' : grade >= 73 ? 'B' : grade >= 70 ? 'B-' : grade >= 67 ? 'C+' : grade >= 63 ? 'C' : grade >= 60 ? 'C-' : grade >= 55 ? 'D' : 'F'

    markCompleted({ courseCode: markingComplete, grade, letterGrade, term })
    toast.success(`${markingComplete} marked as completed${letterGrade ? ` (${letterGrade})` : ''}`)
    setMarkingComplete(null)
    setCompleteGrade('')
    setCompleteTerm('')
  }

  const termsByYear = activeScenario.termSlots.reduce<Record<number, TermSlot[]>>((acc, slot, index) => {
    const relativeYear = slot.relativeYear ?? Math.floor(index / 3) + 1
    acc[relativeYear] = acc[relativeYear] ?? []
    acc[relativeYear].push(slot)
    return acc
  }, {})

  const warningCodes = new Set(prereqWarnings.map((w) => w.course))
  const depts = Array.from(new Set(MUN_COURSES.map((c) => c.department))).sort()
  const mappedRequirements = requirements.filter((requirement) => requirement.req.ruleType !== 'MANUAL')
  const uncoveredMappedRequirements = mappedRequirements.filter((requirement) => !requirement.isPlanned)
  const manualRequirements = requirements.filter((requirement) => requirement.req.ruleType === 'MANUAL')
  const lastPlannedSlot = [...activeScenario.termSlots].reverse().find((slot) => slot.courses.length > 0)

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
            <Badge className={cn(
              'text-[10px]',
              prog?.planningMode === 'verified'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-600',
            )}>{prog?.planningMode === 'verified' ? 'Mapped catalog' : 'Manual mode'}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{university?.name ?? 'University'} · {fac?.shortName} · {prog?.catalogYear}</p>
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

      {/* Catalog status */}
      <div className={cn(
        'mb-4 flex items-start gap-2 rounded-xl border px-3 py-2.5',
        prog?.planningMode === 'verified' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50',
      )}>
        {prog?.planningMode === 'verified'
          ? <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
          : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />}
        <div className="min-w-0 flex-1">
          <p className={cn('text-[11px]', prog?.planningMode === 'verified' ? 'text-emerald-900' : 'text-amber-900')}>
            <strong>{prog?.planningMode === 'verified' ? 'Catalog-backed requirements.' : 'Manual planning mode.'}</strong>{' '}
            {prog?.statusNote} Course availability changes by term, so confirm registration choices with an advisor.
          </p>
          {prog?.officialUrl && (
            <a href={prog.officialUrl} target="_blank" rel="noreferrer" className={cn(
              'mt-1 inline-flex items-center gap-1 text-[11px] font-semibold hover:underline',
              prog.planningMode === 'verified' ? 'text-emerald-700' : 'text-amber-700',
            )}>
              Official program source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label:'Completed', value:totalCreditsEarned, sub:`${activeScenario.completed.length} courses`, color:'text-emerald-700', bg:'bg-emerald-50' },
          { label:'Planned', value:totalCreditsPlanned, sub:'in future terms', color:'text-emerald-700', bg:'bg-emerald-50' },
          { label:'Progress', value:progressPct === null ? '—' : `${progressPct}%`, sub:graduationTarget ? `of ${graduationTarget} cr` : 'official total not mapped', color:'text-violet-700', bg:'bg-violet-50' },
          { label:'Plan issues', value:prereqWarnings.length, sub:prereqWarnings.length===0?'All clear':'review required', color:prereqWarnings.length>0?'text-rose-700':'text-emerald-700', bg:prereqWarnings.length>0?'bg-rose-50':'bg-emerald-50' },
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
      {graduationTarget ? (
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
            <span className="ml-auto">{Math.max(0, graduationTarget - totalCreds)} cr not yet placed</span>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-[11px] text-slate-500">ScholarFlow is not guessing a degree total for this program. Use the official source while planning manually.</p>
      )}

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
                  {entry.letterGrade && <span className="text-[10px] text-emerald-600 font-bold">{entry.letterGrade}</span>}
                </div>
              ))}
              {activeScenario.completed.length === 0 && <p className="text-[11px] text-emerald-300 italic">No completed courses yet</p>}
            </div>
          </div>

          {/* Year groups */}
          {Object.entries(termsByYear).map(([relativeYear, slots]) => (
            <div key={relativeYear} className="mb-6">
              <h3 className="mb-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                Year {relativeYear} · {slots[0]?.term} {slots[0]?.year} to {slots.at(-1)?.term} {slots.at(-1)?.year}
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {slots.map((slot) => {
                  const load = slot.courses.reduce((total, code) => total + creditsFor(code, activeScenario.completed), 0)
                  const heavy = load > (prog?.maxCreditsPerTerm ?? 15)
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
                  <AlertTriangle className="h-4 w-4" /> Plan Validation Issues
                </p>
                <div className="space-y-1">
                  {prereqWarnings.map((w, index) => (
                    <p key={`${w.termId}-${w.course}-${index}`} className="text-xs text-amber-700">
                      <span className="mr-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase">{w.kind.replace('-', ' ')}</span>
                      <strong>{w.course}</strong> in {w.termId.replace('-', ' ')}: {w.message}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── REQUIREMENTS ───────────────────────────────────────────── */}
        <TabsContent value="requirements">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div>
              <p className="text-xs font-semibold text-slate-800">Mapped requirement audit</p>
              <p className="text-[10px] text-slate-500">Completed credits and future planned credits are tracked separately.</p>
            </div>
            {prog?.officialUrl && <a href={prog.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline">Official rules <ExternalLink className="h-3 w-3" /></a>}
          </div>
          <div className="space-y-3">
            {requirements.map((sat) => {
              const pct = sat.creditsRequired > 0 ? Math.min(100, Math.round((sat.creditsSatisfied / sat.creditsRequired) * 100)) : (sat.isComplete ? 100 : 0)
              const isManual = sat.req.ruleType === 'MANUAL'
              return (
                <Card key={sat.req.id} className={cn(
                  sat.isComplete && 'border-emerald-200 bg-emerald-50/30',
                  !sat.isComplete && sat.isPlanned && 'border-violet-200 bg-violet-50/30',
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {sat.isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        : sat.isPlanned ? <Clock className="h-4 w-4 text-violet-500 flex-shrink-0" />
                        : isManual ? <Info className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        : sat.creditsSatisfied > 0 ? <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        : <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />}
                      <span className={cn('text-sm font-semibold flex-1', sat.isComplete ? 'text-emerald-800' : 'text-slate-800')}>{sat.req.label}</span>
                      {isManual
                        ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Manual check</span>
                        : <span className="text-xs text-slate-400">{sat.creditsSatisfied}/{sat.creditsRequired > 0 ? sat.creditsRequired : '?'} cr</span>}
                    </div>
                    {sat.creditsRequired > 0 && !isManual && (
                      <Progress value={pct} className="h-1.5 mb-2"
                        indicatorClassName={sat.isComplete ? 'bg-emerald-500' : sat.isPlanned ? 'bg-violet-500' : 'bg-amber-500'} />
                    )}
                    {(sat.completedBy.length > 0 || sat.plannedBy.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sat.completedBy.map((code) => <span key={`done-${code}`} className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">{code} · done</span>)}
                        {sat.plannedBy.map((code) => <span key={`plan-${code}`} className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">{code} · planned</span>)}
                      </div>
                    )}
                    {sat.req.ruleType === 'SPECIFIC_COURSES' && sat.req.courses && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {sat.req.courses.filter((c) => !sat.satisfiedBy.includes(c)).map((c) => (
                          <span key={c} className="rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-400">{c}</span>
                        ))}
                      </div>
                    )}
                    {sat.req.note && <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{sat.req.note}</p>}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" /> <span>The engine avoids double-counting where the mapped rule disallows it. Manual policy requirements still require an official degree audit.</span>
          </p>
        </TabsContent>

        {/* ── CATALOG ──────────────────────────────────────────────────── */}
        <TabsContent value="catalog">
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] leading-relaxed text-slate-600">
                This is a source-backed subset used by the mapped Computer Science plan, not a live registration feed. ScholarFlow does not invent instructors or future term offerings.
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <a href={PLANNER_SOURCE_LINKS.computerScienceCourses} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline">
                  Official COMP catalog <ExternalLink className="h-3 w-3" />
                </a>
                <a href={PLANNER_SOURCE_LINKS.mathematicsCourses} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline">
                  Official MATH/STAT catalog <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
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
                        {course.prerequisiteNote && <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{course.prerequisiteNote}</p>}
                      </div>

                      {(course.corequisites?.length || course.corequisiteChoices?.length) && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Corequisites</p>
                          {course.corequisites?.length ? <p className="text-[11px] text-slate-600">{course.corequisites.join(', ')}</p> : null}
                          {course.corequisiteChoices?.length ? (
                            <p className="text-[11px] text-slate-600">{course.corequisiteChoices.map((group) => group.join(' + ')).join(' or ')}</p>
                          ) : null}
                        </div>
                      )}

                      <div className="flex gap-4">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Availability</p>
                          {course.typicalAvailability?.length ? (
                            <div className="flex gap-1">
                              {course.typicalAvailability.map((term) => <span key={term} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{term}</span>)}
                            </div>
                          ) : <p className="text-[11px] text-slate-500">Check the current registration schedule</p>}
                        </div>
                        {course.mutuallyExclusiveWith && (
                          <div>
                            <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wide mb-0.5">Cannot credit with</p>
                            <p className="text-[11px] text-rose-600">{course.mutuallyExclusiveWith.join(', ')}</p>
                          </div>
                        )}
                      </div>

                      <a href={course.officialUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline">
                        Official course source <ExternalLink className="h-3 w-3" />
                      </a>

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
                {uncoveredMappedRequirements.map((sat) => (
                  <div key={sat.req.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{sat.req.label}</span>
                      <span className="text-xs text-slate-400">{Math.max(0, sat.creditsRequired - sat.creditsSatisfied)} cr left</span>
                    </div>
                    <Progress value={sat.creditsRequired > 0 ? Math.min(100, Math.round((sat.creditsSatisfied / sat.creditsRequired) * 100)) : 0}
                      className="h-1.5" indicatorClassName="bg-emerald-500" />
                  </div>
                ))}
                {uncoveredMappedRequirements.length === 0 && mappedRequirements.length > 0 && (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-emerald-700">All mapped rules are covered</p>
                    <p className="mt-1 text-[10px] text-slate-500">This includes completed and currently planned courses; it is not a registrar degree audit.</p>
                  </div>
                )}
                {mappedRequirements.length === 0 && (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">Course-level requirements are not mapped for this program yet. Build the plan manually from the official program source.</p>
                )}
                {manualRequirements.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-amber-600">Advisor or manual checks</p>
                    {manualRequirements.map((requirement) => (
                      <p key={requirement.req.id} className="mb-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
                        <Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" /> {requirement.req.label}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Credit Summary</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5 space-y-2.5">
                {[
                  { label:'Completed', value:totalCreditsEarned, color:'text-emerald-600' },
                  { label:'Planned', value:totalCreditsPlanned, color:'text-violet-600' },
                  { label:'Total placed', value:totalCreds, color:'text-slate-800' },
                  { label:'Official degree total', value:graduationTarget, color:'text-slate-500' },
                  { label:'Not yet placed', value:graduationTarget === null ? null : Math.max(0, graduationTarget - totalCreds), color:'text-rose-600' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{row.label}</span>
                    <span className={cn('text-sm font-bold', row.color)}>{row.value === null ? 'Not mapped' : `${row.value} cr`}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Plan Confidence</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {prog?.planningMode === 'verified'
                    ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    : <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {prog?.planningMode === 'verified' ? 'Constraint-checked catalog plan' : 'Source-backed manual workspace'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {prog?.planningMode === 'verified'
                        ? `ScholarFlow checks mapped prerequisites, corequisites, credit rules, duplicate courses, exclusions, and term load. ${lastPlannedSlot ? `The current course sequence ends in ${lastPlannedSlot.term} ${lastPlannedSlot.year}, but that is not a graduation promise.` : 'No future courses are placed yet.'}`
                        : 'ScholarFlow verifies the program name and official link, but it does not fabricate a course sequence or graduation date when detailed rules are not mapped.'}
                    </p>
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-400">Future minimum-grade prerequisites remain conditional. Live section availability, reserved-seat rules, admission decisions, transfer rulings, substitutions, and advisor approvals must be confirmed with Memorial.</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {requirements.map((sat) => (
                    <div key={sat.req.id} className="flex items-center gap-2">
                      {sat.isComplete
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        : sat.isPlanned ? <Clock className="h-4 w-4 text-violet-500 flex-shrink-0" />
                        : sat.req.ruleType === 'MANUAL' ? <Info className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        : <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />}
                      <span className={cn('text-xs flex-1', sat.isComplete ? 'text-emerald-700' : sat.isPlanned ? 'text-violet-700' : 'text-slate-700')}>{sat.req.label}</span>
                      <span className="text-[10px] text-slate-400">
                        {sat.isComplete ? 'completed' : sat.isPlanned ? 'covered in plan' : sat.req.ruleType === 'MANUAL' ? 'manual check' : `${Math.max(0, sat.creditsRequired - sat.creditsSatisfied)} cr unplaced`}
                      </span>
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
                        { label:'Completed (cr)', fn: (s: PlannerScenario) => s.completed.reduce((total, entry) => total + creditsFor(entry.courseCode, s.completed), 0) },
                        { label:'Planned (cr)', fn: (s: PlannerScenario) => s.termSlots.flatMap((slot) => slot.courses).reduce((total, code) => total + creditsFor(code, s.completed), 0) },
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
                <label className="text-xs font-medium text-slate-700 block mb-1">Final Grade (%) <span className="font-normal text-slate-400">optional</span></label>
                <Input type="number" min={0} max={100} value={completeGrade}
                  onChange={(e) => setCompleteGrade(e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Term Taken</label>
                <Input value={completeTerm} onChange={(e) => setCompleteTerm(e.target.value)}
                  placeholder="e.g. Fall 2025" className="h-9 text-sm" />
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
