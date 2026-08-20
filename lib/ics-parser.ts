import type { Task } from './types'

interface ICSEvent {
  summary: string
  description?: string
  dtStart?: Date
  dtEnd?: Date
  dtDue?: Date
  uid: string
}

function parseICSDate(val: string): Date | undefined {
  // Formats: 20260120T235900Z  or  20260120
  const clean = val.split(';')[0].trim()
  if (clean.length === 8) {
    // date-only: YYYYMMDD
    return new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`)
  }
  if (clean.length >= 15) {
    return new Date(
      `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T${clean.slice(9, 11)}:${clean.slice(11, 13)}:${clean.slice(13, 15)}Z`
    )
  }
  return undefined
}

function unescape(val: string): string {
  return val.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}

export function parseICS(content: string): ICSEvent[] {
  const events: ICSEvent[] = []
  const lines = content.replace(/\r\n|\r/g, '\n').replace(/\n /g, '').split('\n')

  let current: Partial<ICSEvent> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { current = {}; continue }
    if (line === 'END:VEVENT') {
      if (current?.summary && current.uid) events.push(current as ICSEvent)
      current = null
      continue
    }
    if (!current) continue

    const colon = line.indexOf(':')
    if (colon < 0) continue
    const key = line.slice(0, colon).split(';')[0].toUpperCase()
    const val = line.slice(colon + 1).trim()

    switch (key) {
      case 'SUMMARY': current.summary = unescape(val); break
      case 'DESCRIPTION': current.description = unescape(val); break
      case 'UID': current.uid = val; break
      case 'DTSTART': current.dtStart = parseICSDate(val); break
      case 'DTEND': current.dtEnd = parseICSDate(val); break
      case 'DUE': current.dtDue = parseICSDate(val); break
    }
  }

  return events
}

export function icsEventsToTasks(events: ICSEvent[], studentId: string): Omit<Task, 'id'>[] {
  return events
    .filter(e => e.dtDue ?? e.dtStart)
    .map(e => ({
      studentId,
      courseId: undefined,
      title: e.summary,
      description: e.description,
      type: guessType(e.summary),
      status: 'not_started' as const,
      priority: 'medium' as const,
      dueDate: e.dtDue ?? e.dtStart,
      tags: ['lms-import'],
      createdAt: new Date(),
    }))
}

function guessType(title: string): Task['type'] {
  const lower = title.toLowerCase()
  if (/exam|midterm|final|test/.test(lower)) return 'exam'
  if (/quiz/.test(lower)) return 'quiz'
  if (/lab/.test(lower)) return 'lab'
  if (/project/.test(lower)) return 'project'
  if (/read/.test(lower)) return 'reading'
  return 'assignment'
}
