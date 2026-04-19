'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Plus, Check, Clock, Search, ListTodo, Bell, X, Trash2, Pencil,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mockTasks, mockCourses } from '@/lib/mock-data'
import { formatRelativeDate, getPriorityColor, getDueDateStatus, cn } from '@/lib/utils'
import { useTaskNotifications } from '@/hooks/useTaskNotifications'
import type { Task } from '@/lib/types'

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const NO_COURSE_VALUE = '__no_course__'

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseLocalDateTimeInputValue(value: string): Date | undefined {
  if (!value) return undefined

  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return undefined

  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)

  if (
    Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) ||
    Number.isNaN(hour) || Number.isNaN(minute)
  ) {
    return undefined
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="p-6 lg:p-8">
        <p className="text-sm text-slate-500">Loading tasks...</p>
      </div>
    }>
      <TasksPageContent />
    </Suspense>
  )
}

function TasksPageContent() {
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const [notifDismissed, setNotifDismissed] = useState(false)

  useTaskNotifications(tasks)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission)
    }
  }, [])

  const blankTask = {
    title: '', courseId: '', type: 'assignment' as Task['type'],
    priority: 'medium' as Task['priority'], dueDate: '', estimatedHours: '',
  }
  const [form, setForm] = useState(blankTask)

  const filtered = tasks
    .filter((t) => {
      if (!search) return true
      return t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.courseCode?.toLowerCase().includes(search.toLowerCase())
    })
    .filter((t) => {
      if (filter === 'all') return true
      if (filter === 'today') return !!t.dueDate && getDueDateStatus(t.dueDate) === 'urgent'
      if (filter === 'overdue') return t.status === 'overdue'
      if (filter === 'completed') return t.status === 'completed'
      if (filter === 'in_progress') return t.status === 'in_progress'
      return true
    })
    .sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 99
      const pb = priorityOrder[b.priority] ?? 99
      if (pa !== pb) return pa - pb
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      return 0
    })

  function toggleComplete(id: string) {
    setTasks((prev) => prev.map((t) =>
      t.id === id
        ? { ...t, status: t.status === 'completed' ? 'not_started' : 'completed', completedAt: t.status !== 'completed' ? new Date() : undefined }
        : t
    ))
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function openAdd() {
    setForm(blankTask)
    setEditTask(null)
    setShowAdd(true)
  }

  function openEdit(task: Task) {
    setForm({
      title: task.title,
      courseId: task.courseId ?? '',
      type: task.type,
      priority: task.priority,
      dueDate: task.dueDate ? toLocalDateTimeInputValue(new Date(task.dueDate)) : '',
      estimatedHours: task.estimatedHours?.toString() ?? '',
    })
    setEditTask(task)
    setShowAdd(true)
  }

  function saveTask() {
    if (!form.title.trim()) return
    const course = mockCourses.find((c) => c.id === form.courseId)
    const parsedDueDate = parseLocalDateTimeInputValue(form.dueDate)
    if (editTask) {
      setTasks((prev) => prev.map((t) => t.id === editTask.id ? {
        ...t,
        title: form.title.trim(),
        courseId: form.courseId || undefined,
        courseCode: course?.code,
        courseColor: course?.color,
        type: form.type,
        priority: form.priority,
        dueDate: parsedDueDate,
        estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
      } : t))
    } else {
      const task: Task = {
        id: `task-${Date.now()}`,
        studentId: 'demo',
        title: form.title.trim(),
        courseId: form.courseId || undefined,
        courseCode: course?.code,
        courseColor: course?.color,
        type: form.type,
        status: 'not_started',
        priority: form.priority,
        dueDate: parsedDueDate,
        estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
        tags: [],
      }
      setTasks((prev) => [task, ...prev])
    }
    setShowAdd(false)
    setEditTask(null)
  }

  function clearCompleted() {
    setTasks((prev) => prev.filter((t) => t.status !== 'completed'))
  }

  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam && ['all', 'in_progress', 'today', 'overdue', 'completed'].includes(filterParam)) {
      setFilter(filterParam)
    }

    const compose = searchParams.get('compose')
    if (compose) {
      openAdd()
    }
  }, [searchParams])

  const completed = tasks.filter((t) => t.status === 'completed').length
  const total = tasks.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">Manage all your assignments, quizzes, and exams</p>
        </div>
        <div className="flex items-center gap-2">
          {completed > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={clearCompleted}>
              <Trash2 className="h-3.5 w-3.5" />
              Clear Done ({completed})
            </Button>
          )}
          <Button variant="gradient" size="sm" className="gap-1.5" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>
      </motion.div>

      {/* Notification banner */}
      {!notifDismissed && notifPermission === 'default' && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
          <Bell className="h-4 w-4 text-violet-600 shrink-0" />
          <p className="flex-1 text-xs text-violet-700">
            <strong>Enable notifications</strong> to get alerts when tasks are due soon or overdue.
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs border-violet-200 text-violet-700 hover:bg-violet-100"
            onClick={async () => {
              const result = await Notification.requestPermission()
              setNotifPermission(result)
              setNotifDismissed(true)
            }}>
            Enable
          </Button>
          <button onClick={() => setNotifDismissed(true)} className="text-violet-400 hover:text-violet-600">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Progress */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Semester Progress</p>
                <p className="text-xs text-slate-400">{completed} of {total} tasks completed</p>
              </div>
              <span className="text-xl font-extrabold text-violet-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" indicatorClassName="bg-gradient-to-r from-violet-500 to-indigo-500" />
            <div className="mt-4 grid grid-cols-4 gap-4 border-t border-slate-50 pt-4">
              {[
                { label: 'Total', value: total, color: 'text-slate-700' },
                { label: 'Completed', value: completed, color: 'text-emerald-600' },
                { label: 'In Progress', value: tasks.filter((t) => t.status === 'in_progress').length, color: 'text-blue-600' },
                { label: 'Overdue', value: tasks.filter((t) => t.status === 'overdue').length, color: 'text-rose-600' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters + Search */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 rounded-xl pl-8 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'today', label: 'Due Today' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'completed', label: 'Completed' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-medium transition-all border',
                filter === f.id
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Task list */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center">
            <ListTodo className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No tasks found</p>
            <p className="text-xs text-slate-400">Try adjusting your search or filter</p>
            <Button variant="gradient" size="sm" className="mt-4 gap-1.5" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5" />Add Task
            </Button>
          </div>
        ) : (
          filtered.map((task, i) => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <TaskRow task={task} onToggle={toggleComplete} onEdit={openEdit} onDelete={deleteTask} />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Add / Edit Task Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditTask(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-medium text-slate-700 mb-1.5 block">Task Title *</Label>
              <Input
                placeholder="e.g. Assignment 3 – Linked Lists"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && saveTask()}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-1.5 block">Course</Label>
                <Select
                  value={form.courseId || NO_COURSE_VALUE}
                  onValueChange={(v) => setForm((p) => ({ ...p, courseId: v === NO_COURSE_VALUE ? '' : v }))}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_COURSE_VALUE}>No course</SelectItem>
                    {mockCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-1.5 block">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as Task['type'] }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['assignment','quiz','exam','project','reading','lab','other'].map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-1.5 block">Due Date</Label>
                <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-1.5 block">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v as Task['priority'] }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low','medium','high','urgent'].map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700 mb-1.5 block">Estimated Hours</Label>
              <Input type="number" placeholder="e.g. 2.5" min="0.5" step="0.5" value={form.estimatedHours} onChange={(e) => setForm((p) => ({ ...p, estimatedHours: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowAdd(false); setEditTask(null) }}>Cancel</Button>
              <Button variant="gradient" size="sm" className="flex-1" onClick={saveTask} disabled={!form.title.trim()}>
                {editTask ? <><Pencil className="h-3.5 w-3.5" />Save Changes</> : <><Plus className="h-3.5 w-3.5" />Add Task</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TaskRow({ task, onToggle, onEdit, onDelete }: {
  task: Task
  onToggle: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}) {
  const isCompleted = task.status === 'completed'
  const statusDate = task.dueDate ? getDueDateStatus(task.dueDate) : 'upcoming'

  return (
    <div className={cn(
      'group flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all hover:shadow-sm',
      isCompleted ? 'border-slate-50 opacity-60' : 'border-slate-100',
      task.status === 'overdue' && !isCompleted && 'border-rose-100 bg-rose-50/30'
    )}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-violet-400'
        )}
      >
        {isCompleted && <Check className="h-3 w-3" />}
      </button>

      <div className="h-3 w-1 shrink-0 rounded-full" style={{ backgroundColor: task.courseColor || '#6366f1' }} />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <p className={cn('text-sm font-medium', isCompleted ? 'line-through text-slate-400' : 'text-slate-800')}>
            {task.title}
          </p>
          <Badge variant={task.type === 'exam' ? 'error' : task.type === 'quiz' ? 'warning' : 'violet'} className="text-[9px] py-0 px-1.5">
            {task.type}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400">{task.courseCode}</span>
          {task.estimatedHours && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" />~{task.estimatedHours}h
            </span>
          )}
        </div>
      </div>

      {/* Due date + priority */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        {task.dueDate && (
          <p className={cn('text-xs font-semibold',
            statusDate === 'overdue' ? 'text-rose-600' :
            statusDate === 'urgent' ? 'text-amber-600' :
            statusDate === 'soon' ? 'text-orange-500' : 'text-slate-500'
          )}>
            {formatRelativeDate(task.dueDate)}
          </p>
        )}
        <Badge className={cn('text-[9px] py-0', getPriorityColor(task.priority))}>
          {task.priority}
        </Badge>
      </div>

      {/* Edit / Delete — visible on hover */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(task)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onDelete(task.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
