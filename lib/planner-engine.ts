import { getCourse, getProgram } from './planner-data'
import type {
  CompletedEntry,
  PlannerProgram,
  PlannerRequirement,
  PlannerScenario,
  PrereqNode,
  RequirementSatisfaction,
  Term,
  TermSlot,
} from './planner-types'

export interface GeneratedDegreePlan {
  termSlots: TermSlot[]
  autoPlannedCourses: string[]
  unscheduledCourses: string[]
}

export interface PlanIssue {
  course: string
  termId: string
  message: string
  kind: 'prerequisite' | 'corequisite' | 'availability' | 'mutual-exclusion' | 'duplicate' | 'overload' | 'unverified-course'
  severity: 'warning' | 'error'
}

function nextTerm(term: Term, year: number): { term: Term; year: number } {
  if (term === 'Winter') return { term: 'Spring', year }
  if (term === 'Spring') return { term: 'Fall', year }
  return { term: 'Winter', year: year + 1 }
}

export function createTermSlots(startYear: number, startTerm: Term, typicalYears = 4): TermSlot[] {
  const slots: TermSlot[] = []
  let term = startTerm
  let year = startYear

  for (let index = 0; index < typicalYears * 3; index++) {
    slots.push({
      id: `${term}-${year}`,
      term,
      year,
      relativeYear: Math.floor(index / 3) + 1,
      courses: [],
    })
    const next = nextTerm(term, year)
    term = next.term
    year = next.year
  }

  return slots
}

export function creditsFor(code: string, completed?: CompletedEntry[]): number {
  return getCourse(code)?.creditHours
    ?? completed?.find((entry) => entry.courseCode === code)?.creditHours
    ?? 0
}

function chooseRequirementGroup(requirement: PlannerRequirement, completedCodes: Set<string>): string[] {
  const groups = requirement.choices ?? []
  if (groups.length === 0) return []

  return [...groups].sort((left, right) => {
    const rightMatches = right.filter((code) => completedCodes.has(code)).length
    const leftMatches = left.filter((code) => completedCodes.has(code)).length
    return rightMatches - leftMatches
  })[0]
}

function collectAutoPlanCourses(program: PlannerProgram, completedCodes: Set<string>): Set<string> {
  const courses = new Set<string>()

  for (const requirement of program.requirements) {
    if (requirement.autoPlan === false) continue
    if (requirement.ruleType === 'SPECIFIC_COURSES') {
      requirement.courses?.forEach((code) => courses.add(code))
    } else if (requirement.ruleType === 'CHOICE') {
      chooseRequirementGroup(requirement, completedCodes).forEach((code) => courses.add(code))
    }
  }

  return courses
}

function prerequisiteSatisfiedForPlanning(
  node: PrereqNode | undefined,
  availableBefore: Set<string>,
  completedGrades: Map<string, number>,
): boolean {
  if (!node) return true

  switch (node.type) {
    case 'COURSE':
      return Boolean(node.course && availableBefore.has(node.course))
    case 'MIN_GRADE': {
      if (!node.course || !availableBefore.has(node.course)) return false
      const recordedGrade = completedGrades.get(node.course)
      return recordedGrade === undefined || recordedGrade >= (node.minGrade ?? 0)
    }
    case 'PROGRAM_ADMISSION':
      return true
    case 'AND':
      return (node.children ?? []).every((child) => prerequisiteSatisfiedForPlanning(child, availableBefore, completedGrades))
    case 'OR':
      return (node.children ?? []).some((child) => prerequisiteSatisfiedForPlanning(child, availableBefore, completedGrades))
    default:
      return true
  }
}

function preferredCorequisiteGroup(
  groups: string[][] | undefined,
  availableBefore: Set<string>,
  pending: Set<string>,
): string[] {
  if (!groups?.length) return []

  return groups.find((group) => group.every((code) => availableBefore.has(code)))
    ?? groups.find((group) => group.every((code) => availableBefore.has(code) || pending.has(code)))
    ?? []
}

function collectCourseBundle(
  code: string,
  pending: Set<string>,
  availableWithCurrentTerm: Set<string>,
  bundle = new Set<string>(),
): Set<string> {
  if (bundle.has(code) || availableWithCurrentTerm.has(code) || !pending.has(code)) return bundle
  bundle.add(code)

  const course = getCourse(code)
  for (const corequisite of course?.corequisites ?? []) {
    collectCourseBundle(corequisite, pending, availableWithCurrentTerm, bundle)
  }
  for (const corequisite of preferredCorequisiteGroup(course?.corequisiteChoices, availableWithCurrentTerm, pending)) {
    collectCourseBundle(corequisite, pending, availableWithCurrentTerm, bundle)
  }

  return bundle
}

function bundleCanBeScheduled(
  bundle: Set<string>,
  availableBefore: Set<string>,
  currentTermCodes: Set<string>,
  completedGrades: Map<string, number>,
): boolean {
  for (const code of bundle) {
    const course = getCourse(code)
    if (!course || !prerequisiteSatisfiedForPlanning(course.prerequisites, availableBefore, completedGrades)) return false

    const availableWithBundle = new Set([...availableBefore, ...currentTermCodes, ...bundle])
    if ((course.corequisites ?? []).some((corequisite) => !availableWithBundle.has(corequisite))) return false
    if (course.corequisiteChoices?.length) {
      const hasChoice = course.corequisiteChoices.some((group) => group.every((corequisite) => availableWithBundle.has(corequisite)))
      if (!hasChoice) return false
    }
  }

  return true
}

function dependencyScore(code: string, pending: Set<string>): number {
  let score = 0

  function references(node: PrereqNode | undefined): boolean {
    if (!node) return false
    if ((node.type === 'COURSE' || node.type === 'MIN_GRADE') && node.course === code) return true
    return (node.children ?? []).some(references)
  }

  for (const pendingCode of pending) {
    if (references(getCourse(pendingCode)?.prerequisites)) score++
  }

  return score
}

function hasMutualExclusion(code: string, existingCodes: Set<string>): boolean {
  const course = getCourse(code)
  return (course?.mutuallyExclusiveWith ?? []).some((other) => existingCodes.has(other))
}

export function generateDegreePlan(
  programId: string,
  startYear: number,
  startTerm: Term,
  completed: CompletedEntry[] = [],
): GeneratedDegreePlan {
  const program = getProgram(programId)
  const typicalYears = program?.typicalYears ?? 4
  const termSlots = createTermSlots(startYear, startTerm, typicalYears)

  if (!program || program.planningMode !== 'verified') {
    return { termSlots, autoPlannedCourses: [], unscheduledCourses: [] }
  }

  const completedCodes = new Set(completed.map((entry) => entry.courseCode))
  const completedGrades = new Map(
    completed
      .filter((entry): entry is CompletedEntry & { grade: number } => typeof entry.grade === 'number')
      .map((entry) => [entry.courseCode, entry.grade]),
  )
  const pending = collectAutoPlanCourses(program, completedCodes)
  completedCodes.forEach((code) => pending.delete(code))

  const existingCodes = new Set(completedCodes)
  const allowedTerms = new Set(program.autoPlanTerms ?? ['Fall', 'Winter'])
  const maxCredits = program.maxCreditsPerTerm ?? 15

  for (const slot of termSlots) {
    if (!allowedTerms.has(slot.term)) continue

    const availableBefore = new Set(completedCodes)
    for (const previousSlot of termSlots) {
      if (previousSlot.id === slot.id) break
      previousSlot.courses.forEach((code) => availableBefore.add(code))
    }

    let currentLoad = 0
    let madeProgress = true

    while (madeProgress && pending.size > 0) {
      madeProgress = false
      const ordered = [...pending].sort((left, right) => {
        const scoreDifference = dependencyScore(right, pending) - dependencyScore(left, pending)
        if (scoreDifference !== 0) return scoreDifference
        const levelDifference = (getCourse(left)?.level ?? 0) - (getCourse(right)?.level ?? 0)
        return levelDifference !== 0 ? levelDifference : left.localeCompare(right)
      })

      for (const code of ordered) {
        const currentTermCodes = new Set(slot.courses)
        const availableWithCurrentTerm = new Set([...availableBefore, ...currentTermCodes])
        const bundle = collectCourseBundle(code, pending, availableWithCurrentTerm)
        const bundleCodes = [...bundle]
        const bundleCredits = bundleCodes.reduce((total, bundleCode) => total + creditsFor(bundleCode), 0)
        if (bundleCredits === 0 || currentLoad + bundleCredits > maxCredits) continue
        if (!bundleCanBeScheduled(bundle, availableBefore, currentTermCodes, completedGrades)) continue
        if (bundleCodes.some((bundleCode) => hasMutualExclusion(bundleCode, existingCodes))) continue

        for (const bundleCode of bundleCodes) {
          if (!slot.courses.includes(bundleCode)) slot.courses.push(bundleCode)
          pending.delete(bundleCode)
          existingCodes.add(bundleCode)
        }
        currentLoad += bundleCredits
        madeProgress = true
        break
      }
    }
  }

  return {
    termSlots,
    autoPlannedCourses: termSlots.flatMap((slot) => slot.courses),
    unscheduledCourses: [...pending].sort(),
  }
}

function takeThroughCreditLimit(codes: string[], requiredCredits: number, completed?: CompletedEntry[]): string[] {
  const selected: string[] = []
  let credits = 0

  for (const code of codes) {
    if (credits >= requiredCredits) break
    selected.push(code)
    credits += creditsFor(code, completed)
  }

  return selected
}

function requirementResult(
  requirement: PlannerRequirement,
  completedBy: string[],
  plannedBy: string[],
  creditsRequired: number,
  completed: CompletedEntry[],
): RequirementSatisfaction {
  const creditsCompleted = completedBy.reduce((total, code) => total + creditsFor(code, completed), 0)
  const creditsPlanned = plannedBy.reduce((total, code) => total + creditsFor(code, completed), 0)
  const creditsSatisfied = creditsCompleted + creditsPlanned

  return {
    req: requirement,
    satisfiedBy: [...completedBy, ...plannedBy],
    completedBy,
    plannedBy,
    creditsCompleted,
    creditsPlanned,
    creditsSatisfied,
    creditsRequired,
    isComplete: creditsCompleted >= creditsRequired,
    isPlanned: creditsSatisfied >= creditsRequired,
  }
}

export function evaluateRequirements(scenario: PlannerScenario, programIds: string[]): RequirementSatisfaction[] {
  const completedCodes = new Set(scenario.completed.map((entry) => entry.courseCode))
  const plannedCodes = new Set(scenario.termSlots.flatMap((slot) => slot.courses).filter((code) => !completedCodes.has(code)))
  const allCodes = new Set([...completedCodes, ...plannedCodes])
  const claimedCodes = new Set<string>()
  const results: RequirementSatisfaction[] = []

  for (const programId of programIds) {
    const program = getProgram(programId)
    if (!program) continue

    for (const requirement of program.requirements) {
      if (requirement.ruleType === 'TOTAL_CREDITS') {
        const completedBy = [...completedCodes]
        const plannedBy = [...plannedCodes]
        results.push(requirementResult(requirement, completedBy, plannedBy, requirement.creditHours ?? 0, scenario.completed))
        continue
      }

      if (requirement.ruleType === 'MANUAL') {
        results.push(requirementResult(requirement, [], [], requirement.creditHours ?? 0, scenario.completed))
        continue
      }

      const eligible = (code: string) => allCodes.has(code) && (requirement.allowsDoubleCounting || !claimedCodes.has(code))
      let selectedCodes: string[] = []
      let creditsRequired = requirement.creditHours ?? 0

      if (requirement.ruleType === 'SPECIFIC_COURSES') {
        const requiredCourses = requirement.courses ?? []
        selectedCodes = requiredCourses.filter(eligible)
        creditsRequired = requiredCourses.reduce((total, code) => total + creditsFor(code, scenario.completed), 0)
      } else if (requirement.ruleType === 'CHOICE') {
        const choices = requirement.choices ?? []
        const rankedChoices = [...choices].sort((left, right) => {
          const rightMatches = right.filter(eligible).length
          const leftMatches = left.filter(eligible).length
          return rightMatches - leftMatches
        })
        const selectedChoice = rankedChoices[0] ?? []
        selectedCodes = selectedChoice.filter(eligible)
        creditsRequired = selectedChoice.reduce((total, code) => total + creditsFor(code, scenario.completed), 0)
      } else if (requirement.ruleType === 'CREDIT_HOURS_FROM_SET') {
        const matching = (requirement.candidateCourses ?? []).filter(eligible)
        const completedFirst = [...matching].sort((left, right) => Number(completedCodes.has(right)) - Number(completedCodes.has(left)))
        selectedCodes = takeThroughCreditLimit(completedFirst, creditsRequired, scenario.completed)
      } else if (requirement.ruleType === 'CREDIT_HOURS_AT_LEVEL') {
        const matching = [...allCodes].filter((code) => {
          if (!eligible(code)) return false
          const course = getCourse(code)
          if (!course) return false
          return course.department === requirement.fromDepartment
            && course.level >= (requirement.fromLevelMin ?? 0)
            && course.level <= (requirement.fromLevelMax ?? Number.POSITIVE_INFINITY)
        })
        const completedFirst = matching.sort((left, right) => Number(completedCodes.has(right)) - Number(completedCodes.has(left)))
        selectedCodes = takeThroughCreditLimit(completedFirst, creditsRequired, scenario.completed)
      }

      const completedBy = selectedCodes.filter((code) => completedCodes.has(code))
      const plannedBy = selectedCodes.filter((code) => plannedCodes.has(code))
      const result = requirementResult(requirement, completedBy, plannedBy, creditsRequired, scenario.completed)
      results.push(result)

      if (!requirement.allowsDoubleCounting) {
        result.satisfiedBy.forEach((code) => claimedCodes.add(code))
      }
    }
  }

  return results
}

function missingPrerequisites(
  node: PrereqNode | undefined,
  availableBefore: Set<string>,
  completedCodes: Set<string>,
  completedGrades: Map<string, number>,
): string[] {
  if (!node) return []

  switch (node.type) {
    case 'COURSE':
      return node.course && !availableBefore.has(node.course) ? [node.course] : []
    case 'MIN_GRADE': {
      if (!node.course || !availableBefore.has(node.course)) return node.course ? [`${node.course} (minimum ${node.minGrade}%)`] : []
      const grade = completedGrades.get(node.course)
      if (grade === undefined) {
        return completedCodes.has(node.course)
          ? [`${node.course} grade is not recorded (minimum ${node.minGrade}%)`]
          : []
      }
      return grade < (node.minGrade ?? 0) ? [`${node.course} recorded at ${grade}% (minimum ${node.minGrade}%)`] : []
    }
    case 'PROGRAM_ADMISSION':
      return []
    case 'AND':
      return (node.children ?? []).flatMap((child) => missingPrerequisites(child, availableBefore, completedCodes, completedGrades))
    case 'OR': {
      const alternatives = (node.children ?? []).map((child) => missingPrerequisites(child, availableBefore, completedCodes, completedGrades))
      if (alternatives.some((missing) => missing.length === 0)) return []
      return alternatives.sort((left, right) => left.length - right.length)[0] ?? []
    }
    default:
      return []
  }
}

export function analyzePlan(scenario: PlannerScenario): PlanIssue[] {
  const issues: PlanIssue[] = []
  const completedCodes = new Set(scenario.completed.map((entry) => entry.courseCode))
  const completedGrades = new Map(
    scenario.completed
      .filter((entry): entry is CompletedEntry & { grade: number } => typeof entry.grade === 'number')
      .map((entry) => [entry.courseCode, entry.grade]),
  )
  const allPlanCodes = new Set(scenario.termSlots.flatMap((slot) => slot.courses))
  const allCodes = new Set([...completedCodes, ...allPlanCodes])
  const seen = new Set(completedCodes)
  const program = getProgram(scenario.declaredPrograms[0] ?? '')
  const maxCredits = program?.maxCreditsPerTerm ?? 15

  for (const entry of scenario.completed) {
    if (getCourse(entry.courseCode)) continue
    issues.push({
      course: entry.courseCode,
      termId: entry.term,
      message: entry.creditHours === undefined
        ? 'Completed course is outside the verified catalog subset; its credits and constraints are not counted'
        : `Completed course is outside the verified catalog subset; ${entry.creditHours} recorded credits are counted but constraints are not checked`,
      kind: 'unverified-course',
      severity: 'warning',
    })
  }

  for (let index = 0; index < scenario.termSlots.length; index++) {
    const slot = scenario.termSlots[index]
    const availableBefore = new Set(completedCodes)
    scenario.termSlots.slice(0, index).forEach((previous) => previous.courses.forEach((code) => availableBefore.add(code)))
    const availableWithTerm = new Set([...availableBefore, ...slot.courses])
    const termLoad = slot.courses.reduce((total, code) => total + creditsFor(code, scenario.completed), 0)

    if (termLoad > maxCredits) {
      issues.push({
        course: 'Term load',
        termId: slot.id,
        message: `${termLoad} credits exceeds the ${maxCredits}-credit planning limit`,
        kind: 'overload',
        severity: 'warning',
      })
    }

    for (const code of slot.courses) {
      const course = getCourse(code)
      if (!course) {
        issues.push({
          course: code,
          termId: slot.id,
          message: 'Course is outside the verified catalog subset; credits and constraints are not counted',
          kind: 'unverified-course',
          severity: 'warning',
        })
        seen.add(code)
        continue
      }

      if (seen.has(code)) {
        issues.push({ course: code, termId: slot.id, message: 'Course appears more than once in this plan', kind: 'duplicate', severity: 'error' })
      }

      const missing = missingPrerequisites(course.prerequisites, availableBefore, completedCodes, completedGrades)
      if (missing.length > 0) {
        const gradeUnverified = missing.every((requirement) => requirement.includes('grade is not recorded'))
        issues.push({
          course: code,
          termId: slot.id,
          message: gradeUnverified
            ? `Prerequisite grade needs verification: ${missing.join(', ')}`
            : `Missing or unresolved prerequisite: ${missing.join(', ')}`,
          kind: 'prerequisite',
          severity: gradeUnverified ? 'warning' : 'error',
        })
      }

      const missingCorequisites = (course.corequisites ?? []).filter((corequisite) => !availableWithTerm.has(corequisite))
      if (missingCorequisites.length > 0) {
        issues.push({
          course: code,
          termId: slot.id,
          message: `Missing corequisite: ${missingCorequisites.join(', ')}`,
          kind: 'corequisite',
          severity: 'error',
        })
      }

      if (course.corequisiteChoices?.length) {
        const choiceSatisfied = course.corequisiteChoices.some((group) => group.every((corequisite) => availableWithTerm.has(corequisite)))
        if (!choiceSatisfied) {
          issues.push({
            course: code,
            termId: slot.id,
            message: `Missing corequisite option: ${course.corequisiteChoices.map((group) => group.join(' + ')).join(' or ')}`,
            kind: 'corequisite',
            severity: 'error',
          })
        }
      }

      if (course.typicalAvailability?.length && !course.typicalAvailability.includes(slot.term)) {
        issues.push({
          course: code,
          termId: slot.id,
          message: `Catalog snapshot does not list ${slot.term} as a typical offering`,
          kind: 'availability',
          severity: 'warning',
        })
      }

      const conflict = (course.mutuallyExclusiveWith ?? []).find((other) => allCodes.has(other))
      if (conflict) {
        issues.push({
          course: code,
          termId: slot.id,
          message: `Credit restriction with ${conflict}`,
          kind: 'mutual-exclusion',
          severity: 'error',
        })
      }

      seen.add(code)
    }
  }

  return issues
}
