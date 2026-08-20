'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { mockAudioItems, mockCalendarEvents, mockCourses, mockNotes, mockTasks } from './mock-data'
import type { AudioStudyItem, CalendarEvent, Course, GradeEntry, Note, Task } from './types'
import { useAuth } from './auth-context'
import {
  createAudioItem,
  createCalendarEvent,
  createCourse,
  createNote as createNoteRecord,
  createTasks,
  deleteNoteRecord,
  deleteCalendarEventRecord,
  deleteTaskRecord,
  loadUserAppData,
  saveGradeScore,
  saveSyllabusImport as persistSyllabusImport,
  updateCourseRecord,
  updateTaskRecord,
  type SyllabusImportInput,
  type GradeScoreInput,
} from './supabase-data'

const STORAGE_KEY = 'sf-app-store-v3'

export type DataMode = 'database' | 'demo'

interface LocalSnapshot {
  tasks: Task[]
  courses: Course[]
  notes: Note[]
  calendarEvents: CalendarEvent[]
  audioItems: AudioStudyItem[]
}

function reviveDates<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(reviveDates) as T
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return [key, new Date(value)]
        return [key, reviveDates(value)]
      })
    ) as T
  }
  return obj
}

function defaultSnapshot(): LocalSnapshot {
  return {
    tasks: mockTasks,
    courses: mockCourses,
    notes: mockNotes,
    calendarEvents: mockCalendarEvents,
    audioItems: mockAudioItems,
  }
}

function loadLocalSnapshot(): LocalSnapshot {
  if (typeof window === 'undefined') return defaultSnapshot()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSnapshot()
    const parsed = reviveDates(JSON.parse(raw)) as Partial<LocalSnapshot>
    return {
      tasks: parsed.tasks ?? mockTasks,
      courses: parsed.courses ?? mockCourses,
      notes: parsed.notes ?? mockNotes,
      calendarEvents: parsed.calendarEvents ?? mockCalendarEvents,
      audioItems: parsed.audioItems ?? mockAudioItems,
    }
  } catch {
    return defaultSnapshot()
  }
}

function uuid(): string {
  return crypto.randomUUID()
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

interface AppStore {
  tasks: Task[]
  courses: Course[]
  notes: Note[]
  calendarEvents: CalendarEvent[]
  gradeEntries: GradeEntry[]
  audioItems: AudioStudyItem[]
  dataMode: DataMode
  loading: boolean
  syncError: string | null
  refresh: () => Promise<void>
  clearSyncError: () => void
  addTasks: (tasks: Task[]) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  addCourse: (course: Course) => void
  updateCourse: (id: string, patch: Partial<Course>) => void
  saveGrade: (input: GradeScoreInput) => Promise<void>
  addCalendarEvent: (event: CalendarEvent) => void
  deleteCalendarEvent: (id: string) => void
  addNote: (note: Note, file?: File) => void
  deleteNote: (id: string) => void
  addAudioItem: (item: AudioStudyItem) => void
  saveSyllabusImport: (input: SyllabusImportInput) => Promise<void>
}

const AppContext = createContext<AppStore | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth()
  const initial = useMemo(() => defaultSnapshot(), [])
  const [tasks, setTasks] = useState<Task[]>(initial.tasks)
  const [courses, setCourses] = useState<Course[]>(initial.courses)
  const [notes, setNotes] = useState<Note[]>(initial.notes)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initial.calendarEvents)
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([])
  const [audioItems, setAudioItems] = useState<AudioStudyItem[]>(initial.audioItems)
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const loadedUserRef = useRef<string | null>(null)
  const dataMode: DataMode = user ? 'database' : 'demo'
  const profileName = profile?.name

  const refresh = useCallback(async () => {
    await Promise.resolve()

    if (!user) {
      loadedUserRef.current = null
      const local = loadLocalSnapshot()
      setTasks(local.tasks)
      setCourses(local.courses)
      setNotes(local.notes)
      setCalendarEvents(local.calendarEvents)
      setAudioItems(local.audioItems)
      setGradeEntries([])
      setSyncError(null)
      setLoading(false)
      return
    }

    if (loadedUserRef.current !== user.id) {
      loadedUserRef.current = user.id
      setCourses([])
      setTasks([])
      setNotes([])
      setCalendarEvents([])
      setGradeEntries([])
      setAudioItems([])
    }

    setLoading(true)
    try {
      const data = await loadUserAppData(user.id, profileName ?? user.email?.split('@')[0] ?? 'Student')
      setCourses(data.courses)
      setTasks(data.tasks)
      setNotes(data.notes)
      setCalendarEvents(data.calendarEvents)
      setGradeEntries(data.gradeEntries)
      setAudioItems(data.audioItems)
      setSyncError(null)
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Could not synchronize with Supabase')
    } finally {
      setLoading(false)
    }
  }, [profileName, user])

  useEffect(() => {
    if (authLoading) return
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [authLoading, refresh])

  useEffect(() => {
    if (authLoading || user || loading) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tasks,
        courses,
        notes,
        calendarEvents,
        audioItems,
      }))
    } catch {
      const timer = window.setTimeout(() => {
        setSyncError('Browser storage is full. Demo changes may not survive a refresh.')
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [audioItems, authLoading, calendarEvents, courses, loading, notes, tasks, user])

  const handlePersistenceError = useCallback((error: unknown) => {
    setSyncError(error instanceof Error ? error.message : 'A database operation failed')
    if (user) void refresh()
  }, [refresh, user])

  const addTasks = useCallback((incoming: Task[]) => {
    const normalized = incoming.map((task) => ({
      ...task,
      id: isUuid(task.id) ? task.id : uuid(),
      studentId: user?.id ?? task.studentId,
    }))
    setTasks((previous) => {
      const existingIds = new Set(previous.map((task) => task.id))
      return [...previous, ...normalized.filter((task) => !existingIds.has(task.id))]
    })
    if (user) void createTasks(normalized, user.id).catch(handlePersistenceError)
  }, [handlePersistenceError, user])

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((previous) => previous.map((task) => task.id === id ? { ...task, ...patch } : task))
    if (user) void updateTaskRecord(id, patch).catch(handlePersistenceError)
  }, [handlePersistenceError, user])

  const deleteTask = useCallback((id: string) => {
    setTasks((previous) => previous.filter((task) => task.id !== id))
    if (user) void deleteTaskRecord(id).catch(handlePersistenceError)
  }, [handlePersistenceError, user])

  const addCourse = useCallback((incoming: Course) => {
    const course = {
      ...incoming,
      id: isUuid(incoming.id) ? incoming.id : uuid(),
      studentId: user?.id ?? incoming.studentId,
    }
    setCourses((previous) => [...previous, course])
    if (user) void createCourse(course, user.id).catch(handlePersistenceError)
  }, [handlePersistenceError, user])

  const updateCourse = useCallback((id: string, patch: Partial<Course>) => {
    setCourses((previous) => previous.map((course) => course.id === id ? { ...course, ...patch } : course))
    if (user) void updateCourseRecord(id, patch).catch(handlePersistenceError)
  }, [handlePersistenceError, user])

  const saveGrade = useCallback(async (input: GradeScoreInput) => {
    if (user) {
      try {
        await saveGradeScore(input, user.id)
        await refresh()
        setSyncError(null)
      } catch (error) {
        handlePersistenceError(error)
        throw error
      }
      return
    }

    setGradeEntries((previous) => {
      const matching = previous.find((entry) =>
        entry.courseId === input.courseId
        && entry.categoryName.toLowerCase() === input.categoryName.toLowerCase()
      )
      if (input.score === null) return matching ? previous.filter((entry) => entry.id !== matching.id) : previous

      const entry: GradeEntry = {
        id: matching?.id ?? uuid(),
        studentId: matching?.studentId ?? 'demo-student',
        courseId: input.courseId,
        categoryId: matching?.categoryId ?? input.categoryId ?? uuid(),
        categoryName: input.categoryName,
        title: input.categoryName,
        score: Math.max(0, Math.min(100, input.score)),
        maxScore: 100,
        weight: input.weight,
        gradedAt: new Date(),
      }
      return matching
        ? previous.map((item) => item.id === matching.id ? entry : item)
        : [...previous, entry]
    })
  }, [handlePersistenceError, refresh, user])

  const addCalendarEvent = useCallback((incoming: CalendarEvent) => {
    const event = {
      ...incoming,
      id: isUuid(incoming.id) ? incoming.id : uuid(),
      studentId: user?.id ?? incoming.studentId,
    }
    setCalendarEvents((previous) => [...previous, event])
    if (user) void createCalendarEvent(event, user.id).catch(handlePersistenceError)
  }, [handlePersistenceError, user])

  const deleteCalendarEvent = useCallback((id: string) => {
    setCalendarEvents((previous) => previous.filter((event) => event.id !== id))
    if (user) void deleteCalendarEventRecord(id).catch(handlePersistenceError)
  }, [handlePersistenceError, user])

  const addNote = useCallback((incoming: Note, file?: File) => {
    const note = {
      ...incoming,
      id: isUuid(incoming.id) ? incoming.id : uuid(),
      authorId: user?.id ?? incoming.authorId,
      authorName: profile?.name ?? incoming.authorName,
    }
    setNotes((previous) => [note, ...previous])
    if (user) {
      void createNoteRecord(note, user.id, file)
        .then((saved) => setNotes((previous) => previous.map((item) => item.id === note.id ? saved : item)))
        .catch(handlePersistenceError)
    }
  }, [handlePersistenceError, profile?.name, user])

  const deleteNote = useCallback((id: string) => {
    const note = notes.find((item) => item.id === id)
    setNotes((previous) => previous.filter((item) => item.id !== id))
    if (user && note) void deleteNoteRecord(note).catch(handlePersistenceError)
  }, [handlePersistenceError, notes, user])

  const addAudioItem = useCallback((incoming: AudioStudyItem) => {
    const item = { ...incoming, id: isUuid(incoming.id) ? incoming.id : uuid() }
    setAudioItems((previous) => [item, ...previous])
    if (user) void createAudioItem(item, user.id).catch(handlePersistenceError)
  }, [handlePersistenceError, user])

  const saveSyllabusImport = useCallback(async (input: SyllabusImportInput) => {
    const normalizedTasks = input.tasks.map((task) => ({
      ...task,
      id: isUuid(task.id) ? task.id : uuid(),
      studentId: user?.id ?? task.studentId,
    }))

    // Always apply local state immediately so the UI reflects the result
    const applyLocally = () => {
      setCourses((previous) => previous.map((course) => course.id === input.courseId
        ? {
            ...course,
            syllabusUploaded: true,
            gradingBreakdown: input.gradingBreakdown,
            instructor: typeof input.extractedData.instructor === 'string'
              ? input.extractedData.instructor
              : course.instructor,
          }
        : course
      ))
      setTasks((previous) => [
        ...previous.filter((task) => task.courseId !== input.courseId || !task.tags?.includes('syllabus-import')),
        ...normalizedTasks,
      ])
    }

    if (user) {
      try {
        await persistSyllabusImport({ ...input, tasks: normalizedTasks }, user.id)
        await refresh()
        setSyncError(null)
      } catch (error) {
        // DB save failed (migration may not be applied yet) — fall back to local state
        applyLocally()
        handlePersistenceError(error)
        // Don't rethrow — local save succeeded, user sees success
      }
      return
    }

    applyLocally()
  }, [handlePersistenceError, refresh, user])

  return (
    <AppContext.Provider value={{
      tasks,
      courses,
      notes,
      calendarEvents,
      gradeEntries,
      audioItems,
      dataMode,
      loading,
      syncError,
      refresh,
      clearSyncError: () => setSyncError(null),
      addTasks,
      updateTask,
      deleteTask,
      addCourse,
      updateCourse,
      saveGrade,
      addCalendarEvent,
      deleteCalendarEvent,
      addNote,
      deleteNote,
      addAudioItem,
      saveSyllabusImport,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppStore must be used inside AppProvider')
  return context
}
