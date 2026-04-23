'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { mockTasks, mockCourses } from './mock-data'
import type { Task, Course } from './types'

export type Plan = 'free' | 'pro'

interface AppStore {
  tasks: Task[]
  courses: Course[]
  plan: Plan
  setPlan: (plan: Plan) => void
  addTasks: (tasks: Task[]) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  addCourse: (course: Course) => void
  updateCourse: (id: string, patch: Partial<Course>) => void
}

const AppContext = createContext<AppStore | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [courses, setCourses] = useState<Course[]>(mockCourses)
  const [plan, setPlan] = useState<Plan>('free')

  const addTasks = useCallback((newTasks: Task[]) => {
    setTasks((prev) => {
      const existingIds = new Set(prev.map((t) => t.id))
      return [...prev, ...newTasks.filter((t) => !existingIds.has(t.id))]
    })
  }, [])

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addCourse = useCallback((course: Course) => {
    setCourses((prev) => [...prev, course])
  }, [])

  const updateCourse = useCallback((id: string, patch: Partial<Course>) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  return (
    <AppContext.Provider value={{ tasks, courses, plan, setPlan, addTasks, updateTask, deleteTask, addCourse, updateCourse }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used inside AppProvider')
  return ctx
}
