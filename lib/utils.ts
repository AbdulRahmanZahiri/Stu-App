import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isTomorrow, differenceInDays, isPast } from 'date-fns'
import type { Task } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date, formatStr: string = 'MMM d, yyyy'): string {
  return format(date, formatStr)
}

export function formatRelativeDate(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  const diff = differenceInDays(date, new Date())
  if (diff < 0) return `${Math.abs(diff)} days ago`
  if (diff < 7) return `In ${diff} days`
  return format(date, 'MMM d')
}

export function getDueDateStatus(date: Date): 'overdue' | 'urgent' | 'soon' | 'upcoming' {
  if (isPast(date)) return 'overdue'
  const diff = differenceInDays(date, new Date())
  if (diff === 0) return 'urgent'
  if (diff <= 3) return 'soon'
  return 'upcoming'
}

export function getEffectiveTaskStatus(task: Pick<Task, 'status' | 'dueDate'>): Task['status'] {
  if (task.status === 'completed') return 'completed'
  if (task.dueDate && getDueDateStatus(new Date(task.dueDate)) === 'overdue') return 'overdue'
  return task.status === 'overdue' ? 'not_started' : task.status
}

export function percentToLetter(pct: number): string {
  if (pct >= 90) return 'A+'
  if (pct >= 85) return 'A'
  if (pct >= 80) return 'A-'
  if (pct >= 75) return 'B+'
  if (pct >= 70) return 'B'
  if (pct >= 65) return 'B-'
  if (pct >= 60) return 'C+'
  if (pct >= 55) return 'C'
  if (pct >= 50) return 'C-'
  if (pct >= 45) return 'D'
  return 'F'
}

export function getLetterGrade(percentage: number): string {
  return percentToLetter(percentage)
}

export function getGradeColor(percentage: number): string {
  if (percentage >= 85) return 'text-emerald-600'
  if (percentage >= 70) return 'text-blue-600'
  if (percentage >= 60) return 'text-amber-600'
  return 'text-rose-600'
}

export function getGradeRingColor(percentage: number): string {
  if (percentage >= 85) return 'text-emerald-500'
  if (percentage >= 70) return 'text-blue-500'
  if (percentage >= 60) return 'text-amber-500'
  return 'text-rose-500'
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'bg-rose-100 text-rose-700 border-rose-200'
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'low': return 'bg-slate-100 text-slate-600 border-slate-200'
    default: return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'overdue': return 'bg-rose-100 text-rose-700 border-rose-200'
    case 'not_started': return 'bg-slate-100 text-slate-600 border-slate-200'
    default: return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return `${str.slice(0, length)}...`
}
