import { useEffect, useRef } from 'react'
import type { Task } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'

const NOTIFIED_KEY = 'sf_notified_tasks'

function getNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function markNotified(id: string) {
  const set = getNotifiedSet()
  set.add(id)
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]))
}

function sendNotification(title: string, body: string, tag: string) {
  if (Notification.permission !== 'granted') return
  new Notification(title, {
    body,
    tag,
    icon: '/favicon.ico',
  })
}

export function useTaskNotifications(tasks: Task[]) {
  const hasPermission = useRef(false)
  const { profile } = useAuth()
  const deadlineRemindersEnabled = profile?.preferences?.deadlineReminders !== false
  const reminderLeadTime = typeof profile?.preferences?.reminderLeadTime === 'string'
    ? Number.parseInt(profile.preferences.reminderLeadTime, 10) || 24
    : 24

  useEffect(() => {
    hasPermission.current = typeof Notification !== 'undefined' && Notification.permission === 'granted'
  })

  useEffect(() => {
    if (!deadlineRemindersEnabled) return

    function checkDeadlines() {
      if (!hasPermission.current) return
      const now = new Date()
      const notified = getNotifiedSet()

      for (const task of tasks) {
        if (task.status === 'completed' || !task.dueDate) continue
        const due = new Date(task.dueDate)
        const diffMs = due.getTime() - now.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)

        if (diffMs < 0 && !notified.has(`${task.id}-overdue`)) {
          sendNotification('⚠️ Task Overdue', `"${task.title}" ${task.courseCode ? `for ${task.courseCode} ` : ''}is overdue.`, `${task.id}-overdue`)
          markNotified(`${task.id}-overdue`)
        } else if (diffHours > 0 && diffHours <= reminderLeadTime && !notified.has(`${task.id}-${reminderLeadTime}h`)) {
          sendNotification('📅 Due Soon', `"${task.title}" is due in ${Math.max(1, Math.round(diffHours))} hours${task.courseCode ? ` (${task.courseCode})` : ''}.`, `${task.id}-${reminderLeadTime}h`)
          markNotified(`${task.id}-${reminderLeadTime}h`)
        }
      }
    }

    checkDeadlines()
    const interval = window.setInterval(checkDeadlines, 60_000)
    return () => window.clearInterval(interval)
  }, [deadlineRemindersEnabled, reminderLeadTime, tasks])
}
