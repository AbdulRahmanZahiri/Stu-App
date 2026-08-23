import type {
  Faculty,
  MUNCourse,
  PlannerProgram,
  PrereqNode,
  University,
} from './planner-types'

export const MUN_CATALOG_YEAR = '2025–2026'

const MUN_PROGRAM_DIRECTORY_URL = 'https://www.mun.ca/undergrad/programs/'
const MUN_SCIENCE_PROGRAMS_URL = 'https://www.mun.ca/undergrad/programs/science/bachelor-of-science/'
const MUN_HSS_PROGRAMS_URL = 'https://www.mun.ca/hss/programs/undergraduate/program-offerings/'
const MUN_BUSINESS_PROGRAMS_URL = 'https://www.mun.ca/undergrad/programs/business/'
const MUN_EDUCATION_PROGRAMS_URL = 'https://www.mun.ca/undergrad/programs/education/'
const MUN_ENGINEERING_PROGRAMS_URL = 'https://www.mun.ca/undergrad/programs/engineering/'
const MUN_HKR_PROGRAMS_URL = 'https://www.mun.ca/undergrad/programs/human-kinetics--recreation/'
const MUN_MUSIC_PROGRAMS_URL = 'https://www.mun.ca/undergrad/programs/music/'
const MUN_CS_REQUIREMENTS_URL = 'https://www.mun.ca/university-calendar/st-johns-campus/faculty-of-science/11/4/'
const MUN_CS_COURSES_URL = 'https://www.mun.ca/university-calendar/st-johns-campus/faculty-of-science/13/4/'
const MUN_MATH_COURSES_URL = 'https://www.mun.ca/university-calendar/st-johns-campus/faculty-of-science/13/9/'
const MUN_SCIENCE_CORE_URL = 'https://www.mun.ca/university-calendar/st-johns-campus/faculty-of-science/4/3/'

type CourseInput = Omit<MUNCourse, 'catalogYear' | 'officialUrl'> &
  Partial<Pick<MUNCourse, 'catalogYear' | 'officialUrl'>>

function catalogCourse(input: CourseInput): MUNCourse {
  return {
    ...input,
    catalogYear: input.catalogYear ?? MUN_CATALOG_YEAR,
    officialUrl: input.officialUrl ?? MUN_CS_COURSES_URL,
  }
}

const requiredCourse = (course: string): PrereqNode => ({ type: 'COURSE', course })
const minimumGrade = (course: string, minGrade: number): PrereqNode => ({ type: 'MIN_GRADE', course, minGrade })
const and = (...children: PrereqNode[]): PrereqNode => ({ type: 'AND', children })
const or = (...children: PrereqNode[]): PrereqNode => ({ type: 'OR', children })
const programAdmission = (program: string): PrereqNode => ({ type: 'PROGRAM_ADMISSION', program })

export const MUN_COURSES: MUNCourse[] = [
  catalogCourse({
    code: 'COMP 1001',
    title: 'Introduction to Programming',
    creditHours: 3,
    department: 'COMP',
    level: 1000,
    description: 'Programming fundamentals in Python, including data structures, algorithms, recursion, file handling, and exceptions.',
  }),
  catalogCourse({
    code: 'COMP 1002',
    title: 'Introduction to Logic for Computer Scientists',
    creditHours: 3,
    department: 'COMP',
    level: 1000,
    description: 'Propositional and predicate logic, sets, discrete structures, modular arithmetic, and counting for computer science.',
    mutuallyExclusiveWith: ['MATH 2320'],
  }),
  catalogCourse({
    code: 'COMP 1003',
    title: 'Foundations of Computing Systems',
    creditHours: 3,
    department: 'COMP',
    level: 1000,
    description: 'Foundational algorithms, data structures, theory of computing, and machine architecture.',
    prerequisites: requiredCourse('COMP 1001'),
    corequisiteChoices: [['COMP 1002'], ['MATH 2320']],
  }),
  catalogCourse({
    code: 'COMP 2001',
    title: 'Object-Oriented Programming',
    creditHours: 3,
    department: 'COMP',
    level: 2000,
    description: 'Object-oriented programming, user interfaces, event-driven programming, correctness, and refactoring.',
    prerequisites: and(
      minimumGrade('COMP 1001', 65),
      or(minimumGrade('COMP 1002', 65), minimumGrade('MATH 2320', 65)),
      requiredCourse('COMP 1003'),
      programAdmission('Computer Science, Computational Chemistry, or Data Science'),
    ),
  }),
  catalogCourse({
    code: 'COMP 2002',
    title: 'Data Structures and Algorithms',
    creditHours: 3,
    department: 'COMP',
    level: 2000,
    description: 'Efficient algorithm design and implementation using fundamental data structures.',
    prerequisites: and(
      minimumGrade('COMP 1001', 65),
      or(minimumGrade('COMP 1002', 65), minimumGrade('MATH 2320', 65)),
      requiredCourse('COMP 1003'),
      programAdmission('Computer Science, Computational Chemistry, or Data Science'),
    ),
  }),
  catalogCourse({
    code: 'COMP 2003',
    title: 'Computer Architecture',
    creditHours: 3,
    department: 'COMP',
    level: 2000,
    description: 'Computer architecture from digital logic through instruction sets and language translation.',
    prerequisites: and(
      minimumGrade('COMP 1001', 65),
      or(minimumGrade('COMP 1002', 65), minimumGrade('MATH 2320', 65)),
      requiredCourse('COMP 1003'),
      programAdmission('Computer Science major, minor, or honours'),
    ),
  }),
  catalogCourse({
    code: 'COMP 2004',
    title: 'Introduction to Operating Systems',
    creditHours: 3,
    department: 'COMP',
    level: 2000,
    description: 'Software-hardware interfaces and the design of major operating-system components.',
    prerequisites: and(
      requiredCourse('COMP 2002'),
      requiredCourse('COMP 2003'),
      programAdmission('Computer Science major or honours'),
    ),
  }),
  catalogCourse({
    code: 'COMP 2005',
    title: 'Software Engineering',
    creditHours: 3,
    department: 'COMP',
    level: 2000,
    description: 'Software processes, project management, requirements engineering, systems analysis, and design.',
    prerequisites: and(requiredCourse('COMP 2001'), programAdmission('Computer Science major or honours')),
  }),
  catalogCourse({
    code: 'COMP 2006',
    title: 'Computer Networking',
    creditHours: 1,
    department: 'COMP',
    level: 2000,
    description: 'Programming interfaces for computer networks and the protocols used by the Internet.',
    prerequisites: and(
      requiredCourse('COMP 2001'),
      requiredCourse('COMP 2002'),
      programAdmission('Computer Science major or honours'),
    ),
    corequisites: ['COMP 2004', 'COMP 2007', 'COMP 2008'],
  }),
  catalogCourse({
    code: 'COMP 2007',
    title: 'Introduction to Information Management',
    creditHours: 1,
    department: 'COMP',
    level: 2000,
    description: 'Data storage, retrieval, security, privacy, and database-system foundations.',
    prerequisites: and(
      requiredCourse('COMP 2001'),
      requiredCourse('COMP 2002'),
      programAdmission('Computer Science major or honours'),
    ),
    corequisites: ['COMP 2004', 'COMP 2006', 'COMP 2008'],
  }),
  catalogCourse({
    code: 'COMP 2008',
    title: 'Social Issues and Professional Practice',
    creditHours: 1,
    department: 'COMP',
    level: 2000,
    description: 'Ethical and social issues in computing examined through professional case studies.',
    prerequisites: and(
      requiredCourse('COMP 2001'),
      requiredCourse('COMP 2002'),
      programAdmission('Computer Science major or honours'),
    ),
    corequisites: ['COMP 2004', 'COMP 2006', 'COMP 2007'],
  }),
  catalogCourse({
    code: 'COMP 3019',
    title: 'Security and Privacy in Computer Systems',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Secure software and web development, common vulnerabilities, regulations, and privacy practices.',
    prerequisites: and(requiredCourse('COMP 2004'), requiredCourse('COMP 2005')),
  }),
  catalogCourse({
    code: 'COMP 3100',
    title: 'Web Programming',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Programming networked web systems, interactive browser content, and dynamic server pages.',
    prerequisites: and(requiredCourse('COMP 2006'), requiredCourse('COMP 2007')),
  }),
  catalogCourse({
    code: 'COMP 3150',
    title: 'Introduction to Human-Computer Interaction',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Human-centred design, interface prototyping, implementation, and evaluation methods.',
    prerequisites: requiredCourse('COMP 2001'),
  }),
  catalogCourse({
    code: 'COMP 3200',
    title: 'Algorithmic Techniques for Artificial Intelligence',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Algorithms and data structures for problem solving, reasoning, and learning in intelligent agents.',
    prerequisites: and(
      requiredCourse('COMP 2001'),
      requiredCourse('COMP 2002'),
      or(requiredCourse('STAT 2500'), requiredCourse('STAT 2550')),
    ),
  }),
  catalogCourse({
    code: 'COMP 3202',
    title: 'Introduction to Machine Learning',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Model selection, evaluation, regression, classification, and selected machine-learning methods.',
    prerequisites: and(
      or(
        requiredCourse('COMP 3200'),
        and(
          requiredCourse('COMP 2001'),
          requiredCourse('COMP 2002'),
          or(requiredCourse('STAT 2500'), requiredCourse('STAT 2550')),
        ),
      ),
      requiredCourse('MATH 2050'),
    ),
  }),
  catalogCourse({
    code: 'COMP 3300',
    title: 'Interactive Technologies',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Interaction design and prototyping for desktop, mobile, and game contexts.',
    prerequisites: requiredCourse('COMP 2001'),
  }),
  catalogCourse({
    code: 'COMP 3401',
    title: 'Introduction to Data Mining',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Core concepts and techniques for data mining and knowledge discovery.',
    prerequisites: and(
      requiredCourse('COMP 2002'),
      requiredCourse('COMP 2007'),
      or(requiredCourse('STAT 2500'), requiredCourse('STAT 2550')),
    ),
  }),
  catalogCourse({
    code: 'COMP 3600',
    title: 'Algorithm Design and Analysis',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Divide-and-conquer, greedy and dynamic algorithms, network flows, and computational intractability.',
    prerequisites: requiredCourse('COMP 2002'),
  }),
  catalogCourse({
    code: 'COMP 3602',
    title: 'Introduction to the Theory of Computation',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Models of computation, computational power, and measures of problem difficulty.',
    prerequisites: requiredCourse('COMP 2002'),
  }),
  catalogCourse({
    code: 'COMP 3730',
    title: 'Introduction to Parallel Programming',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Parallel architectures, threaded programming, synchronization, workload balancing, and cloud systems.',
    prerequisites: and(requiredCourse('COMP 2001'), requiredCourse('COMP 2004')),
  }),
  catalogCourse({
    code: 'COMP 3731',
    title: 'Introduction to Scientific Computing',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Numerical algorithms, stability, sensitivity, efficiency, and modern computer architectures.',
    prerequisites: and(requiredCourse('COMP 1001'), requiredCourse('MATH 2000'), requiredCourse('MATH 2050')),
  }),
  catalogCourse({
    code: 'COMP 3766',
    title: 'Introduction to Robotic Manipulation',
    creditHours: 3,
    department: 'COMP',
    level: 3000,
    description: 'Robot-arm kinematics, dynamics, control, programming, sensing, perception, and applied AI.',
    prerequisites: and(
      requiredCourse('COMP 2001'),
      requiredCourse('COMP 2002'),
      requiredCourse('MATH 2000'),
      requiredCourse('MATH 2050'),
      or(requiredCourse('STAT 2500'), requiredCourse('STAT 2550')),
    ),
  }),
  catalogCourse({
    code: 'COMP 4019',
    title: 'Secure System Design',
    creditHours: 3,
    department: 'COMP',
    level: 4000,
    description: 'Cryptography, advanced attacks, cloud and network security, penetration testing, and forensics.',
    prerequisites: and(requiredCourse('COMP 3019'), requiredCourse('COMP 3600')),
  }),
  catalogCourse({
    code: 'COMP 4300',
    title: 'Introduction to Game Programming',
    creditHours: 3,
    department: 'COMP',
    level: 4000,
    description: 'Rendering, animation, game AI, collision detection, physics, interfaces, and a complete game project.',
    prerequisites: and(requiredCourse('COMP 2001'), requiredCourse('MATH 2050')),
    prerequisiteNote: 'The official calendar also requires 6 credit hours in COMP courses at the 3000 level or above.',
  }),
  catalogCourse({
    code: 'COMP 4303',
    title: 'Artificial Intelligence in Computer Games',
    creditHours: 3,
    department: 'COMP',
    level: 4000,
    description: 'AI techniques for awareness, memory, decision-making, movement, and group behaviour in game agents.',
    prerequisites: requiredCourse('COMP 3200'),
  }),
  catalogCourse({
    code: 'MATH 1000',
    title: 'Calculus I',
    creditHours: 3,
    department: 'MATH',
    level: 1000,
    description: 'Differential calculus with applications to rates, curve sketching, and optimization.',
    mutuallyExclusiveWith: ['MATH 1006'],
    prerequisiteNote: 'Placement is based on MATH 1090/109B, high-school mathematics, or an accepted placement result.',
    officialUrl: MUN_MATH_COURSES_URL,
  }),
  catalogCourse({
    code: 'MATH 1006',
    title: 'Calculus for Life Sciences',
    creditHours: 3,
    department: 'MATH',
    level: 1000,
    description: 'Differential calculus with modelling applications in the life sciences.',
    mutuallyExclusiveWith: ['MATH 1000'],
    prerequisiteNote: 'Placement is based on MATH 1090/109B, high-school mathematics, or an accepted placement result.',
    officialUrl: MUN_MATH_COURSES_URL,
  }),
  catalogCourse({
    code: 'MATH 1001',
    title: 'Calculus II',
    creditHours: 3,
    department: 'MATH',
    level: 1000,
    description: 'Integral calculus, techniques of integration, improper integrals, differential equations, and applications.',
    prerequisites: or(requiredCourse('MATH 1000'), requiredCourse('MATH 1006')),
    officialUrl: MUN_MATH_COURSES_URL,
  }),
  catalogCourse({
    code: 'MATH 2000',
    title: 'Calculus III',
    creditHours: 3,
    department: 'MATH',
    level: 2000,
    description: 'Infinite series and differential and integral calculus of multivariable functions.',
    prerequisites: requiredCourse('MATH 1001'),
    officialUrl: MUN_MATH_COURSES_URL,
  }),
  catalogCourse({
    code: 'MATH 2050',
    title: 'Linear Algebra I',
    creditHours: 3,
    department: 'MATH',
    level: 2000,
    description: 'Vectors, complex numbers, linear transformations, matrices, determinants, and linear systems.',
    prerequisites: or(requiredCourse('MATH 1000'), requiredCourse('MATH 1001'), requiredCourse('MATH 1006')),
    prerequisiteNote: 'The official calendar also permits suitable placement or other first-year mathematics credit.',
    officialUrl: MUN_MATH_COURSES_URL,
  }),
  catalogCourse({
    code: 'MATH 2320',
    title: 'Discrete Mathematics',
    creditHours: 3,
    department: 'MATH',
    level: 2000,
    description: 'Logic, proof, sets, functions, relations, induction, counting, and elementary probability.',
    prerequisites: or(requiredCourse('MATH 1001'), requiredCourse('MATH 2050')),
    mutuallyExclusiveWith: ['COMP 1002'],
    officialUrl: MUN_MATH_COURSES_URL,
  }),
  catalogCourse({
    code: 'STAT 2500',
    title: 'Statistical Foundations for Data Analytics',
    creditHours: 3,
    department: 'STAT',
    level: 2000,
    description: 'Probability, distributions, data visualization, estimation, hypothesis testing, and regression using statistical software.',
    prerequisites: or(
      requiredCourse('MATH 1000'),
      requiredCourse('MATH 1001'),
      requiredCourse('MATH 1006'),
      requiredCourse('MATH 2050'),
    ),
    prerequisiteNote: 'The official calendar also permits other Mathematics or Statistics credit, or an accepted placement result.',
    mutuallyExclusiveWith: ['STAT 2550'],
    officialUrl: MUN_MATH_COURSES_URL,
  }),
  catalogCourse({
    code: 'STAT 2550',
    title: 'Statistics for Science Students',
    creditHours: 3,
    department: 'STAT',
    level: 2000,
    description: 'Applied descriptive statistics, probability, estimation, testing, analysis of variance, correlation, and regression.',
    prerequisites: or(requiredCourse('MATH 1000'), requiredCourse('MATH 1006')),
    mutuallyExclusiveWith: ['STAT 2500'],
    officialUrl: MUN_MATH_COURSES_URL,
  }),
]

interface DirectoryProgramOptions {
  totalCreditHoursRequired?: number | null
  typicalYears?: number | null
  description?: string
  highlights?: string[]
  acceptingNewStudents?: boolean
  isExploratory?: boolean
}

function directoryProgram(
  id: string,
  facultyId: string,
  name: string,
  degreeType: string,
  officialUrl: string,
  options: DirectoryProgramOptions = {},
): PlannerProgram {
  const totalCreditHoursRequired = options.totalCreditHoursRequired === undefined
    ? 120
    : options.totalCreditHoursRequired

  return {
    id,
    universityId: 'mun',
    facultyId,
    name,
    degreeType,
    totalCreditHoursRequired,
    typicalYears: options.typicalYears === undefined ? 4 : options.typicalYears,
    description: options.description ?? 'This is an official Memorial program listing. Detailed requirements have not yet been mapped into ScholarFlow.',
    highlights: options.highlights ?? ['Official MUN listing', 'Manual planning mode'],
    requirements: totalCreditHoursRequired === null
      ? []
      : [{
          id: `${id}-total`,
          label: 'Total degree credit hours',
          category: 'degree_total',
          ruleType: 'TOTAL_CREDITS',
          creditHours: totalCreditHoursRequired,
          allowsDoubleCounting: true,
          autoPlan: false,
          note: 'Credit totals do not replace the official program audit.',
        }],
    catalogYear: 'Current MUN program directory',
    officialUrl,
    planningMode: 'manual',
    statusNote: 'Program name is source-backed; course-level degree requirements are not yet mapped.',
    acceptingNewStudents: options.acceptingNewStudents,
    isExploratory: options.isExploratory,
  }
}

const computerScienceBscProgram: PlannerProgram = {
  id: 'bsc-cs',
  universityId: 'mun',
  facultyId: 'science',
  name: 'Computer Science',
  degreeType: 'B.Sc.',
  totalCreditHoursRequired: 120,
  typicalYears: 4,
  description: 'The official Memorial Computer Science major requirements combined with the Bachelor of Science core rules.',
  highlights: ['Catalog rules mapped', 'Prerequisite-aware plan', 'Competitive major admission'],
  catalogYear: MUN_CATALOG_YEAR,
  officialUrl: MUN_CS_REQUIREMENTS_URL,
  planningMode: 'verified',
  statusNote: 'Requirements are mapped from the official 2025–2026 Calendar. Future course offerings must still be confirmed.',
  maxCreditsPerTerm: 15,
  autoPlanTerms: ['Fall', 'Winter'],
  requirements: [
    {
      id: 'bsc-total',
      label: '120 credit hours for the degree',
      category: 'degree_total',
      ruleType: 'TOTAL_CREDITS',
      creditHours: 120,
      allowsDoubleCounting: true,
      autoPlan: false,
      note: 'Official Faculty of Science degree total.',
    },
    {
      id: 'comp-core',
      label: 'Computer Science core',
      category: 'core',
      ruleType: 'SPECIFIC_COURSES',
      courses: ['COMP 1001', 'COMP 1002', 'COMP 1003', 'COMP 2001', 'COMP 2002', 'COMP 2003', 'COMP 2004', 'COMP 2005', 'COMP 2006', 'COMP 2007', 'COMP 2008'],
      allowsDoubleCounting: false,
      autoPlan: true,
    },
    {
      id: 'comp-senior',
      label: '6 additional COMP credits at the 4000 level',
      category: 'elective_senior',
      ruleType: 'CREDIT_HOURS_AT_LEVEL',
      creditHours: 6,
      fromDepartment: 'COMP',
      fromLevelMin: 4000,
      allowsDoubleCounting: false,
      autoPlan: false,
      note: 'Choose actual courses after checking the current offering schedule.',
    },
    {
      id: 'comp-upper',
      label: '12 additional COMP credits at the 3000 level or above',
      category: 'elective_upper',
      ruleType: 'CREDIT_HOURS_AT_LEVEL',
      creditHours: 12,
      fromDepartment: 'COMP',
      fromLevelMin: 3000,
      allowsDoubleCounting: false,
      autoPlan: false,
      note: 'These are additional to the 4000-level requirement.',
    },
    {
      id: 'math-calculus',
      label: 'MATH 1000 or MATH 1006',
      category: 'math',
      ruleType: 'CHOICE',
      choices: [['MATH 1000'], ['MATH 1006']],
      allowsDoubleCounting: false,
      autoPlan: true,
    },
    {
      id: 'math-core',
      label: 'MATH 1001, MATH 2000, and MATH 2050',
      category: 'math',
      ruleType: 'SPECIFIC_COURSES',
      courses: ['MATH 1001', 'MATH 2000', 'MATH 2050'],
      allowsDoubleCounting: false,
      autoPlan: true,
    },
    {
      id: 'statistics',
      label: 'STAT 2500 or STAT 2550',
      category: 'stat',
      ruleType: 'CHOICE',
      choices: [['STAT 2550'], ['STAT 2500']],
      allowsDoubleCounting: false,
      autoPlan: true,
    },
    {
      id: 'bsc-crw',
      label: '6 CRW credits, including at least 3 ENGL credits',
      category: 'breadth_writing',
      ruleType: 'MANUAL',
      creditHours: 6,
      allowsDoubleCounting: false,
      autoPlan: false,
      note: 'Select currently approved Critical Reading and Writing courses from the official calendar.',
    },
    {
      id: 'bsc-science-breadth',
      label: 'Science breadth across two subject areas',
      category: 'breadth_science',
      ruleType: 'MANUAL',
      creditHours: 12,
      allowsDoubleCounting: true,
      autoPlan: false,
      note: 'The B.Sc. core requires 6 credits in each of two Science subject areas other than Mathematics and Statistics. COMP may satisfy one area.',
    },
    {
      id: 'bsc-science-total',
      label: 'At least 78 Science credit hours',
      category: 'science',
      ruleType: 'MANUAL',
      creditHours: 78,
      allowsDoubleCounting: true,
      autoPlan: false,
      note: 'This requirement also includes minimum subject-breadth rules; verify the final audit with an advisor.',
    },
  ],
}

export const MUN_PROGRAMS: PlannerProgram[] = [
  directoryProgram('bsc-undecided', 'science', 'Bachelor of Science — Undeclared', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL, {
    isExploratory: true,
    description: 'For students exploring current MUN Science majors before declaring a program.',
  }),
  directoryProgram('bsc-behavioural-neuroscience', 'science', 'Behavioural Neuroscience', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-biology', 'science', 'Biology', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-chemistry', 'science', 'Chemistry', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-biological-chemistry', 'science', 'Chemistry (Biological)', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-computational-chemistry', 'science', 'Computational Chemistry', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  computerScienceBscProgram,
  directoryProgram('bsc-data-science', 'science', 'Data Science', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-earth-sciences', 'science', 'Earth Sciences', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-economics', 'science', 'Economics', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-environmental-physics', 'science', 'Environmental Physics', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-geography', 'science', 'Geography', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-human-biosciences', 'science', 'Human Biosciences', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-marine-biology', 'science', 'Marine Biology', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-mathematics', 'science', 'Mathematics', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-ocean-physics', 'science', 'Ocean Physics', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-ocean-sciences', 'science', 'Ocean Sciences', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-ocean-environmental-systems', 'science', 'Ocean Sciences (Environmental Systems)', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-physics', 'science', 'Physics', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-psychology', 'science', 'Psychology', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),
  directoryProgram('bsc-statistics', 'science', 'Statistics', 'B.Sc.', MUN_SCIENCE_PROGRAMS_URL),

  directoryProgram('ba-undecided', 'arts', 'Bachelor of Arts — Undeclared', 'B.A.', MUN_HSS_PROGRAMS_URL, {
    isExploratory: true,
    description: 'For students exploring current Humanities and Social Sciences majors before declaring a program.',
  }),
  directoryProgram('ba-anthropology', 'arts', 'Anthropology', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-archaeology', 'arts', 'Archaeology', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-classics', 'arts', 'Classics', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-communication-media', 'arts', 'Communication and Media Studies', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-criminology', 'arts', 'Criminology', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-economics', 'arts', 'Economics', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-english', 'arts', 'English', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-folklore', 'arts', 'Folklore', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-french', 'arts', 'French', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-geography', 'arts', 'Geography', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-gender-studies', 'arts', 'Gender Studies', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-german', 'arts', 'German Language and Literature', 'B.A.', MUN_HSS_PROGRAMS_URL, {
    acceptingNewStudents: false,
    description: 'Official MUN listing; the major is currently not accepting new students.',
  }),
  directoryProgram('ba-history', 'arts', 'History', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-law-public-policy', 'arts', 'Law and Public Policy', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-linguistics', 'arts', 'Linguistics', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-medieval-early-modern', 'arts', 'Medieval and Early Modern Studies', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-modern-language-studies', 'arts', 'Modern Language Studies', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-philosophy', 'arts', 'Philosophy', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-political-science', 'arts', 'Political Science', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-religion-culture', 'arts', 'Religion and Culture', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-sociology', 'arts', 'Sociology', 'B.A.', MUN_HSS_PROGRAMS_URL),
  directoryProgram('ba-spanish', 'arts', 'Spanish', 'B.A.', MUN_HSS_PROGRAMS_URL, {
    acceptingNewStudents: false,
    description: 'Official MUN listing; the major is currently not accepting new students.',
  }),
  directoryProgram('ba-computer-science', 'arts', 'Computer Science', 'B.A.', MUN_CS_REQUIREMENTS_URL, {
    description: 'Memorial lists Computer Science as a major eligible for the Bachelor of Arts. The B.A. degree rules are not yet mapped into ScholarFlow.',
  }),
  directoryProgram('iba', 'arts', 'International Bachelor of Arts', 'I.B.A.', MUN_PROGRAM_DIRECTORY_URL),

  directoryProgram('business-one', 'business', 'Business One', 'Pre-program', MUN_BUSINESS_PROGRAMS_URL, {
    totalCreditHoursRequired: 30,
    typicalYears: 1,
    isExploratory: true,
    description: 'The common first-year entry pathway for Memorial undergraduate business students.',
  }),
  directoryProgram('bcomm', 'business', 'Bachelor of Commerce', 'B.Comm.', MUN_BUSINESS_PROGRAMS_URL, {
    description: 'Memorial’s 40-course, 120-credit Bachelor of Commerce program.',
  }),
  directoryProgram('bcomm-coop', 'business', 'Bachelor of Commerce (Co-operative)', 'B.Comm. (Co-op)', MUN_BUSINESS_PROGRAMS_URL),
  directoryProgram('ba-bcomm-joint', 'business', 'Joint Bachelor of Arts and Commerce (Co-operative)', 'B.A. / B.Comm.', MUN_BUSINESS_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
  directoryProgram('bmus-bcomm-joint', 'business', 'Joint Bachelor of Music and Commerce', 'B.Mus. / B.Comm.', MUN_BUSINESS_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),

  directoryProgram('bed-primary-first', 'education', 'Bachelor of Education (Primary/Elementary) — First Degree', 'B.Ed.', MUN_EDUCATION_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
  directoryProgram('bed-primary-second', 'education', 'Bachelor of Education (Primary/Elementary) — Second Degree', 'B.Ed.', MUN_EDUCATION_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
  directoryProgram('bed-primary-fsl', 'education', 'Bachelor of Education (Primary/Elementary) — Second Degree, French as a Second Language', 'B.Ed.', MUN_EDUCATION_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
  directoryProgram('bed-intermediate-secondary', 'education', 'Bachelor of Education (Intermediate/Secondary)', 'B.Ed.', MUN_EDUCATION_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
  directoryProgram('bed-intermediate-technology', 'education', 'Bachelor of Education (Intermediate/Secondary) with Diploma in Technology Education', 'B.Ed. / Diploma', MUN_EDUCATION_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
  directoryProgram('bed-post-secondary-first', 'education', 'Bachelor of Education (Post-Secondary) — First Degree', 'B.Ed.', MUN_EDUCATION_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
  directoryProgram('bed-post-secondary-second', 'education', 'Bachelor of Education (Post-Secondary) — Second Degree', 'B.Ed.', MUN_EDUCATION_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
  directoryProgram('bmus-ed-second', 'education', 'Bachelor of Music Education — Second Degree', 'B.Mus.Ed.', MUN_EDUCATION_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),

  directoryProgram('engineering-one', 'engineering', 'Engineering One', 'B.Eng. entry year', MUN_ENGINEERING_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
    typicalYears: 1,
    isExploratory: true,
    description: 'The common entry stage before promotion to a Memorial engineering major.',
  }),
  ...['Civil', 'Computer', 'Electrical', 'Mechanical', 'Mechatronics', 'Ocean and Naval Architectural', 'Process'].map((major) =>
    directoryProgram(
      `beng-${major.toLowerCase().replaceAll(' ', '-').replaceAll('and-', '')}`,
      'engineering',
      `${major} Engineering`,
      'B.Eng.',
      MUN_ENGINEERING_PROGRAMS_URL,
      {
        totalCreditHoursRequired: null,
        typicalYears: 5,
        description: 'An official major in Memorial’s five-year co-operative Bachelor of Engineering program.',
        highlights: ['Official MUN major', 'Five-year co-op program', 'Manual planning mode'],
      },
    )
  ),

  directoryProgram('bhkrc', 'hkr', 'Human Kinetics and Recreation Co-operative', 'B.H.K.R.C.', MUN_HKR_PROGRAMS_URL, {
    totalCreditHoursRequired: null,
  }),
  directoryProgram('bkin', 'hkr', 'Kinesiology', 'B.Kin.', MUN_HKR_PROGRAMS_URL, { totalCreditHoursRequired: null }),
  directoryProgram('bpe', 'hkr', 'Physical Education', 'B.P.E.', MUN_HKR_PROGRAMS_URL, { totalCreditHoursRequired: null }),
  directoryProgram('brec', 'hkr', 'Recreation', 'B.Rec.', MUN_HKR_PROGRAMS_URL, { totalCreditHoursRequired: null }),

  ...['Composition', 'Comprehensive', 'General Musical Studies', 'Musicologies', 'Performance'].map((major) =>
    directoryProgram(
      `bmus-${major.toLowerCase().replaceAll(' ', '-')}`,
      'music',
      major,
      'B.Mus.',
      MUN_MUSIC_PROGRAMS_URL,
      { totalCreditHoursRequired: null, typicalYears: 4 },
    )
  ),

  directoryProgram('bscn-four-year', 'nursing', 'Bachelor of Science in Nursing — Four-year option', 'B.Sc.N.', MUN_PROGRAM_DIRECTORY_URL, {
    totalCreditHoursRequired: null,
    typicalYears: 4,
  }),
  directoryProgram('bscn-accelerated', 'nursing', 'Bachelor of Science in Nursing — Accelerated option', 'B.Sc.N.', MUN_PROGRAM_DIRECTORY_URL, {
    totalCreditHoursRequired: null,
    typicalYears: 3,
  }),
  directoryProgram('pharmd', 'pharmacy', 'Doctor of Pharmacy (Entry-to-Practice)', 'Pharm.D.', MUN_PROGRAM_DIRECTORY_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
  directoryProgram('bsw-first', 'social-work', 'Bachelor of Social Work — First degree', 'B.S.W.', MUN_PROGRAM_DIRECTORY_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
  directoryProgram('bsw-second', 'social-work', 'Bachelor of Social Work — Second degree', 'B.S.W.', MUN_PROGRAM_DIRECTORY_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
  directoryProgram('md', 'medicine', 'Doctor of Medicine', 'M.D.', MUN_PROGRAM_DIRECTORY_URL, {
    totalCreditHoursRequired: null,
    typicalYears: null,
  }),
]

function programIds(facultyId: string): string[] {
  return MUN_PROGRAMS.filter((program) => program.facultyId === facultyId).map((program) => program.id)
}

export const FACULTIES: Faculty[] = [
  {
    id: 'science',
    universityId: 'mun',
    name: 'Faculty of Science',
    shortName: 'Science',
    emoji: '🔬',
    color: 'bg-violet-50',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
    description: 'Current St. John’s campus Bachelor of Science major directory.',
    programs: programIds('science'),
  },
  {
    id: 'arts',
    universityId: 'mun',
    name: 'Faculty of Humanities and Social Sciences',
    shortName: 'Humanities & Social Sciences',
    emoji: '📚',
    color: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    description: 'Current Memorial Humanities and Social Sciences majors.',
    programs: programIds('arts'),
  },
  {
    id: 'business',
    universityId: 'mun',
    name: 'Faculty of Business Administration',
    shortName: 'Business',
    emoji: '📈',
    color: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    description: 'Business One, Commerce, co-op, and joint degree pathways.',
    programs: programIds('business'),
  },
  {
    id: 'engineering',
    universityId: 'mun',
    name: 'Faculty of Engineering and Applied Science',
    shortName: 'Engineering',
    emoji: '⚙️',
    color: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    description: 'Engineering One and the seven current five-year co-op majors.',
    programs: programIds('engineering'),
  },
  {
    id: 'education',
    universityId: 'mun',
    name: 'Faculty of Education',
    shortName: 'Education',
    emoji: '🍎',
    color: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200',
    description: 'Current first-degree, second-degree, and conjoint Education programs.',
    programs: programIds('education'),
  },
  {
    id: 'hkr',
    universityId: 'mun',
    name: 'School of Human Kinetics and Recreation',
    shortName: 'Human Kinetics & Recreation',
    emoji: '🏃',
    color: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    description: 'Kinesiology, physical education, recreation, and co-operative programs.',
    programs: programIds('hkr'),
  },
  {
    id: 'music',
    universityId: 'mun',
    name: 'School of Music',
    shortName: 'Music',
    emoji: '🎼',
    color: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    description: 'Current Bachelor of Music major options.',
    programs: programIds('music'),
  },
  {
    id: 'nursing',
    universityId: 'mun',
    name: 'Faculty of Nursing',
    shortName: 'Nursing',
    emoji: '🩺',
    color: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
    description: 'Four-year and accelerated Bachelor of Science in Nursing options.',
    programs: programIds('nursing'),
  },
  {
    id: 'pharmacy',
    universityId: 'mun',
    name: 'School of Pharmacy',
    shortName: 'Pharmacy',
    emoji: '💊',
    color: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    description: 'Entry-to-practice Doctor of Pharmacy program.',
    programs: programIds('pharmacy'),
  },
  {
    id: 'social-work',
    universityId: 'mun',
    name: 'School of Social Work',
    shortName: 'Social Work',
    emoji: '🤝',
    color: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    description: 'Bachelor of Social Work first- and second-degree pathways.',
    programs: programIds('social-work'),
  },
  {
    id: 'medicine',
    universityId: 'mun',
    name: 'Faculty of Medicine',
    shortName: 'Medicine',
    emoji: '⚕️',
    color: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    description: 'Doctor of Medicine program listing.',
    programs: programIds('medicine'),
  },
]

export const UNIVERSITIES: University[] = [
  {
    id: 'mun',
    name: 'Memorial University of Newfoundland',
    shortName: 'MUN',
    country: 'Canada',
    province: 'Newfoundland and Labrador',
    city: 'St. John’s, NL',
    emoji: '🏛️',
    available: true,
    tagline: 'St. John’s campus program directory with a source-backed Computer Science degree map.',
    studentCount: '17,000 students across campuses',
    catalogYear: MUN_CATALOG_YEAR,
    officialCatalogUrl: MUN_PROGRAM_DIRECTORY_URL,
    lastVerified: '2026-08-21',
  },
]

export function getCourse(code: string): MUNCourse | undefined {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, ' ')
  return MUN_COURSES.find((course) => course.code === normalized)
}

export function getProgram(id: string): PlannerProgram | undefined {
  return MUN_PROGRAMS.find((program) => program.id === id)
}

export function getFaculty(id: string): Faculty | undefined {
  return FACULTIES.find((faculty) => faculty.id === id)
}

export function getUniversity(id: string): University | undefined {
  return UNIVERSITIES.find((university) => university.id === id)
}

export function describePrereqs(node: PrereqNode | undefined, depth = 0): string {
  if (!node) return 'None listed in this catalog snapshot'

  switch (node.type) {
    case 'COURSE':
      return node.course ?? ''
    case 'MIN_GRADE':
      return `${node.course} (minimum ${node.minGrade}%)`
    case 'PROGRAM_ADMISSION':
      return `Admission to ${node.program}`
    case 'AND':
      return (node.children ?? []).map((child) => describePrereqs(child, depth + 1)).join(' AND ')
    case 'OR': {
      const parts = (node.children ?? []).map((child) => describePrereqs(child, depth + 1))
      return depth > 0 ? `(${parts.join(' OR ')})` : parts.join(' OR ')
    }
    default:
      return ''
  }
}

export const PLANNER_SOURCE_LINKS = {
  programDirectory: MUN_PROGRAM_DIRECTORY_URL,
  scienceCore: MUN_SCIENCE_CORE_URL,
  computerScienceRequirements: MUN_CS_REQUIREMENTS_URL,
  computerScienceCourses: MUN_CS_COURSES_URL,
  mathematicsCourses: MUN_MATH_COURSES_URL,
}
