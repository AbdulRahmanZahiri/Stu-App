export type Term = 'Fall' | 'Winter' | 'Spring'

export type ReqCategory =
  | 'core'
  | 'elective_upper'
  | 'elective_senior'
  | 'math'
  | 'stat'
  | 'science'
  | 'breadth_writing'
  | 'breadth_humanities'
  | 'breadth_social'
  | 'breadth_science'
  | 'lab'
  | 'free'
  | 'professional'
  | 'capstone'
  | 'degree_total'

export type RuleType =
  | 'SPECIFIC_COURSES'
  | 'CREDIT_HOURS_FROM_SET'
  | 'CREDIT_HOURS_AT_LEVEL'
  | 'CHOICE'
  | 'TOTAL_CREDITS'
  | 'MANUAL'

export interface PrereqNode {
  type: 'AND' | 'OR' | 'COURSE' | 'MIN_GRADE' | 'PROGRAM_ADMISSION'
  course?: string
  minGrade?: number
  children?: PrereqNode[]
  program?: string
}

export interface MUNCourse {
  code: string
  title: string
  creditHours: number
  department: string
  level: number
  description: string
  prerequisites?: PrereqNode
  corequisites?: string[]
  corequisiteChoices?: string[][]
  prerequisiteNote?: string
  typicalAvailability?: Term[]
  mutuallyExclusiveWith?: string[]
  recommendedYear?: number
  attributes?: string[]
  catalogYear: string
  officialUrl: string
}

export interface PlannerRequirement {
  id: string
  label: string
  category: ReqCategory
  ruleType: RuleType
  courses?: string[]
  creditHours?: number
  fromDepartment?: string
  fromLevelMin?: number
  fromLevelMax?: number
  candidateCourses?: string[]
  choices?: string[][]
  allowsDoubleCounting: boolean
  doubleCountCap?: number
  autoPlan?: boolean
  note?: string
}

export interface PlannerProgram {
  id: string
  universityId: string
  facultyId: string
  name: string
  degreeType: string
  totalCreditHoursRequired: number | null
  typicalYears: number | null
  description: string
  highlights: string[]
  requirements: PlannerRequirement[]
  catalogYear: string
  officialUrl: string
  planningMode: 'verified' | 'manual'
  statusNote?: string
  acceptingNewStudents?: boolean
  isExploratory?: boolean
  maxCreditsPerTerm?: number
  autoPlanTerms?: Term[]
}

export interface Faculty {
  id: string
  universityId: string
  name: string
  shortName: string
  emoji: string
  color: string
  textColor: string
  borderColor: string
  description: string
  programs: string[]
}

export interface CompletedEntry {
  courseCode: string
  grade?: number
  letterGrade?: string
  term: string
  creditHours?: number
  isTransfer?: boolean
}

export interface TermSlot {
  id: string
  term: Term
  year: number
  courses: string[]
  relativeYear?: number
}

export interface PlannerScenario {
  id: string
  name: string
  termSlots: TermSlot[]
  completed: CompletedEntry[]
  declaredPrograms: string[]
  createdAt: string
  universityId?: string
  catalogYear?: string
  startTerm?: Term
}

export interface PlannerState {
  scenarios: PlannerScenario[]
  activeScenarioId: string
  wizardDone: boolean
}

export interface RequirementSatisfaction {
  req: PlannerRequirement
  satisfiedBy: string[]
  completedBy: string[]
  plannedBy: string[]
  creditsCompleted: number
  creditsPlanned: number
  creditsSatisfied: number
  creditsRequired: number
  isComplete: boolean
  isPlanned: boolean
}

export interface University {
  id: string
  name: string
  shortName: string
  country: string
  province: string
  city: string
  emoji: string
  available: boolean
  tagline?: string
  studentCount?: string
  catalogYear: string
  officialCatalogUrl: string
  lastVerified: string
}

export interface SuggestedCourse {
  courseCode: string
  term: Term
  relativeYear: number
}
