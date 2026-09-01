'use client'

import { supabase } from './supabase'
import type {
  AudioStudyItem,
  CalendarEvent,
  Course,
  GradeEntry,
  Note,
  Task,
} from './types'
import type { PlannerState } from './planner-types'

type JsonObject = Record<string, unknown>

export interface UserAppData {
  courses: Course[]
  tasks: Task[]
  notes: Note[]
  calendarEvents: CalendarEvent[]
  gradeEntries: GradeEntry[]
  audioItems: AudioStudyItem[]
}

export interface SyllabusImportInput {
  courseId: string
  file: File | null
  fileName: string
  extractedData: JsonObject
  gradingBreakdown: Array<{ name: string; weight: number }>
  tasks: Task[]
}

export interface GradeScoreInput {
  courseId: string
  categoryId?: string
  categoryName: string
  weight: number
  score: number | null
}

function dataError(context: string, error: { message: string; code?: string } | null): never {
  const suffix = error?.code ? ` (${error.code})` : ''
  throw new Error(`${context}: ${error?.message ?? 'unknown database error'}${suffix}`)
}

function dateOrUndefined(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function letterGrade(value: number): string {
  if (value >= 90) return 'A+'
  if (value >= 85) return 'A'
  if (value >= 80) return 'A-'
  if (value >= 75) return 'B+'
  if (value >= 70) return 'B'
  if (value >= 65) return 'B-'
  if (value >= 60) return 'C+'
  if (value >= 55) return 'C'
  if (value >= 50) return 'D'
  return 'F'
}

function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned.slice(0, 160) || 'document'
}

function mapTask(row: JsonObject, courseById: Map<string, Course>): Task {
  const courseId = typeof row.course_id === 'string' ? row.course_id : undefined
  const course = courseId ? courseById.get(courseId) : undefined
  const task: Task = {
    id: String(row.id),
    studentId: String(row.student_id),
    courseId,
    title: String(row.title ?? ''),
    description: typeof row.description === 'string' ? row.description : undefined,
    type: (row.type as Task['type']) ?? 'assignment',
    status: (row.status as Task['status']) ?? 'not_started',
    priority: (row.priority as Task['priority']) ?? 'medium',
    dueDate: dateOrUndefined(row.due_date),
    completedAt: dateOrUndefined(row.completed_at),
    estimatedHours: numberOrUndefined(row.estimated_hours),
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    courseCode: course?.code,
    courseColor: course?.color,
    courseName: course?.name,
  }
  if (task.status !== 'completed' && task.dueDate && task.dueDate.getTime() < Date.now()) task.status = 'overdue'
  return task
}

function mapNote(row: JsonObject, currentUserId: string, currentUserName: string): Note {
  const authorId = String(row.author_id)
  return {
    id: String(row.id),
    authorId,
    authorName: authorId === currentUserId ? currentUserName : 'ScholarFlow Student',
    courseId: typeof row.course_id === 'string' ? row.course_id : undefined,
    courseCode: typeof row.course_code === 'string' ? row.course_code : undefined,
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    excerpt: typeof row.excerpt === 'string' ? row.excerpt : undefined,
    type: (row.type as Note['type']) ?? 'personal',
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    subject: typeof row.subject === 'string' ? row.subject : undefined,
    semester: typeof row.semester === 'string' ? row.semester : undefined,
    year: numberOrUndefined(row.year),
    university: typeof row.university_name === 'string' ? row.university_name : undefined,
    status: (row.status as Note['status']) ?? 'draft',
    isVerified: Boolean(row.is_verified),
    viewCount: numberOrUndefined(row.view_count) ?? 0,
    downloadCount: numberOrUndefined(row.download_count) ?? 0,
    fileUrl: typeof row.file_url === 'string' ? row.file_url : undefined,
    fileType: typeof row.file_type === 'string' ? row.file_type : undefined,
    createdAt: dateOrUndefined(row.created_at) ?? new Date(),
    updatedAt: dateOrUndefined(row.updated_at) ?? new Date(),
  }
}

export async function loadUserAppData(userId: string, currentUserName: string): Promise<UserAppData> {
  const [
    coursesResult,
    syllabiResult,
    categoriesResult,
    tasksResult,
    notesResult,
    eventsResult,
    gradesResult,
    audioResult,
  ] = await Promise.all([
    supabase.from('courses').select('*').eq('student_id', userId).order('created_at'),
    supabase.from('syllabi').select('id, course_id, parse_status, extracted_data, uploaded_at').order('uploaded_at', { ascending: false }),
    supabase.from('grade_categories').select('*').order('created_at'),
    supabase.from('tasks').select('*').eq('student_id', userId).order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('notes').select('*').order('updated_at', { ascending: false }),
    supabase.from('calendar_events').select('*').eq('student_id', userId).order('start_date'),
    supabase.from('grade_entries').select('*').eq('student_id', userId).order('created_at'),
    supabase.from('audio_study_items').select('*').eq('student_id', userId).order('created_at', { ascending: false }),
  ])

  if (coursesResult.error) dataError('Could not load courses', coursesResult.error)
  if (syllabiResult.error) dataError('Could not load syllabi', syllabiResult.error)
  if (categoriesResult.error) dataError('Could not load grade categories', categoriesResult.error)
  if (tasksResult.error) dataError('Could not load tasks', tasksResult.error)
  if (notesResult.error) dataError('Could not load notes', notesResult.error)
  if (eventsResult.error) dataError('Could not load calendar events', eventsResult.error)
  if (gradesResult.error) dataError('Could not load grades', gradesResult.error)
  if (audioResult.error) dataError('Could not load audio items', audioResult.error)

  const syllabusByCourse = new Map<string, JsonObject>()
  for (const row of (syllabiResult.data ?? []) as JsonObject[]) {
    const courseId = String(row.course_id)
    if (!syllabusByCourse.has(courseId)) syllabusByCourse.set(courseId, row)
  }

  const categoriesByCourse = new Map<string, Array<{ id: string; name: string; weight: number; count?: number; color?: string }>>()
  const categoryById = new Map<string, JsonObject>()
  for (const row of (categoriesResult.data ?? []) as JsonObject[]) {
    const courseId = String(row.course_id)
    const category = {
      id: String(row.id),
      name: String(row.name ?? ''),
      weight: numberOrUndefined(row.weight) ?? 0,
      count: numberOrUndefined(row.count),
      color: typeof row.color === 'string' ? row.color : undefined,
    }
    categoriesByCourse.set(courseId, [...(categoriesByCourse.get(courseId) ?? []), category])
    categoryById.set(category.id, row)
  }

  const rawGrades = (gradesResult.data ?? []) as JsonObject[]
  const gradeEntries: GradeEntry[] = rawGrades.map((row) => {
    const categoryId = String(row.category_id ?? '')
    const category = categoryById.get(categoryId)
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      courseId: String(row.course_id),
      categoryId,
      categoryName: String(category?.name ?? 'Grade'),
      title: String(row.title ?? ''),
      score: numberOrUndefined(row.score),
      maxScore: numberOrUndefined(row.max_score) ?? 100,
      weight: numberOrUndefined(category?.weight),
      submittedAt: dateOrUndefined(row.submitted_at),
      gradedAt: dateOrUndefined(row.graded_at),
      feedback: typeof row.feedback === 'string' ? row.feedback : undefined,
    }
  })

  const courses: Course[] = ((coursesResult.data ?? []) as JsonObject[]).map((row) => {
    const courseId = String(row.id)
    const categories = categoriesByCourse.get(courseId) ?? []
    const courseGrades = gradeEntries.filter((entry) => entry.courseId === courseId && entry.score !== undefined)
    let currentGrade: number | undefined

    if (courseGrades.length > 0) {
      const categoryScores = categories.flatMap((category) => {
        const entries = courseGrades.filter((entry) => entry.categoryId === category.id && entry.score !== undefined)
        if (entries.length === 0) return []
        const average = entries.reduce((sum, entry) => sum + ((entry.score ?? 0) / entry.maxScore) * 100, 0) / entries.length
        return [{ average, weight: category.weight }]
      })
      const usedWeight = categoryScores.reduce((sum, item) => sum + item.weight, 0)
      if (usedWeight > 0) {
        currentGrade = categoryScores.reduce((sum, item) => sum + item.average * item.weight, 0) / usedWeight
      } else {
        currentGrade = courseGrades.reduce((sum, entry) => sum + ((entry.score ?? 0) / entry.maxScore) * 100, 0) / courseGrades.length
      }
    }

    const syllabus = syllabusByCourse.get(courseId)
    return {
      id: courseId,
      studentId: String(row.student_id),
      code: String(row.code ?? ''),
      name: String(row.name ?? ''),
      instructor: typeof row.instructor === 'string' ? row.instructor : undefined,
      credits: numberOrUndefined(row.credits) ?? 3,
      semester: String(row.semester ?? ''),
      year: numberOrUndefined(row.year) ?? new Date().getFullYear(),
      color: String(row.color ?? '#059669'),
      syllabusId: syllabus ? String(syllabus.id) : undefined,
      syllabusUploaded: syllabus?.parse_status === 'completed',
      currentGrade: currentGrade === undefined ? undefined : Number(currentGrade.toFixed(1)),
      letterGrade: currentGrade === undefined ? undefined : letterGrade(currentGrade),
      status: (row.status as Course['status']) ?? 'active',
      schedule: typeof row.schedule === 'string' ? row.schedule : undefined,
      room: typeof row.room === 'string' ? row.room : undefined,
      gradingBreakdown: categories.map(({ id, name, weight }) => ({ id, name, weight })),
    }
  })

  const courseById = new Map(courses.map((course) => [course.id, course]))
  const tasks = ((tasksResult.data ?? []) as JsonObject[]).map((row) => mapTask(row, courseById))
  const notes = ((notesResult.data ?? []) as JsonObject[]).map((row) => mapNote(row, userId, currentUserName))
  const calendarEvents: CalendarEvent[] = ((eventsResult.data ?? []) as JsonObject[]).map((row) => {
    const courseId = typeof row.course_id === 'string' ? row.course_id : undefined
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      courseId,
      title: String(row.title ?? ''),
      type: (row.type as CalendarEvent['type']) ?? 'personal',
      startDate: dateOrUndefined(row.start_date) ?? new Date(),
      endDate: dateOrUndefined(row.end_date),
      allDay: Boolean(row.all_day),
      color: typeof row.color === 'string' ? row.color : courseById.get(courseId ?? '')?.color,
      description: typeof row.description === 'string' ? row.description : undefined,
      location: typeof row.location === 'string' ? row.location : undefined,
      courseCode: courseById.get(courseId ?? '')?.code,
    }
  })

  const audioItems: AudioStudyItem[] = ((audioResult.data ?? []) as JsonObject[]).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ''),
    sourceNoteId: typeof row.source_note_id === 'string' ? row.source_note_id : undefined,
    duration: numberOrUndefined(row.duration_seconds),
    script: typeof row.script === 'string' ? row.script : undefined,
    audioUrl: typeof row.audio_url === 'string' ? row.audio_url : undefined,
    status: (row.status as AudioStudyItem['status']) ?? 'ready',
    createdAt: dateOrUndefined(row.created_at) ?? new Date(),
  }))

  return { courses, tasks, notes, calendarEvents, gradeEntries, audioItems }
}

export async function createCourse(course: Course, userId: string): Promise<void> {
  const { error } = await supabase.from('courses').insert({
    id: course.id,
    student_id: userId,
    code: course.code,
    name: course.name,
    instructor: course.instructor ?? null,
    credits: course.credits,
    semester: course.semester,
    year: course.year,
    color: course.color,
    schedule: course.schedule ?? null,
    room: course.room ?? null,
    status: course.status,
  })
  if (error) dataError('Could not create course', error)
}

export async function updateCourseRecord(courseId: string, patch: Partial<Course>): Promise<void> {
  const update: JsonObject = {}
  if (patch.code !== undefined) update.code = patch.code
  if (patch.name !== undefined) update.name = patch.name
  if (patch.instructor !== undefined) update.instructor = patch.instructor || null
  if (patch.credits !== undefined) update.credits = patch.credits
  if (patch.semester !== undefined) update.semester = patch.semester
  if (patch.year !== undefined) update.year = patch.year
  if (patch.color !== undefined) update.color = patch.color
  if (patch.schedule !== undefined) update.schedule = patch.schedule || null
  if (patch.room !== undefined) update.room = patch.room || null
  if (patch.status !== undefined) update.status = patch.status

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from('courses').update(update).eq('id', courseId)
    if (error) dataError('Could not update course', error)
  }

  if (patch.gradingBreakdown !== undefined) {
    const { error: deleteError } = await supabase.from('grade_categories').delete().eq('course_id', courseId)
    if (deleteError) dataError('Could not replace grade categories', deleteError)
    if (patch.gradingBreakdown.length > 0) {
      const { error: insertError } = await supabase.from('grade_categories').insert(
        patch.gradingBreakdown.map((category) => ({
          course_id: courseId,
          name: category.name,
          weight: category.weight,
        }))
      )
      if (insertError) dataError('Could not save grade categories', insertError)
    }
  }
}

export async function saveGradeScore(input: GradeScoreInput, userId: string): Promise<GradeEntry | null> {
  let categoryId = input.categoryId

  if (categoryId) {
    const { data, error } = await supabase
      .from('grade_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('course_id', input.courseId)
      .maybeSingle()
    if (error) dataError('Could not find grade category', error)
    if (!data) categoryId = undefined
  }

  if (!categoryId) {
    const { data: existing, error: lookupError } = await supabase
      .from('grade_categories')
      .select('id')
      .eq('course_id', input.courseId)
      .ilike('name', input.categoryName)
      .limit(1)
      .maybeSingle()
    if (lookupError) dataError('Could not find grade category', lookupError)

    if (existing?.id) {
      categoryId = String(existing.id)
      const { error: weightError } = await supabase
        .from('grade_categories')
        .update({ weight: input.weight })
        .eq('id', categoryId)
      if (weightError) dataError('Could not update grade category', weightError)
    } else {
      if (input.score === null) return null
      const { data: created, error: createError } = await supabase
        .from('grade_categories')
        .insert({ course_id: input.courseId, name: input.categoryName, weight: input.weight })
        .select('id')
        .single()
      if (createError) dataError('Could not create grade category', createError)
      categoryId = String(created.id)
    }
  }

  const title = input.categoryName
  const { data: existingEntry, error: entryLookupError } = await supabase
    .from('grade_entries')
    .select('id')
    .eq('student_id', userId)
    .eq('course_id', input.courseId)
    .eq('category_id', categoryId)
    .eq('title', title)
    .limit(1)
    .maybeSingle()
  if (entryLookupError) dataError('Could not find grade entry', entryLookupError)

  if (input.score === null) {
    if (existingEntry?.id) {
      const { error } = await supabase.from('grade_entries').delete().eq('id', existingEntry.id)
      if (error) dataError('Could not clear grade', error)
    }
    return null
  }

  const score = Math.max(0, Math.min(100, input.score))
  const row = {
    student_id: userId,
    course_id: input.courseId,
    category_id: categoryId,
    title,
    score,
    max_score: 100,
    graded_at: new Date().toISOString(),
  }
  const result = existingEntry?.id
    ? await supabase.from('grade_entries').update(row).eq('id', existingEntry.id).select('*').single()
    : await supabase.from('grade_entries').insert(row).select('*').single()
  if (result.error) dataError('Could not save grade', result.error)

  return {
    id: String(result.data.id),
    studentId: userId,
    courseId: input.courseId,
    categoryId,
    categoryName: input.categoryName,
    title,
    score,
    maxScore: 100,
    weight: input.weight,
    gradedAt: dateOrUndefined(result.data.graded_at),
  }
}

export async function createTasks(tasks: Task[], userId: string): Promise<void> {
  if (tasks.length === 0) return
  const { error } = await supabase.from('tasks').insert(tasks.map((task) => ({
    id: task.id,
    student_id: userId,
    course_id: task.courseId ?? null,
    title: task.title,
    description: task.description ?? null,
    type: task.type,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate?.toISOString() ?? null,
    completed_at: task.completedAt?.toISOString() ?? null,
    estimated_hours: task.estimatedHours ?? null,
    tags: task.tags ?? [],
  })))
  if (error) dataError('Could not create tasks', error)
}

export async function updateTaskRecord(taskId: string, patch: Partial<Task>): Promise<void> {
  const update: JsonObject = {}
  if (Object.prototype.hasOwnProperty.call(patch, 'courseId')) update.course_id = patch.courseId || null
  if (patch.title !== undefined) update.title = patch.title
  if (patch.description !== undefined) update.description = patch.description || null
  if (patch.type !== undefined) update.type = patch.type
  if (patch.status !== undefined) update.status = patch.status
  if (patch.priority !== undefined) update.priority = patch.priority
  if (Object.prototype.hasOwnProperty.call(patch, 'dueDate')) update.due_date = patch.dueDate?.toISOString() ?? null
  if (Object.prototype.hasOwnProperty.call(patch, 'completedAt')) update.completed_at = patch.completedAt?.toISOString() ?? null
  if (Object.prototype.hasOwnProperty.call(patch, 'estimatedHours')) update.estimated_hours = patch.estimatedHours ?? null
  if (Object.prototype.hasOwnProperty.call(patch, 'tags')) update.tags = patch.tags ?? []
  const { error } = await supabase.from('tasks').update(update).eq('id', taskId)
  if (error) dataError('Could not update task', error)
}

export async function deleteTaskRecord(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) dataError('Could not delete task', error)
}

export async function deleteCourseRecord(courseId: string): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', courseId)
  if (error) dataError('Could not delete course', error)
}

export async function createCalendarEvent(event: CalendarEvent, userId: string): Promise<void> {
  const { error } = await supabase.from('calendar_events').insert({
    id: event.id,
    student_id: userId,
    course_id: event.courseId ?? null,
    title: event.title,
    type: event.type,
    start_date: event.startDate.toISOString(),
    end_date: event.endDate?.toISOString() ?? null,
    all_day: event.allDay,
    color: event.color ?? null,
    description: event.description ?? null,
    location: event.location ?? null,
  })
  if (error) dataError('Could not create calendar event', error)
}

export async function deleteCalendarEventRecord(eventId: string): Promise<void> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', eventId)
  if (error) dataError('Could not delete calendar event', error)
}

async function uploadPrivateFile(bucket: string, userId: string, scopeId: string, file: File): Promise<string> {
  const path = `${userId}/${scopeId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  })
  if (error) dataError(`Could not upload ${file.name}`, error)
  return path
}

export async function createNote(note: Note, userId: string, file?: File): Promise<Note> {
  let filePath: string | undefined
  if (file) filePath = await uploadPrivateFile('notes', userId, note.id, file)

  const { data, error } = await supabase.from('notes').insert({
    id: note.id,
    author_id: userId,
    course_id: note.courseId ?? null,
    course_code: note.courseCode ?? null,
    title: note.title,
    content: note.content,
    excerpt: note.excerpt ?? null,
    type: note.type,
    tags: note.tags ?? [],
    subject: note.subject ?? null,
    semester: note.semester ?? null,
    year: note.year ?? null,
    university_name: note.university ?? null,
    status: note.status,
    is_verified: false,
    file_url: filePath ?? null,
    file_type: file?.type || note.fileType || null,
  }).select('*').single()

  if (error) {
    if (filePath) await supabase.storage.from('notes').remove([filePath])
    dataError('Could not save note', error)
  }
  return mapNote(data as JsonObject, userId, note.authorName)
}

export async function deleteNoteRecord(note: Note): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', note.id)
  if (error) dataError('Could not delete note', error)
  if (note.fileUrl) await supabase.storage.from('notes').remove([note.fileUrl])
}

export async function saveSyllabusImport(input: SyllabusImportInput, userId: string): Promise<string> {
  let filePath: string | undefined
  if (input.file) filePath = await uploadPrivateFile('syllabi', userId, input.courseId, input.file)

  const { data, error } = await supabase.rpc('save_syllabus_import', {
    p_course_id: input.courseId,
    p_file_name: input.fileName,
    p_file_url: filePath ?? null,
    p_file_size: input.file?.size ?? null,
    p_extracted_data: input.extractedData,
    p_categories: input.gradingBreakdown,
    p_tasks: input.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? null,
      type: task.type,
      status: task.status,
      priority: task.priority,
      due_date: task.dueDate?.toISOString() ?? null,
      estimated_hours: task.estimatedHours ?? null,
      tags: Array.from(new Set([...(task.tags ?? []), 'syllabus-import'])),
    })),
  })

  if (error) {
    if (filePath) await supabase.storage.from('syllabi').remove([filePath])
    dataError('Could not save syllabus', error)
  }
  return String(data)
}

export async function createAudioItem(item: AudioStudyItem, userId: string): Promise<void> {
  const { error } = await supabase.from('audio_study_items').insert({
    id: item.id,
    student_id: userId,
    title: item.title,
    source_note_id: item.sourceNoteId ?? null,
    duration_seconds: item.duration ?? null,
    script: item.script ?? null,
    audio_url: item.audioUrl ?? null,
    status: item.status,
  })
  if (error) dataError('Could not save audio item', error)
}

export async function loadPlannerState(userId: string): Promise<PlannerState | null> {
  const { data, error } = await supabase
    .from('academic_plans')
    .select('planner_state')
    .eq('student_id', userId)
    .maybeSingle()
  if (error) dataError('Could not load academic plan', error)
  return data?.planner_state ? data.planner_state as PlannerState : null
}

export async function savePlannerState(userId: string, state: PlannerState): Promise<void> {
  const active = state.scenarios.find((scenario) => scenario.id === state.activeScenarioId) ?? state.scenarios[0]
  const row = {
    student_id: userId,
    major: active?.declaredPrograms[0] ?? 'Undeclared',
    start_year: active?.termSlots[0]?.year ?? new Date().getFullYear(),
    expected_grad_year: active?.termSlots.at(-1)?.year ?? new Date().getFullYear() + 4,
    completed_courses: active?.completed ?? [],
    planned_courses: active?.termSlots ?? [],
    requirements: [],
    planner_state: state,
    updated_at: new Date().toISOString(),
  }

  const { data: existing, error: lookupError } = await supabase
    .from('academic_plans')
    .select('id')
    .eq('student_id', userId)
    .maybeSingle()
  if (lookupError) dataError('Could not find academic plan', lookupError)

  const result = existing?.id
    ? await supabase.from('academic_plans').update(row).eq('id', existing.id)
    : await supabase.from('academic_plans').insert(row)
  if (result.error) dataError('Could not save academic plan', result.error)
}
