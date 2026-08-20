import type { Task } from './types'

export function calculateStreak(tasks: Task[]): number {
  const completedDates = tasks
    .filter(t => t.status === 'completed' && t.completedAt)
    .map(t => {
      const d = new Date(t.completedAt!)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })

  const unique = [...new Set(completedDates)].sort().reverse()
  if (!unique.length) return 0

  function key(d: Date) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }

  const today = key(new Date())
  const yesterday = key(new Date(Date.now() - 86_400_000))

  // Streak is only active if something was done today or yesterday
  if (unique[0] !== today && unique[0] !== yesterday) return 0

  let streak = 0
  let check = unique[0] === today ? new Date() : new Date(Date.now() - 86_400_000)

  for (const dateStr of unique) {
    if (dateStr === key(check)) {
      streak++
      check = new Date(check.getTime() - 86_400_000)
    } else {
      break
    }
  }

  return streak
}

export function streakMessage(streak: number): string {
  if (streak === 0) return 'Complete a task today to start your streak!'
  if (streak === 1) return '1 day streak — keep it going!'
  if (streak < 7) return `${streak} day streak — you're building momentum!`
  if (streak < 14) return `${streak} days strong — impressive!`
  if (streak < 30) return `${streak} day streak — you're on fire!`
  return `${streak} day streak — absolute legend!`
}
