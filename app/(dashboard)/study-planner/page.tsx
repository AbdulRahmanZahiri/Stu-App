'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, AlertTriangle, Sparkles, Upload, Check, Loader2,
  CalendarDays, Clock, BookOpen, Trophy, Zap, ChevronRight,
  X, Link2, FileUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/app-store'
import { useAuth } from '@/lib/auth-context'
import { calculateStreak, streakMessage } from '@/lib/streak'
import { detectConflicts, workloadScore } from '@/lib/conflicts'
import { parseICS, icsEventsToTasks } from '@/lib/ics-parser'

type LMSTab = 'file' | 'url'

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}

const TYPE_ICON: Record<string, string> = {
  exam: '📝', quiz: '❓', project: '🔨', lab: '🔬', reading: '📖', assignment: '✍️', other: '📌',
}

export default function StudyPlannerPage() {
  const { tasks, calendarEvents, addTasks } = useAppStore()
  const { user } = useAuth()

  const streak = calculateStreak(tasks)
  const conflicts = detectConflicts(tasks)
  const workload = workloadScore(tasks)

  // Smart schedule
  const [schedule, setSchedule] = useState<ScheduleDay[]>([])
  const [scheduling, setScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  // LMS import
  const [lmsTab, setLmsTab] = useState<LMSTab>('file')
  const [lmsUrl, setLmsUrl] = useState('')
  const [lmsFile, setLmsFile] = useState<File | null>(null)
  const [lmsImporting, setLmsImporting] = useState(false)
  const [lmsResult, setLmsResult] = useState<{ count: number } | null>(null)
  const [lmsError, setLmsError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 10)

  async function generateSchedule() {
    setScheduling(true)
    setScheduleError(null)
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: upcomingTasks.map(t => ({
            title: t.title, dueDate: t.dueDate, estimatedHours: t.estimatedHours,
            type: t.type, priority: t.priority,
          })),
          calendarEvents: calendarEvents.slice(0, 20).map(e => ({
            title: e.title, startDate: e.startDate, endDate: e.endDate, type: e.type,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSchedule(data.days ?? [])
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setScheduling(false)
    }
  }

  const importICS = useCallback(async (content: string) => {
    const events = parseICS(content)
    if (!events.length) throw new Error('No events found in this calendar file. Make sure it\'s a valid .ics file.')
    const newTasks = icsEventsToTasks(events, user?.id ?? 'demo-student').map(t => ({
      ...t,
      id: crypto.randomUUID(),
      studentId: user?.id ?? 'demo-student',
    }))
    addTasks(newTasks)
    return newTasks.length
  }, [addTasks, user?.id])

  async function handleLMSImport() {
    setLmsImporting(true)
    setLmsError(null)
    setLmsResult(null)
    try {
      let content = ''
      if (lmsTab === 'file') {
        if (!lmsFile) throw new Error('Select a .ics file first')
        content = await lmsFile.text()
      } else {
        if (!lmsUrl.trim()) throw new Error('Enter a calendar URL')
        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          body: (() => { const f = new FormData(); f.append('url', lmsUrl.trim()); return f })(),
        })
        // For URL approach, fetch the ICS directly from the client
        const icsRes = await fetch(lmsUrl.trim())
        if (!icsRes.ok) throw new Error('Could not fetch calendar URL. Make sure it\'s publicly accessible.')
        content = await icsRes.text()
      }
      if (!content.includes('BEGIN:VCALENDAR')) throw new Error('This doesn\'t look like a valid .ics calendar file.')
      const count = await importICS(content)
      setLmsResult({ count })
      setLmsFile(null)
      setLmsUrl('')
    } catch (err) {
      setLmsError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLmsImporting(false)
    }
  }

  const daysUntil = (date: Date) => Math.ceil((date.getTime() - Date.now()) / 86_400_000)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900">Study Planner</h1>
        <p className="text-sm text-slate-500 mt-0.5">Smart scheduling, conflict detection, and LMS import — all in one place</p>
      </motion.div>

      {/* Stat row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4">

        {/* Streak */}
        <Card className={cn('border-0 shadow-sm', streak > 0 ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white' : 'bg-white')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className={cn('h-5 w-5', streak > 0 ? 'text-white' : 'text-orange-400')} />
              <span className={cn('text-xs font-semibold', streak > 0 ? 'text-white/80' : 'text-slate-500')}>Study Streak</span>
            </div>
            <p className={cn('text-3xl font-black', streak > 0 ? 'text-white' : 'text-slate-800')}>{streak}</p>
            <p className={cn('text-[11px] mt-1 leading-tight', streak > 0 ? 'text-white/70' : 'text-slate-400')}>
              {streakMessage(streak)}
            </p>
          </CardContent>
        </Card>

        {/* Workload */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-500">This Week's Load</span>
            </div>
            <p className="text-3xl font-black text-slate-800">{workload}<span className="text-base font-normal text-slate-400">%</span></p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
              <div className={cn('h-full rounded-full transition-all', workload > 75 ? 'bg-red-400' : workload > 50 ? 'bg-amber-400' : 'bg-emerald-400')}
                style={{ width: `${workload}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Conflicts */}
        <Card className={cn('border-0 shadow-sm', conflicts.length > 0 ? 'bg-red-50 border border-red-100' : 'bg-white')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={cn('h-5 w-5', conflicts.length > 0 ? 'text-red-500' : 'text-slate-300')} />
              <span className="text-xs font-semibold text-slate-500">Conflicts</span>
            </div>
            <p className={cn('text-3xl font-black', conflicts.length > 0 ? 'text-red-600' : 'text-slate-300')}>{conflicts.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">{conflicts.length > 0 ? 'Deadlines too close together' : 'No conflicts detected'}</p>
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-5 w-5 text-blue-500" />
              <span className="text-xs font-semibold text-slate-500">Due This Week</span>
            </div>
            <p className="text-3xl font-black text-slate-800">
              {tasks.filter(t => t.status !== 'completed' && t.dueDate && daysUntil(new Date(t.dueDate)) <= 7 && daysUntil(new Date(t.dueDate)) > 0).length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">tasks remaining</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Conflict warnings */}
      <AnimatePresence>
        {conflicts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card className="border border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="text-sm font-bold text-red-800">Schedule Conflicts Detected</p>
                  <Badge variant="error" className="ml-auto text-[10px]">The Cushion™</Badge>
                </div>
                <div className="space-y-2">
                  {conflicts.map((c, i) => (
                    <div key={i} className={cn(
                      'flex items-center gap-2 rounded-xl border p-3 text-xs',
                      c.severity === 'high' ? 'bg-red-100 border-red-200' : 'bg-orange-50 border-orange-200'
                    )}>
                      <span className="font-semibold text-slate-700 truncate flex-1">{c.taskA.title}</span>
                      <span className="text-slate-400 shrink-0">⟷ {Math.round(c.gapHours)}h apart</span>
                      <span className="font-semibold text-slate-700 truncate flex-1 text-right">{c.taskB.title}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-red-600">💡 Tip: Start earlier on these tasks to avoid last-minute cramming. Use the AI scheduler below to redistribute your workload.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Smart Schedule ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  AI Smart Scheduler
                </CardTitle>
                <Button size="sm" className="gap-1.5 text-xs h-8" onClick={generateSchedule} disabled={scheduling || !upcomingTasks.length}>
                  {scheduling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {scheduling ? 'Scheduling...' : 'Generate My Schedule'}
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-1">AI analyzes your upcoming deadlines and calendar to create an optimal study plan with time blocks.</p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {scheduleError && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {scheduleError}
                </div>
              )}

              {!schedule.length && !scheduling && (
                <div className="py-10 text-center">
                  <CalendarDays className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                  <p className="text-sm font-medium text-slate-400">No schedule yet</p>
                  <p className="text-xs text-slate-300 mt-1">Click "Generate My Schedule" — AI will plan your week</p>
                </div>
              )}

              {scheduling && (
                <div className="py-10 text-center">
                  <Loader2 className="mx-auto mb-3 h-8 w-8 text-emerald-400 animate-spin" />
                  <p className="text-sm text-slate-500">Building your personalized study plan...</p>
                </div>
              )}

              <div className="space-y-3">
                {schedule.map((day, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-xs font-bold text-slate-700">{day.day}</p>
                      {day.note && <span className="text-[10px] text-slate-400 italic">— {day.note}</span>}
                    </div>
                    <div className="space-y-1.5 pl-3 border-l-2 border-emerald-100">
                      {(day.sessions ?? []).map((s, j) => (
                        <div key={j} className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                          <div className="shrink-0">
                            <Clock className="h-3.5 w-3.5 text-emerald-500 mt-0.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono text-slate-400">{s.time}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{s.hours}h</Badge>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 mt-0.5">{s.task}</p>
                            {s.goal && <p className="text-[11px] text-slate-400 mt-0.5">{s.goal}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming tasks quick view */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-500" />
                Upcoming Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {upcomingTasks.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">No upcoming tasks. Add some from the Tasks page.</p>
              )}
              {upcomingTasks.map(task => {
                const days = task.dueDate ? daysUntil(new Date(task.dueDate)) : null
                return (
                  <div key={task.id} className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 transition-colors',
                    days !== null && days <= 2 ? 'border-red-200 bg-red-50' : days !== null && days <= 5 ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-white'
                  )}>
                    <span className="text-base shrink-0">{TYPE_ICON[task.type] ?? '📌'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{task.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'No due date'}
                        {task.estimatedHours ? ` · ~${task.estimatedHours}h` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn('text-[10px] border', PRIORITY_COLOR[task.priority])}>{task.priority}</Badge>
                      {days !== null && (
                        <span className={cn('text-[10px] font-bold', days <= 2 ? 'text-red-600' : days <= 5 ? 'text-amber-600' : 'text-slate-400')}>
                          {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `${days}d`}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Streak card */}
          {streak > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="bg-gradient-to-br from-orange-500 to-amber-500 border-0 text-white overflow-hidden relative">
                <div className="absolute right-0 top-0 opacity-10 text-[80px] leading-none">🔥</div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="h-5 w-5 text-yellow-200" />
                    <span className="text-sm font-bold text-white/90">Streak Achievement</span>
                  </div>
                  <p className="text-5xl font-black text-white mt-2">{streak}</p>
                  <p className="text-sm text-white/80 mt-1">day{streak !== 1 ? 's' : ''} in a row</p>
                  <p className="text-xs text-white/60 mt-2">{streakMessage(streak)}</p>
                  <div className="flex gap-1 mt-3">
                    {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
                      <div key={i} className="h-2 flex-1 rounded-full bg-white/40" />
                    ))}
                    {Array.from({ length: Math.max(0, 7 - streak) }).map((_, i) => (
                      <div key={i} className="h-2 flex-1 rounded-full bg-white/20" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* LMS Import */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-emerald-500" />
                Import from LMS
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1">Import assignments from Brightspace, Canvas, or Moodle using their calendar export.</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* How to get ICS */}
              <div className="mb-3 rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">How to export from your LMS:</p>
                <ul className="space-y-0.5 text-blue-600">
                  <li><ChevronRight className="inline h-3 w-3" /><strong>Brightspace:</strong> Calendar → Subscribe → Copy/Download .ics</li>
                  <li><ChevronRight className="inline h-3 w-3" /><strong>Canvas:</strong> Calendar → Calendar Feed → Download</li>
                  <li><ChevronRight className="inline h-3 w-3" /><strong>Moodle:</strong> Calendar → Export → All events → Export</li>
                </ul>
              </div>

              {/* Tabs */}
              <div className="mb-3 flex rounded-xl bg-slate-100 p-0.5">
                {([{ id: 'file', icon: FileUp, label: '.ics File' }, { id: 'url', icon: Link2, label: 'Calendar URL' }] as const).map(t => (
                  <button key={t.id} onClick={() => setLmsTab(t.id)}
                    className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all',
                      lmsTab === t.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                    <t.icon className="h-3 w-3" />{t.label}
                  </button>
                ))}
              </div>

              {lmsTab === 'file' ? (
                <div>
                  <input ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden"
                    onChange={e => setLmsFile(e.target.files?.[0] ?? null)} />
                  <button onClick={() => fileRef.current?.click()}
                    className={cn('w-full rounded-xl border-2 border-dashed p-4 text-center transition-all',
                      lmsFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50')}>
                    {lmsFile ? (
                      <><Check className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
                        <p className="text-xs font-medium text-emerald-700 truncate">{lmsFile.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Click to change</p></>
                    ) : (
                      <><Upload className="mx-auto mb-1 h-4 w-4 text-slate-400" />
                        <p className="text-xs font-medium text-slate-600">Upload .ics calendar file</p></>
                    )}
                  </button>
                </div>
              ) : (
                <input value={lmsUrl} onChange={e => setLmsUrl(e.target.value)}
                  placeholder="https://your-lms.edu/calendar/feed.ics"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-300 focus:outline-none focus:bg-white transition-all" />
              )}

              {lmsError && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 p-2.5 text-xs text-rose-600">
                  <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />{lmsError}
                </div>
              )}
              {lmsResult && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-2.5 text-xs text-emerald-700 font-medium">
                  <Check className="h-3.5 w-3.5 shrink-0" />Imported {lmsResult.count} tasks from your LMS!
                </div>
              )}

              <Button className="mt-3 w-full gap-1.5 text-xs h-8" onClick={handleLMSImport}
                disabled={lmsImporting || (lmsTab === 'file' ? !lmsFile : !lmsUrl.trim())}>
                {lmsImporting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Importing...</> : <><Upload className="h-3.5 w-3.5" />Import Assignments</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

interface ScheduleSession { time: string; task: string; goal?: string; hours: number }
interface ScheduleDay { day: string; date?: string; sessions?: ScheduleSession[]; note?: string }
