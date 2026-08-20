export type Term = 'Fall' | 'Winter' | 'Spring'
export type ReqCategory = 'core' | 'elective_upper' | 'elective_senior' | 'math' | 'stat' | 'science' | 'breadth_writing' | 'breadth_humanities' | 'breadth_social' | 'breadth_science' | 'lab' | 'free' | 'professional' | 'capstone'
export type RuleType = 'SPECIFIC_COURSES' | 'CREDIT_HOURS_FROM_SET' | 'CREDIT_HOURS_AT_LEVEL' | 'CHOICE'

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
  typicalAvailability: Term[]
  mutuallyExclusiveWith?: string[]
  professors?: string[]
  hasLab?: boolean
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
  note?: string
}

export interface PlannerProgram {
  id: string
  facultyId: string
  name: string
  degreeType: 'BSc' | 'BA' | 'BEng' | 'BBA' | 'BNurs' | 'BSW' | 'Minor' | 'Certificate'
  totalCreditHoursRequired: number
  typicalYears: number
  description: string
  highlights: string[]
  requirements: PlannerRequirement[]
}

export interface Faculty {
  id: string
  name: string
  shortName: string
  emoji: string
  color: string          // tailwind bg class
  textColor: string      // tailwind text class
  borderColor: string
  description: string
  programs: string[]     // program ids
}

export interface CompletedEntry {
  courseCode: string
  grade: number
  letterGrade: string
  term: string
  isTransfer?: boolean
}

export interface TermSlot {
  id: string
  term: Term
  year: number
  courses: string[]
}

export interface PlannerScenario {
  id: string
  name: string
  termSlots: TermSlot[]
  completed: CompletedEntry[]
  declaredPrograms: string[]
  createdAt: string
}

export interface PlannerState {
  scenarios: PlannerScenario[]
  activeScenarioId: string
  wizardDone: boolean
}

export interface RequirementSatisfaction {
  req: PlannerRequirement
  satisfiedBy: string[]
  creditsSatisfied: number
  creditsRequired: number
  isComplete: boolean
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
}

export interface SuggestedCourse {
  courseCode: string
  term: Term
  relativeYear: number   // 1, 2, 3, 4
}
