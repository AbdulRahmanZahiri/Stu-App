'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { PlannerScenario, PlannerState, CompletedEntry, Term, TermSlot, RequirementSatisfaction } from './planner-types'
import { MUN_COURSES, MUN_PROGRAMS, SUGGESTED_PLANS } from './planner-data'
import { useAuth } from './auth-context'
import { loadPlannerState, savePlannerState } from './supabase-data'

const STORAGE_KEY = 'sf-planner-v2'

function termSlots(startYear: number): TermSlot[] {
  const slots: TermSlot[] = []
  for (let y = startYear; y <= startYear + 4; y++) {
    for (const term of ['Fall', 'Winter', 'Spring'] as Term[]) {
      slots.push({ id: `${term}-${y}`, term, year: y, courses: [] })
    }
  }
  return slots
}

function blankScenario(name: string, startYear: number, programId: string): PlannerScenario {
  return {
    id: crypto.randomUUID(),
    name,
    termSlots: termSlots(startYear),
    completed: [],
    declaredPrograms: [programId],
    createdAt: new Date().toISOString(),
  }
}

function applyPlan(scenario: PlannerScenario, startYear: number): PlannerScenario {
  const pid = scenario.declaredPrograms[0]
  const plan = SUGGESTED_PLANS[pid] ?? []
  const updatedSlots = scenario.termSlots.map((slot) => ({ ...slot, courses: [] as string[] }))
  for (const entry of plan) {
    const actualYear = startYear + (entry.relativeYear - 1)
    const slotId = `${entry.term}-${actualYear}`
    const slot = updatedSlots.find((s) => s.id === slotId)
    if (slot && !slot.courses.includes(entry.courseCode)) {
      slot.courses.push(entry.courseCode)
    }
  }
  return { ...scenario, termSlots: updatedSlots }
}

function loadState(): PlannerState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PlannerState
  } catch { return null }
}

// ── Requirement evaluation ────────────────────────────────────────────────────

function creditsFor(code: string): number {
  return MUN_COURSES.find((c) => c.code === code)?.creditHours ?? 3
}

function levelOf(code: string): number {
  return MUN_COURSES.find((c) => c.code === code)?.level ?? 0
}

function deptOf(code: string): string {
  return MUN_COURSES.find((c) => c.code === code)?.department ?? code.split(' ')[0]
}

export function evaluateRequirements(scenario: PlannerScenario, programIds: string[]): RequirementSatisfaction[] {
  const allCodes = new Set([
    ...scenario.completed.map((c) => c.courseCode),
    ...scenario.termSlots.flatMap((s) => s.courses),
  ])
  const results: RequirementSatisfaction[] = []

  for (const pid of programIds) {
    const prog = MUN_PROGRAMS.find((p) => p.id === pid)
    if (!prog) continue

    for (const req of prog.requirements) {
      if (req.ruleType === 'SPECIFIC_COURSES' && req.courses) {
        const satisfied = req.courses.filter((c) => allCodes.has(c))
        const creditsRequired = req.courses.reduce((s, c) => s + creditsFor(c), 0)
        const creditsSatisfied = satisfied.reduce((s, c) => s + creditsFor(c), 0)
        results.push({ req, satisfiedBy: satisfied, creditsRequired, creditsSatisfied, isComplete: satisfied.length === req.courses.length })

      } else if (req.ruleType === 'CHOICE' && req.choices) {
        const matched = req.choices.find((g) => g.every((c) => allCodes.has(c)))
        results.push({ req, satisfiedBy: matched ?? [], creditsRequired: 3, creditsSatisfied: matched ? 3 : 0, isComplete: !!matched })

      } else if (req.ruleType === 'CREDIT_HOURS_FROM_SET' && req.candidateCourses) {
        const matches = req.candidateCourses.filter((c) => allCodes.has(c))
        const creditsSatisfied = matches.reduce((s, c) => s + creditsFor(c), 0)
        const creditsRequired = req.creditHours ?? 0
        results.push({ req, satisfiedBy: matches, creditsRequired, creditsSatisfied, isComplete: creditsSatisfied >= creditsRequired })

      } else if (req.ruleType === 'CREDIT_HOURS_AT_LEVEL') {
        const matches = [...allCodes].filter((c) => {
          return deptOf(c) === req.fromDepartment && levelOf(c) >= (req.fromLevelMin ?? 0) && levelOf(c) <= (req.fromLevelMax ?? 9999)
        })
        const creditsSatisfied = matches.reduce((s, c) => s + creditsFor(c), 0)
        const creditsRequired = req.creditHours ?? 0
        results.push({ req, satisfiedBy: matches, creditsRequired, creditsSatisfied, isComplete: creditsSatisfied >= creditsRequired })

      } else {
        results.push({ req, satisfiedBy: [], creditsRequired: req.creditHours ?? 0, creditsSatisfied: 0, isComplete: false })
      }
    }
  }

  return results
}

// ── Prereq checker ────────────────────────────────────────────────────────────

export interface PrereqWarning { course: string; termId: string; message: string }

export function checkPrerequisites(scenario: PlannerScenario): PrereqWarning[] {
  const warnings: PrereqWarning[] = []
  const completedCodes = new Set(scenario.completed.map((c) => c.courseCode))

  for (let ti = 0; ti < scenario.termSlots.length; ti++) {
    const slot = scenario.termSlots[ti]
    const availableBefore = new Set<string>(completedCodes)
    for (let prev = 0; prev < ti; prev++) scenario.termSlots[prev].courses.forEach((c) => availableBefore.add(c))

    for (const code of slot.courses) {
      const course = MUN_COURSES.find((c) => c.code === code)
      if (!course?.prerequisites) continue
      const missing = getMissingPrereqs(course.prerequisites, availableBefore)
      if (missing.length > 0) warnings.push({ course: code, termId: slot.id, message: `Missing: ${missing.join(', ')}` })
    }
  }
  return warnings
}

function getMissingPrereqs(node: import('./planner-types').PrereqNode, before: Set<string>): string[] {
  switch (node.type) {
    case 'COURSE': return node.course && !before.has(node.course) ? [node.course] : []
    case 'MIN_GRADE': return node.course && !before.has(node.course) ? [`${node.course}(≥${node.minGrade}%)`] : []
    case 'PROGRAM_ADMISSION': return []
    case 'AND': return (node.children ?? []).flatMap((c) => getMissingPrereqs(c, before))
    case 'OR': {
      const groups = (node.children ?? []).map((c) => getMissingPrereqs(c, before))
      return groups.every((g) => g.length > 0) ? groups[0] : []
    }
    default: return []
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface PlannerStore {
  scenarios: PlannerScenario[]
  activeScenarioId: string
  activeScenario: PlannerScenario
  wizardDone: boolean
  completeWizard: (programId: string, startYear: number, priorEntries: CompletedEntry[]) => void
  resetWizard: () => void
  placeCourse: (courseCode: string, termId: string) => void
  removeCourse: (courseCode: string, termId: string) => void
  markCompleted: (entry: CompletedEntry) => void
  removeCompleted: (courseCode: string) => void
  addScenario: (name: string, fromProgramId?: string, startYear?: number) => void
  duplicateScenario: (id: string, name: string) => void
  deleteScenario: (id: string) => void
  switchScenario: (id: string) => void
  requirements: RequirementSatisfaction[]
  prereqWarnings: PrereqWarning[]
  totalCreditsEarned: number
  totalCreditsPlanned: number
}

const PlannerContext = createContext<PlannerStore | null>(null)

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState<PlannerState>(() => {
    const saved = loadState()
    if (saved) return saved
    return { scenarios: [], activeScenarioId: '', wizardDone: false }
  })
  const [persistenceReady, setPersistenceReady] = useState(false)

  useEffect(() => {
    if (authLoading) return
    let cancelled = false

    async function hydrate() {
      await Promise.resolve()
      if (cancelled) return
      setPersistenceReady(false)

      if (!user) {
        const saved = loadState()
        if (!cancelled && saved) setState(saved)
        if (!cancelled) setPersistenceReady(true)
        return
      }

      try {
        const remote = await loadPlannerState(user.id)
        if (cancelled) return
        if (remote) {
          setState(remote)
        } else {
          const local = loadState()
          if (local?.scenarios.length) {
            setState(local)
            await savePlannerState(user.id, local)
          }
        }
      } catch (error) {
        console.error('Planner hydration failed:', error)
      } finally {
        if (!cancelled) setPersistenceReady(true)
      }
    }

    void hydrate()
    return () => { cancelled = true }
  }, [authLoading, user])

  useEffect(() => {
    if (!persistenceReady) return
    const timer = window.setTimeout(() => {
      if (user) {
        void savePlannerState(user.id, state).catch((error) => console.error('Planner save failed:', error))
      } else {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* quota */ }
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [persistenceReady, state, user])

  const mutateActive = useCallback((fn: (s: PlannerScenario) => PlannerScenario) => {
    setState((prev) => ({ ...prev, scenarios: prev.scenarios.map((s) => s.id === prev.activeScenarioId ? fn(s) : s) }))
  }, [])

  const completeWizard = useCallback((programId: string, startYear: number, priorEntries: CompletedEntry[]) => {
    const base = blankScenario('My Plan', startYear, programId)
    const withPlan = applyPlan(base, startYear)
    const priorCodes = new Set(priorEntries.map((e) => e.courseCode))
    const withCompleted: PlannerScenario = {
      ...withPlan,
      completed: priorEntries,
      termSlots: withPlan.termSlots.map((slot) => ({
        ...slot, courses: slot.courses.filter((c) => !priorCodes.has(c)),
      })),
    }
    setState({ scenarios: [withCompleted], activeScenarioId: withCompleted.id, wizardDone: true })
  }, [])

  const resetWizard = useCallback(() => {
    setState({ scenarios: [], activeScenarioId: '', wizardDone: false })
  }, [])

  const placeCourse = useCallback((courseCode: string, termId: string) => {
    mutateActive((s) => ({
      ...s,
      termSlots: s.termSlots.map((slot) => {
        if (slot.id !== termId) return { ...slot, courses: slot.courses.filter((c) => c !== courseCode) }
        if (slot.courses.includes(courseCode)) return slot
        return { ...slot, courses: [...slot.courses, courseCode] }
      }),
    }))
  }, [mutateActive])

  const removeCourse = useCallback((courseCode: string, termId: string) => {
    mutateActive((s) => ({ ...s, termSlots: s.termSlots.map((slot) => slot.id === termId ? { ...slot, courses: slot.courses.filter((c) => c !== courseCode) } : slot) }))
  }, [mutateActive])

  const markCompleted = useCallback((entry: CompletedEntry) => {
    mutateActive((s) => ({
      ...s,
      completed: [...s.completed.filter((c) => c.courseCode !== entry.courseCode), entry],
      termSlots: s.termSlots.map((slot) => ({ ...slot, courses: slot.courses.filter((c) => c !== entry.courseCode) })),
    }))
  }, [mutateActive])

  const removeCompleted = useCallback((courseCode: string) => {
    mutateActive((s) => ({ ...s, completed: s.completed.filter((c) => c.courseCode !== courseCode) }))
  }, [mutateActive])

  const addScenario = useCallback((name: string, fromProgramId?: string, startYear?: number) => {
    const pid = fromProgramId ?? state.scenarios[0]?.declaredPrograms[0] ?? 'bsc-cs'
    const yr = startYear ?? new Date().getFullYear()
    const base = blankScenario(name, yr, pid)
    const withPlan = applyPlan(base, yr)
    setState((prev) => ({ ...prev, scenarios: [...prev.scenarios, withPlan], activeScenarioId: withPlan.id }))
  }, [state.scenarios])

  const duplicateScenario = useCallback((id: string, name: string) => {
    setState((prev) => {
      const src = prev.scenarios.find((s) => s.id === id)
      if (!src) return prev
      const copy: PlannerScenario = { ...JSON.parse(JSON.stringify(src)), id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
      return { ...prev, scenarios: [...prev.scenarios, copy], activeScenarioId: copy.id }
    })
  }, [])

  const deleteScenario = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.scenarios.filter((s) => s.id !== id)
      if (remaining.length === 0) return { ...prev, scenarios: [], activeScenarioId: '', wizardDone: false }
      return { ...prev, scenarios: remaining, activeScenarioId: prev.activeScenarioId === id ? remaining[0].id : prev.activeScenarioId }
    })
  }, [])

  const switchScenario = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeScenarioId: id }))
  }, [])

  const active = state.scenarios.find((s) => s.id === state.activeScenarioId) ?? state.scenarios[0]

  const requirements = React.useMemo(() => active ? evaluateRequirements(active, active.declaredPrograms) : [], [active])
  const prereqWarnings = React.useMemo(() => active ? checkPrerequisites(active) : [], [active])
  const totalCreditsEarned = active?.completed.reduce((s, c) => s + creditsFor(c.courseCode), 0) ?? 0
  const totalCreditsPlanned = active?.termSlots.flatMap((s) => s.courses).reduce((s, c) => s + creditsFor(c), 0) ?? 0

  return (
    <PlannerContext.Provider value={{
      scenarios: state.scenarios,
      activeScenarioId: state.activeScenarioId,
      activeScenario: active!,
      wizardDone: state.wizardDone,
      completeWizard, resetWizard,
      placeCourse, removeCourse, markCompleted, removeCompleted,
      addScenario, duplicateScenario, deleteScenario, switchScenario,
      requirements, prereqWarnings, totalCreditsEarned, totalCreditsPlanned,
    }}>
      {children}
    </PlannerContext.Provider>
  )
}

export function usePlanner() {
  const ctx = useContext(PlannerContext)
  if (!ctx) throw new Error('usePlanner must be inside PlannerProvider')
  return ctx
}
