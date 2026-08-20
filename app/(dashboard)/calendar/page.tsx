'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, addMonths, subMonths,
  startOfWeek, endOfWeek, addWeeks, subWeeks,
} from 'date-fns'
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock, Plus, Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/lib/app-store'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/lib/types'

const eventTypeConfig = {
  deadline: { label: 'Deadline', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  exam: { label: 'Exam', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  class: { label: 'Class', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  reminder: { label: 'Reminder', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  personal: { label: 'Personal', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
}

export default function CalendarPage() {
  const { calendarEvents, tasks, courses, addCalendarEvent, deleteCalendarEvent } = useAppStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'personal' as CalendarEvent['type'],
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    allDay: false,
    courseId: '',
    location: '',
    description: '',
  })

  const events = useMemo(() => {
    const existingTaskKeys = new Set(calendarEvents.map((event) => `${event.courseId ?? ''}:${event.title}:${event.startDate.toISOString()}`))
    const taskEvents: CalendarEvent[] = tasks.flatMap((task) => {
      if (!task.dueDate || task.status === 'completed') return []
      const key = `${task.courseId ?? ''}:${task.title}:${task.dueDate.toISOString()}`
      if (existingTaskKeys.has(key)) return []
      return [{
        id: `task-${task.id}`,
        studentId: task.studentId,
        courseId: task.courseId,
        title: task.title,
        type: task.type === 'exam' || task.type === 'quiz' ? 'exam' : 'deadline',
        startDate: task.dueDate,
        allDay: false,
        color: task.courseColor,
        description: task.description,
        courseCode: task.courseCode,
      }]
    })
    return [...calendarEvents, ...taskEvents]
  }, [calendarEvents, tasks])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const weekStart = startOfWeek(currentDate)
  const weekEnd = endOfWeek(currentDate)
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`

  function navigate(dir: 1 | -1) {
    setCurrentDate((d) =>
      view === 'week'
        ? dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)
        : dir === 1 ? addMonths(d, 1) : subMonths(d, 1)
    )
  }

  function getEventsForDay(date: Date) {
    return events.filter((event) => isSameDay(new Date(event.startDate), date))
  }

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : []

  const upcomingEvents = events
    .filter((e) => new Date(e.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 6)

  function openAddEvent(date = selectedDate ?? new Date()) {
    setEventForm((form) => ({ ...form, date: format(date, 'yyyy-MM-dd') }))
    setShowAddEvent(true)
  }

  function createEvent() {
    const title = eventForm.title.trim()
    if (!title || !eventForm.date) return
    const startDate = new Date(`${eventForm.date}T${eventForm.allDay ? '12:00' : eventForm.time || '09:00'}:00`)
    if (Number.isNaN(startDate.getTime())) return
    const course = courses.find((item) => item.id === eventForm.courseId)
    addCalendarEvent({
      id: crypto.randomUUID(),
      studentId: '',
      courseId: course?.id,
      courseCode: course?.code,
      title,
      type: eventForm.type,
      startDate,
      allDay: eventForm.allDay,
      color: course?.color,
      location: eventForm.location.trim() || undefined,
      description: eventForm.description.trim() || undefined,
    })
    setSelectedDate(startDate)
    setCurrentDate(startDate)
    setEventForm({ title: '', type: 'personal', date: format(startDate, 'yyyy-MM-dd'), time: '09:00', allDay: false, courseId: '', location: '', description: '' })
    setShowAddEvent(false)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">Track deadlines, exams, and important dates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="gradient" size="sm" className="gap-1.5 text-xs" onClick={() => openAddEvent()}><Plus className="h-3.5 w-3.5" />Add Event</Button>
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('month')}
            className="text-xs"
          >
            Month
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
            className="text-xs"
          >
            Week
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => navigate(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-base font-bold text-slate-900">
                  {view === 'week' ? weekLabel : format(currentDate, 'MMMM yyyy')}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => navigate(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-600"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {view === 'month' ? (
                <>
                  {/* Day headers */}
                  <div className="mb-2 grid grid-cols-7 gap-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <div key={d} className="py-1 text-center text-[11px] font-semibold text-slate-400">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Month day cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {calDays.map((day) => {
                      const dayEvents = getEventsForDay(day)
                      const isCurrentMonth = isSameMonth(day, currentDate)
                      const isSelected = selectedDate && isSameDay(day, selectedDate)
                      const today = isToday(day)

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            'relative flex min-h-[56px] flex-col rounded-lg p-1 text-left transition-all',
                            !isCurrentMonth && 'opacity-30',
                            isSelected ? 'bg-emerald-600 text-white' : today ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50',
                          )}
                        >
                          <span className={cn(
                            'text-xs font-semibold leading-none',
                            isSelected ? 'text-white' : today ? 'text-emerald-700' : 'text-slate-700'
                          )}>
                            {format(day, 'd')}
                          </span>
                          <div className="mt-1 space-y-0.5">
                            {dayEvents.slice(0, 2).map((event) => {
                              const config = eventTypeConfig[event.type]
                              return (
                                <div
                                  key={event.id}
                                  className={cn(
                                    'truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight',
                                    isSelected ? 'bg-white/20 text-white' : `${config.bg} ${config.text}`
                                  )}
                                >
                                  {event.title}
                                </div>
                              )
                            })}
                            {dayEvents.length > 2 && (
                              <span className={cn('text-[9px]', isSelected ? 'text-white/70' : 'text-slate-400')}>
                                +{dayEvents.length - 2} more
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : (
                /* Week view */
                <div className="grid grid-cols-7 gap-1.5">
                  {weekDays.map((day) => {
                    const dayEvents = getEventsForDay(day)
                    const today = isToday(day)
                    const isSelected = selectedDate && isSameDay(day, selectedDate)

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          'flex min-h-[160px] flex-col rounded-xl border p-2 transition-all',
                          today ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100',
                          isSelected && !today && 'border-emerald-200 bg-slate-50',
                        )}
                      >
                        <button
                          onClick={() => setSelectedDate(day)}
                          className="mb-2 w-full text-center"
                        >
                          <p className={cn(
                            'text-[10px] font-semibold uppercase tracking-wide',
                            today ? 'text-emerald-500' : 'text-slate-400'
                          )}>
                            {format(day, 'EEE')}
                          </p>
                          <p className={cn(
                            'text-lg font-bold leading-tight',
                            today ? 'text-emerald-700' : 'text-slate-700',
                            isSelected && today && 'underline decoration-2 underline-offset-2',
                          )}>
                            {format(day, 'd')}
                          </p>
                        </button>
                        <div className="flex flex-col gap-1">
                          {dayEvents.length === 0 && (
                            <p className="text-[9px] text-slate-300 text-center mt-2">—</p>
                          )}
                          {dayEvents.map((event) => {
                            const config = eventTypeConfig[event.type]
                            return (
                              <div
                                key={event.id}
                                className={cn('rounded px-1.5 py-1 text-[9px] font-medium leading-snug', config.bg, config.text)}
                              >
                                <p className="truncate">{event.title}</p>
                                {!event.allDay && (
                                  <p className="opacity-70">{format(new Date(event.startDate), 'h:mm a')}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-50 pt-4">
                {Object.entries(eventTypeConfig).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${config.dot}`} />
                    <span className="text-[11px] text-slate-500">{config.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right panel: selected day + upcoming */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Selected day events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">{selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a day'}</CardTitle>
              {selectedDate && <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-emerald-600" onClick={() => openAddEvent(selectedDate)}><Plus className="h-3 w-3" />Add</Button>}
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {selectedEvents.length === 0 ? (
                <div className="py-6 text-center">
                  <CalendarDays className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                  <p className="text-xs text-slate-400">No events on this day</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((event) => {
                    const config = eventTypeConfig[event.type]
                    return (
                      <div key={event.id} className={cn('rounded-xl p-3', config.bg)}>
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm font-semibold', config.text)}>{event.title}</p>
                          <div className="flex items-center gap-1"><Badge className={cn('shrink-0 text-[9px]', config.bg, config.text, 'border-0')}>{config.label}</Badge>{!event.id.startsWith('task-') && <button type="button" onClick={() => deleteCalendarEvent(event.id)} className={cn('rounded p-1 opacity-60 hover:bg-white/60 hover:opacity-100', config.text)} aria-label={`Delete ${event.title}`}><Trash2 className="h-3 w-3" /></button>}</div>
                        </div>
                        {event.courseCode && (
                          <p className={cn('mt-0.5 text-xs', config.text, 'opacity-70')}>{event.courseCode}</p>
                        )}
                        {!event.allDay && (
                          <div className="mt-1 flex items-center gap-1">
                            <Clock className={cn('h-3 w-3', config.text, 'opacity-60')} />
                            <span className={cn('text-[10px]', config.text, 'opacity-70')}>
                              {format(new Date(event.startDate), 'h:mm a')}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming events */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-2.5">
                {upcomingEvents.map((event) => {
                  const config = eventTypeConfig[event.type]
                  return (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', config.dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-700 truncate">{event.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {format(new Date(event.startDate), 'MMM d')}
                          {event.courseCode && ` · ${event.courseCode}`}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {upcomingEvents.length === 0 && <p className="py-4 text-center text-xs text-slate-400">No upcoming events.</p>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle><DialogDescription>Create a personal event, class, reminder, or exam.</DialogDescription></DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={eventForm.title} onChange={(event) => setEventForm((form) => ({ ...form, title: event.target.value }))} placeholder="Study group, office hours..." autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type</Label><Select value={eventForm.type} onValueChange={(type: CalendarEvent['type']) => setEventForm((form) => ({ ...form, type }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(eventTypeConfig).map(([value, config]) => <SelectItem key={value} value={value}>{config.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Course</Label><Select value={eventForm.courseId || 'none'} onValueChange={(courseId) => setEventForm((form) => ({ ...form, courseId: courseId === 'none' ? '' : courseId }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No course</SelectItem>{courses.filter((course) => course.status === 'active').map((course) => <SelectItem key={course.id} value={course.id}>{course.code}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={eventForm.date} onChange={(event) => setEventForm((form) => ({ ...form, date: event.target.value }))} /></div><div className="space-y-1.5"><Label>Time</Label><Input type="time" value={eventForm.time} onChange={(event) => setEventForm((form) => ({ ...form, time: event.target.value }))} disabled={eventForm.allDay} /></div></div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3"><div><p className="text-sm font-medium text-slate-700">All-day event</p><p className="text-xs text-slate-400">Hide the event time</p></div><Switch checked={eventForm.allDay} onCheckedChange={(allDay) => setEventForm((form) => ({ ...form, allDay }))} /></div>
            <div className="space-y-1.5"><Label>Location</Label><Input value={eventForm.location} onChange={(event) => setEventForm((form) => ({ ...form, location: event.target.value }))} placeholder="Room or meeting link" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={eventForm.description} onChange={(event) => setEventForm((form) => ({ ...form, description: event.target.value }))} placeholder="Optional details" /></div>
            <div className="flex gap-2 pt-1"><Button variant="outline" size="sm" className="flex-1" onClick={() => setShowAddEvent(false)}>Cancel</Button><Button variant="gradient" size="sm" className="flex-1" onClick={createEvent} disabled={!eventForm.title.trim() || !eventForm.date}>Add Event</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
