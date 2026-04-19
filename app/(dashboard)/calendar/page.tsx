'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, addMonths, subMonths,
  startOfWeek, endOfWeek,
} from 'date-fns'
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { mockCalendarEvents } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const eventTypeConfig = {
  deadline: { label: 'Deadline', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  exam: { label: 'Exam', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  class: { label: 'Class', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  reminder: { label: 'Reminder', bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  personal: { label: 'Personal', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  function getEventsForDay(date: Date) {
    return mockCalendarEvents.filter((e) => isSameDay(new Date(e.startDate), date))
  }

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : []

  const upcomingEvents = mockCalendarEvents
    .filter((e) => new Date(e.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 6)

  return (
    <div className="p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">Track deadlines, exams, and important dates</p>
        </div>
        <div className="flex gap-2">
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
                  onClick={() => setCurrentDate((d) => subMonths(d, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-base font-bold text-slate-900">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentDate((d) => addMonths(d, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-violet-600"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {/* Day headers */}
              <div className="mb-2 grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-1 text-center text-[11px] font-semibold text-slate-400">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
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
                        isSelected ? 'bg-violet-600 text-white' : today ? 'bg-violet-50 border border-violet-200' : 'hover:bg-slate-50',
                      )}
                    >
                      <span className={cn(
                        'text-xs font-semibold leading-none',
                        isSelected ? 'text-white' : today ? 'text-violet-700' : 'text-slate-700'
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
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a day'}
              </CardTitle>
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
                          <Badge className={cn('shrink-0 text-[9px]', config.bg, config.text, 'border-0')}>
                            {config.label}
                          </Badge>
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
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
