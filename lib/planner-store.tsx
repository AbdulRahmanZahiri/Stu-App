'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type {
  CompletedEntry,
  PlannerScenario,
  PlannerState,
  RequirementSatisfaction,
  Term,
} from './planner-types'
import { MUN_CATALOG_YEAR, getProgram } from './planner-data'
import {
  analyzePlan,
  creditsFor,
  evaluateRequirements,
  generateDegreePlan,
  type PlanIssue,
} from './planner-engine'
import { useAuth } from './auth-context'
import { loadPlannerState, savePlannerState } from './supabase-data'

const STORAGE_KEY = 'sf-planner-v3'
const LEGACY_STORAGE_KEY = 'sf-planner-v2'

const LEGACY_PROGRAM_IDS: Record<string, string> = {
  'bsc-math': 'bsc-mathematics',
  'bsc-earth': 'bsc-earth-sciences',
  'bba-general': 'bcomm',
  'bba-accounting': 'bcomm',
}

function newScenario(
  name: string,
  programId: string,
  startYear: number,
  startTerm: Term,
  completed: CompletedEntry[] = [],
): PlannerScenario {
  const program = getProgram(programId)
  const generated = generateDegreePlan(programId, startYear, startTerm, completed)

  return {
    id: crypto.randomUUID(),
    name,
    termSlots: generated.termSlots,
    completed,
    declaredPrograms: [programId],
    createdAt: new Date().toISOString(),
    universityId: program?.universityId ?? 'mun',
    catalogYear: program?.catalogYear ?? MUN_CATALOG_YEAR,
    startTerm,
  }
}

function migrateScenario(scenario: PlannerScenario): PlannerScenario | null {
  const originalProgramId = scenario.declaredPrograms[0]
  const programId = LEGACY_PROGRAM_IDS[originalProgramId] ?? originalProgramId
  const program = getProgram(programId)
  if (!program) return null

  const firstSlot = scenario.termSlots[0]
  const startYear = firstSlot?.year ?? new Date().getFullYear()
  const startTerm = scenario.startTerm ?? firstSlot?.term ?? 'Fall'

  if (scenario.catalogYear === program.catalogYear && scenario.universityId === program.universityId) {
    return {
      ...scenario,
      declaredPrograms: [programId],
      termSlots: scenario.termSlots.map((slot, index) => ({
        ...slot,
        relativeYear: slot.relativeYear ?? Math.floor(index / 3) + 1,
      })),
    }
  }

  const regenerated = generateDegreePlan(programId, startYear, startTerm, scenario.completed)
  return {
    ...scenario,
    termSlots: regenerated.termSlots,
    declaredPrograms: [programId],
    universityId: program.universityId,
    catalogYear: program.catalogYear,
    startTerm,
  }
}

function normalizeState(input: PlannerState): PlannerState {
  const scenarios = input.scenarios.map(migrateScenario).filter((scenario): scenario is PlannerScenario => Boolean(scenario))
  const activeScenarioId = scenarios.some((scenario) => scenario.id === input.activeScenarioId)
    ? input.activeScenarioId
    : scenarios[0]?.id ?? ''

  return {
    scenarios,
    activeScenarioId,
    wizardDone: input.wizardDone && scenarios.length > 0,
  }
}

function loadState(): PlannerState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    return normalizeState(JSON.parse(raw) as PlannerState)
  } catch {
    return null
  }
}

export type PrereqWarning = PlanIssue
export { evaluateRequirements }

export function checkPrerequisites(scenario: PlannerScenario): PrereqWarning[] {
  return analyzePlan(scenario)
}

interface PlannerStore {
  scenarios: PlannerScenario[]
  activeScenarioId: string
  activeScenario: PlannerScenario
  wizardDone: boolean
  completeWizard: (programId: string, startYear: number, startTerm: Term, priorEntries: CompletedEntry[]) => void
  resetWizard: () => void
  placeCourse: (courseCode: string, termId: string) => void
  removeCourse: (courseCode: string, termId: string) => void
  markCompleted: (entry: CompletedEntry) => void
  removeCompleted: (courseCode: string) => void
  addScenario: (name: string, fromProgramId?: string, startYear?: number, startTerm?: Term) => void
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
  const [state, setState] = useState<PlannerState>(() => loadState() ?? {
    scenarios: [],
    activeScenarioId: '',
    wizardDone: false,
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
          setState(normalizeState(remote))
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
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
          localStorage.removeItem(LEGACY_STORAGE_KEY)
        } catch {
          // Ignore storage quota and private-mode failures.
        }
      }
    }, 500)

    return () => window.clearTimeout(timer)
  }, [persistenceReady, state, user])

  const mutateActive = useCallback((mutate: (scenario: PlannerScenario) => PlannerScenario) => {
    setState((previous) => ({
      ...previous,
      scenarios: previous.scenarios.map((scenario) => scenario.id === previous.activeScenarioId ? mutate(scenario) : scenario),
    }))
  }, [])

  const completeWizard = useCallback((
    programId: string,
    startYear: number,
    startTerm: Term,
    priorEntries: CompletedEntry[],
  ) => {
    const scenario = newScenario('My Plan', programId, startYear, startTerm, priorEntries)
    setState({ scenarios: [scenario], activeScenarioId: scenario.id, wizardDone: true })
  }, [])

  const resetWizard = useCallback(() => {
    setState({ scenarios: [], activeScenarioId: '', wizardDone: false })
  }, [])

  const placeCourse = useCallback((courseCode: string, termId: string) => {
    const normalizedCode = courseCode.trim().toUpperCase().replace(/\s+/g, ' ')
    if (!normalizedCode) return

    mutateActive((scenario) => ({
      ...scenario,
      termSlots: scenario.termSlots.map((slot) => {
        if (slot.id !== termId) return { ...slot, courses: slot.courses.filter((code) => code !== normalizedCode) }
        if (slot.courses.includes(normalizedCode)) return slot
        return { ...slot, courses: [...slot.courses, normalizedCode] }
      }),
    }))
  }, [mutateActive])

  const removeCourse = useCallback((courseCode: string, termId: string) => {
    mutateActive((scenario) => ({
      ...scenario,
      termSlots: scenario.termSlots.map((slot) => slot.id === termId
        ? { ...slot, courses: slot.courses.filter((code) => code !== courseCode) }
        : slot),
    }))
  }, [mutateActive])

  const markCompleted = useCallback((entry: CompletedEntry) => {
    mutateActive((scenario) => ({
      ...scenario,
      completed: [...scenario.completed.filter((course) => course.courseCode !== entry.courseCode), entry],
      termSlots: scenario.termSlots.map((slot) => ({
        ...slot,
        courses: slot.courses.filter((code) => code !== entry.courseCode),
      })),
    }))
  }, [mutateActive])

  const removeCompleted = useCallback((courseCode: string) => {
    mutateActive((scenario) => ({
      ...scenario,
      completed: scenario.completed.filter((course) => course.courseCode !== courseCode),
    }))
  }, [mutateActive])

  const addScenario = useCallback((
    name: string,
    fromProgramId?: string,
    startYear?: number,
    startTerm?: Term,
  ) => {
    const source = state.scenarios.find((scenario) => scenario.id === state.activeScenarioId) ?? state.scenarios[0]
    const programId = fromProgramId ?? source?.declaredPrograms[0] ?? 'bsc-cs'
    const year = startYear ?? source?.termSlots[0]?.year ?? new Date().getFullYear()
    const term = startTerm ?? source?.startTerm ?? source?.termSlots[0]?.term ?? 'Fall'
    const scenario = newScenario(name, programId, year, term)

    setState((previous) => ({
      ...previous,
      scenarios: [...previous.scenarios, scenario],
      activeScenarioId: scenario.id,
    }))
  }, [state.activeScenarioId, state.scenarios])

  const duplicateScenario = useCallback((id: string, name: string) => {
    setState((previous) => {
      const source = previous.scenarios.find((scenario) => scenario.id === id)
      if (!source) return previous

      const copy: PlannerScenario = {
        ...structuredClone(source),
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
      }
      return { ...previous, scenarios: [...previous.scenarios, copy], activeScenarioId: copy.id }
    })
  }, [])

  const deleteScenario = useCallback((id: string) => {
    setState((previous) => {
      const remaining = previous.scenarios.filter((scenario) => scenario.id !== id)
      if (remaining.length === 0) return { scenarios: [], activeScenarioId: '', wizardDone: false }

      return {
        ...previous,
        scenarios: remaining,
        activeScenarioId: previous.activeScenarioId === id ? remaining[0].id : previous.activeScenarioId,
      }
    })
  }, [])

  const switchScenario = useCallback((id: string) => {
    setState((previous) => ({ ...previous, activeScenarioId: id }))
  }, [])

  const activeScenario = state.scenarios.find((scenario) => scenario.id === state.activeScenarioId) ?? state.scenarios[0]
  const requirements = React.useMemo(
    () => activeScenario ? evaluateRequirements(activeScenario, activeScenario.declaredPrograms) : [],
    [activeScenario],
  )
  const prereqWarnings = React.useMemo(
    () => activeScenario ? analyzePlan(activeScenario) : [],
    [activeScenario],
  )
  const totalCreditsEarned = activeScenario?.completed.reduce(
    (total, entry) => total + creditsFor(entry.courseCode, activeScenario.completed),
    0,
  ) ?? 0
  const totalCreditsPlanned = activeScenario?.termSlots.flatMap((slot) => slot.courses).reduce(
    (total, code) => total + creditsFor(code, activeScenario.completed),
    0,
  ) ?? 0

  return (
    <PlannerContext.Provider value={{
      scenarios: state.scenarios,
      activeScenarioId: state.activeScenarioId,
      activeScenario: activeScenario!,
      wizardDone: state.wizardDone,
      completeWizard,
      resetWizard,
      placeCourse,
      removeCourse,
      markCompleted,
      removeCompleted,
      addScenario,
      duplicateScenario,
      deleteScenario,
      switchScenario,
      requirements,
      prereqWarnings,
      totalCreditsEarned,
      totalCreditsPlanned,
    }}>
      {children}
    </PlannerContext.Provider>
  )
}

export function usePlanner() {
  const context = useContext(PlannerContext)
  if (!context) throw new Error('usePlanner must be inside PlannerProvider')
  return context
}
