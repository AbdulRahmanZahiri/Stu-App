import type { Task } from './types'

export interface ConflictWarning {
  taskA: Task
  taskB: Task
  gapHours: number
  severity: 'high' | 'medium'
}

const HEAVY_TYPES = new Set(['exam', 'project'])
const HEAVY_PRIORITIES = new Set(['urgent', 'high'])

export function detectConflicts(tasks: Task[]): ConflictWarning[] {
  const now = new Date()
  const twoWeeks = new Date(now.getTime() + 14 * 86_400_000)

  const upcoming = tasks.filter(t =>
    t.status !== 'completed' &&
    t.dueDate &&
    new Date(t.dueDate) > now &&
    new Date(t.dueDate) <= twoWeeks
  )

  const warnings: ConflictWarning[] = []

  for (let i = 0; i < upcoming.length; i++) {
    for (let j = i + 1; j < upcoming.length; j++) {
      const a = upcoming[i]
      const b = upcoming[j]
      if (!a.dueDate || !b.dueDate) continue

      const gapHours = Math.abs(
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      ) / 3_600_000

      const aHeavy = HEAVY_TYPES.has(a.type) || HEAVY_PRIORITIES.has(a.priority)
      const bHeavy = HEAVY_TYPES.has(b.type) || HEAVY_PRIORITIES.has(b.priority)

      if (gapHours <= 48 && (aHeavy || bHeavy)) {
        warnings.push({
          taskA: a,
          taskB: b,
          gapHours,
          severity: gapHours <= 24 ? 'high' : 'medium',
        })
      }
    }
  }

  // Sort by severity then gap
  return warnings
    .sort((a, b) => a.gapHours - b.gapHours)
    .slice(0, 5)
}

export function workloadScore(tasks: Task[]): number {
  const now = new Date()
  const week = new Date(now.getTime() + 7 * 86_400_000)
  const thisWeek = tasks.filter(t =>
    t.status !== 'completed' && t.dueDate &&
    new Date(t.dueDate) > now && new Date(t.dueDate) <= week
  )
  const score = thisWeek.reduce((acc, t) => {
    const base = t.estimatedHours ?? 1
    const multiplier = t.priority === 'urgent' ? 2 : t.priority === 'high' ? 1.5 : 1
    return acc + base * multiplier
  }, 0)
  return Math.min(100, Math.round((score / 20) * 100))
}
