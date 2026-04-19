import { useEffect, useRef } from 'react'
import type { Task } from '@/lib/types'

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

async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
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

  useEffect(() => {
    requestPermission().then((granted) => {
      hasPermission.current = granted
    })
  }, [])

  useEffect(() => {
    if (!hasPermission.current) return

    const now = new Date()
    const notified = getNotifiedSet()

    for (const task of tasks) {
      if (task.status === 'completed' || !task.dueDate) continue

      const due = new Date(task.dueDate)
      const diffMs = due.getTime() - now.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)

      // Overdue
      if (diffMs < 0 && !notified.has(`${task.id}-overdue`)) {
        sendNotification(
          '⚠️ Task Overdue',
          `"${task.title}" was due ${task.courseCode ? `for ${task.courseCode}` : ''} and is now overdue.`,
          `${task.id}-overdue`
        )
        markNotified(`${task.id}-overdue`)
      }

      // Due in < 24 hours
      else if (diffHours > 0 && diffHours <= 24 && !notified.has(`${task.id}-24h`)) {
        sendNotification(
          '📅 Due Tomorrow',
          `"${task.title}" is due in ${Math.round(diffHours)} hours${task.courseCode ? ` (${task.courseCode})` : ''}.`,
          `${task.id}-24h`
        )
        markNotified(`${task.id}-24h`)
      }

      // Due in < 1 hour
      else if (diffHours > 0 && diffHours <= 1 && !notified.has(`${task.id}-1h`)) {
        sendNotification(
          '🔔 Due Very Soon!',
          `"${task.title}" is due in less than 1 hour${task.courseCode ? ` (${task.courseCode})` : ''}.`,
          `${task.id}-1h`
        )
        markNotified(`${task.id}-1h`)
      }
    }
  }, [tasks])
}
