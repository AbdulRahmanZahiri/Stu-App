export interface Student {
  id: string
  email: string
  studentId: string
  name: string
  university: string
  major: string
  year: number
  semester: string
  gpa?: number
  avatarUrl?: string
  bio?: string
  goals?: string[]
  createdAt: Date
}

export interface University {
  id: string
  name: string
  country: string
  domain: string
}

export interface Course {
  id: string
  studentId: string
  code: string
  name: string
  instructor?: string
  credits: number
  semester: string
  year: number
  color: string
  syllabusId?: string
  syllabusUploaded?: boolean
  currentGrade?: number
  letterGrade?: string
  status: 'active' | 'completed' | 'dropped'
  schedule?: string
  room?: string
  gradingBreakdown?: { id?: string; name: string; weight: number }[]
}

export interface Syllabus {
  id: string
  courseId: string
  fileName: string
  fileUrl: string
  uploadedAt: Date
  parsedAt?: Date
  parseStatus: 'pending' | 'processing' | 'completed' | 'failed'
  extractedData?: ExtractedSyllabusData
}

export interface ExtractedSyllabusData {
  courseTitle?: string
  instructor?: string
  email?: string
  office?: string
  officeHours?: string
  description?: string
  gradingBreakdown: GradeCategory[]
  assignments: ExtractedAssignment[]
  policies?: string[]
  textbooks?: string[]
  weeklySchedule?: WeeklyTopic[]
}

export interface GradeCategory {
  id: string
  name: string
  weight: number
  count?: number
  color?: string
}

export interface ExtractedAssignment {
  id: string
  title: string
  type: 'assignment' | 'quiz' | 'exam' | 'project' | 'lab' | 'participation' | 'other'
  dueDate?: Date
  weight?: number
  description?: string
}

export interface WeeklyTopic {
  week: number
  topic: string
  readings?: string
}

export interface Task {
  id: string
  studentId: string
  courseId?: string
  title: string
  description?: string
  type: 'assignment' | 'quiz' | 'exam' | 'project' | 'reading' | 'lab' | 'other'
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: Date
  completedAt?: Date
  estimatedHours?: number
  tags?: string[]
  courseCode?: string
  courseColor?: string
  courseName?: string
}

export interface GradeEntry {
  id: string
  studentId: string
  courseId: string
  categoryId: string
  categoryName: string
  title: string
  score?: number
  maxScore: number
  weight?: number
  submittedAt?: Date
  gradedAt?: Date
  feedback?: string
}

export interface CourseGrades {
  courseId: string
  courseCode: string
  courseName: string
  courseColor: string
  categories: GradeCategory[]
  entries: GradeEntry[]
  currentGrade: number
  letterGrade: string
  projectedGrade?: number
}

export interface CalendarEvent {
  id: string
  studentId: string
  courseId?: string
  title: string
  type: 'deadline' | 'exam' | 'class' | 'reminder' | 'personal'
  startDate: Date
  endDate?: Date
  allDay: boolean
  color?: string
  description?: string
  location?: string
  courseCode?: string
}

export interface Note {
  id: string
  authorId: string
  authorName: string
  courseId?: string
  courseCode?: string
  title: string
  content: string
  excerpt?: string
  type: 'personal' | 'shared' | 'archived'
  tags?: string[]
  subject?: string
  semester?: string
  year?: number
  university?: string
  status: 'draft' | 'published' | 'archived'
  isVerified: boolean
  viewCount?: number
  downloadCount?: number
  fileUrl?: string
  fileType?: string
  createdAt: Date
  updatedAt: Date
}

export interface Resource {
  id: string
  uploadedBy: string
  courseId?: string
  title: string
  description?: string
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
  type: 'notes' | 'past_exam' | 'study_guide' | 'slides' | 'textbook' | 'other'
  label: 'verified' | 'student-uploaded' | 'archived' | 'unofficial'
  semester?: string
  year?: number
  university?: string
  courseCode?: string
  tags?: string[]
  downloadCount: number
  rating?: number
  createdAt: Date
}

export interface ChatRoom {
  id: string
  name: string
  type: 'course' | 'major' | 'general' | 'direct'
  description?: string
  courseCode?: string
  university?: string
  memberCount: number
  lastMessage?: ChatMessage
  unreadCount?: number
  avatar?: string
  color?: string
  createdAt: Date
}

export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  type: 'text' | 'file' | 'image' | 'system'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  fileMime?: string
  createdAt: Date
  reactions?: MessageReaction[]
}

export interface MessageReaction {
  emoji: string
  count: number
  userIds: string[]
}

export interface AcademicPlan {
  id: string
  studentId: string
  major: string
  university: string
  startYear: number
  expectedGradYear: number
  completedCourses: PlannedCourse[]
  inProgressCourses: PlannedCourse[]
  plannedCourses: PlannedCourse[]
  requirements: Requirement[]
  notes?: string
}

export interface PlannedCourse {
  courseCode: string
  courseName: string
  credits: number
  plannedSemester?: string
  plannedYear?: number
  prerequisites?: string[]
  status: 'completed' | 'in_progress' | 'planned' | 'recommended' | 'required'
  grade?: string
}

export interface Requirement {
  id: string
  category: string
  title: string
  requiredCredits: number
  completedCredits: number
  courses: string[]
  isComplete: boolean
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'text' | 'summary' | 'study-guide' | 'quiz' | 'flashcards'
}

export interface PodcastLine {
  speaker: 'HOST_1' | 'HOST_2'
  text: string
}

export interface AudioStudyItem {
  id: string
  title: string
  sourceNoteId?: string
  sourceType?: 'note' | 'pdf' | 'text'
  sourceName?: string
  duration?: number
  script?: string
  dialogue?: PodcastLine[]
  audioUrl?: string
  status: 'generating' | 'ready' | 'failed'
  createdAt: Date
}

export interface Reminder {
  id: string
  studentId: string
  taskId?: string
  title: string
  message?: string
  scheduledFor: Date
  type: 'email' | 'push' | 'in-app'
  status: 'pending' | 'sent' | 'dismissed'
}

export interface DashboardStats {
  activeCourses: number
  tasksDueToday: number
  tasksOverdue: number
  currentGPA: number
  weeklyStudyHours: number
  upcomingDeadlines: Task[]
  todayTasks: Task[]
  gradesSummary: { courseCode: string; grade: number; letterGrade: string; color: string }[]
}
