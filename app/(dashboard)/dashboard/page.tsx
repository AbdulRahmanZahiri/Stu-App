'use client'

import { motion } from 'framer-motion'
import { format, formatDistanceToNow, isToday } from 'date-fns'
import {
  BookOpen, CheckSquare, TrendingUp, Trophy,
  ChevronRight, ChevronUp, ChevronDown,
  FileText, Clock, ArrowRight,
  AlertCircle, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatRelativeDate, getDueDateStatus, getEffectiveTaskStatus, getGradeColor, cn } from '@/lib/utils'
import { useAppStore } from '@/lib/app-store'
import { useAuth } from '@/lib/auth-context'
import { calculateStreak } from '@/lib/streak'
import { detectConflicts } from '@/lib/conflicts'
import { Flame, AlertTriangle, CalendarRange } from 'lucide-react'

const fade = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut', delay: i * 0.06 } }),
}

// Simple SVG sparkline — no external libraries
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const h = 36
  const w = 80
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * h,
  }))
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// Weekly progress line chart
function ProgressChart() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const thisWeek = [62, 71, 68, 76, 80, 78, 85]
  const lastWeek = [50, 58, 63, 62, 70, 72, 75]
  const w = 400; const h = 120
  const minV = 40; const maxV = 100; const range = maxV - minV

  const toPath = (data: number[]) =>
    data.map((v, i) => {
      const x = (i / (data.length - 1)) * (w - 24) + 12
      const y = h - ((v - minV) / range) * (h - 16) - 8
      return `${x},${y}`
    }).join(' ')

  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${w} ${h + 24}`} className="overflow-visible">
        {/* Grid lines */}
        {[40, 55, 70, 85, 100].map((v) => {
          const y = h - ((v - minV) / range) * (h - 16) - 8
          return (
            <g key={v}>
              <line x1={0} y1={y} x2={w} y2={y} stroke="#F1F5F9" strokeWidth="1" />
              <text x={-4} y={y + 4} fontSize="9" fill="#94A3B8" textAnchor="end">{v}%</text>
            </g>
          )
        })}
        {/* Last week (dashed) */}
        <polyline points={toPath(lastWeek)} fill="none" stroke="#CBD5E1" strokeWidth="1.5"
          strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
        {/* This week */}
        <polyline points={toPath(thisWeek)} fill="none" stroke="#059669" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Day labels */}
        {days.map((d, i) => {
          const x = (i / (days.length - 1)) * (w - 24) + 12
          return <text key={d} x={x} y={h + 20} fontSize="9" fill="#94A3B8" textAnchor="middle">{d}</text>
        })}
      </svg>
      {/* Legend */}
      <div className="mt-1 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="h-0.5 w-4 rounded-full bg-emerald-600" /> This Week
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="h-px w-4 border-t border-dashed border-slate-300" /> Last Week
        </span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { tasks, courses } = useAppStore()
  const { profile } = useAuth()
  const streak = calculateStreak(tasks)
  const conflicts = detectConflicts(tasks)
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const activeCourses = courses.filter((c) => c.status === 'active')
  const activeTasks = tasks.filter((t) => t.status !== 'completed')
  const dueTodayCount = activeTasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate))).length
  const overdueCount = tasks.filter((task) => getEffectiveTaskStatus(task) === 'overdue').length
  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0
  const gradedCourses = activeCourses.filter((course) => course.currentGrade !== undefined)
  const avgGrade = gradedCourses.length > 0
    ? gradedCourses.reduce((sum, course) => sum + (course.currentGrade ?? 0), 0) / gradedCourses.length
    : (profile?.gpa ?? 0) * 25
  const topCourses = [...gradedCourses]
    .sort((first, second) => (second.currentGrade ?? 0) - (first.currentGrade ?? 0))
    .slice(0, 4)
  const firstName = profile?.name?.trim().split(/\s+/)[0] || 'Student'

  const upcomingTasks = activeTasks
    .filter((t) => t.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 5)

  const statCards = [
    {
      title: 'Active Courses',
      value: String(activeCourses.length),
      trend: `${activeCourses.length} enrolled`, trendUp: true,
      sub: profile?.semester || 'current term',
      icon: BookOpen, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
      sparkData: [3, 3, 4, 4, 5, 5, activeCourses.length],
      sparkColor: '#059669',
    },
    {
      title: 'Assignments',
      value: String(activeTasks.length),
      trend: `+${dueTodayCount} today`, trendUp: dueTodayCount === 0,
      sub: overdueCount > 0 ? `${overdueCount} overdue` : 'None overdue',
      icon: CheckSquare, iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
      sparkData: [8, 9, 7, 10, 9, activeTasks.length + 2, activeTasks.length],
      sparkColor: '#D97706',
    },
    {
      title: 'Avg Grade',
      value: `${Math.round(avgGrade)}%`,
      trend: `${gradedCourses.length} graded`, trendUp: avgGrade >= 60,
      sub: (profile?.gpa ?? 0) >= 3.7 ? "Dean's List track" : 'Good Standing',
      icon: Trophy, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
      sparkData: [70, 72, 74, 76, 75, 78, Math.round(avgGrade)],
      sparkColor: '#059669',
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      trend: `${completedCount}/${tasks.length}`, trendUp: completionRate >= 50,
      sub: `${completedCount} tasks done`,
      icon: TrendingUp, iconBg: 'bg-sky-50', iconColor: 'text-sky-600',
      sparkData: [55, 58, 60, 63, 65, 68, completionRate],
      sparkColor: '#0284C7',
    },
  ]

  const recentActivities = [
    ...tasks
      .filter((task) => task.status === 'completed')
      .sort((first, second) => (second.completedAt?.getTime() ?? 0) - (first.completedAt?.getTime() ?? 0))
      .slice(0, 3)
      .map((task) => ({
        text: `Completed — ${task.title}`,
        time: task.completedAt ? `${formatDistanceToNow(task.completedAt)} ago` : task.courseCode || 'Task',
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      })),
    ...(overdueCount > 0 ? [{
      text: `${overdueCount} task${overdueCount > 1 ? 's are' : ' is'} overdue`,
      time: 'Needs attention',
      icon: AlertCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    }] : []),
    ...activeTasks.slice(0, 2).map((task) => ({
      text: `Upcoming — ${task.title}`,
      time: task.dueDate ? formatRelativeDate(task.dueDate) : task.courseCode || 'Task',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    })),
    ...activeCourses.filter((course) => course.syllabusUploaded).slice(0, 2).map((course) => ({
      text: `Syllabus imported — ${course.code}`,
      time: `${course.gradingBreakdown?.length ?? 0} grade categories`,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    })),
  ].slice(0, 5)

  if (recentActivities.length === 0) {
    recentActivities.push({
      text: 'Add a course or task to get started',
      time: 'Your activity will appear here',
      icon: BookOpen,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    })
  }

  // Calendar: next 7 days, show which have tasks due
  const calDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    const hasTasks = activeTasks.some((t) => t.dueDate && format(new Date(t.dueDate), 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'))
    return { d, hasTasks, isToday: i === 0 }
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {format(now, "MMMM d, yyyy")} · {profile?.semester || 'Current semester'}
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 font-medium">
            {format(now, "MMM d")} — {format(new Date(now.getTime() + 7 * 86400000), "MMM d, yyyy")}
          </span>
        </div>
      </motion.div>

      {/* ── Streak + conflict banners ───────────────────────────────── */}
      <div className="mb-4 flex flex-col gap-2">
        {streak > 0 && (
          <motion.div custom={0} variants={fade} initial="hidden" animate="show"
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-white">
            <Flame className="h-5 w-5 text-yellow-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold">{streak} day streak!</span>
              <span className="ml-2 text-xs text-white/70">Keep completing tasks daily to maintain it.</span>
            </div>
            <Link href="/study-planner" className="shrink-0 flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/30 transition-colors">
              View Planner <CalendarRange className="h-3 w-3" />
            </Link>
          </motion.div>
        )}
        {conflicts.length > 0 && (
          <motion.div custom={1} variants={fade} initial="hidden" animate="show"
            className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-red-800">{conflicts.length} schedule conflict{conflicts.length > 1 ? 's' : ''} detected</span>
              <span className="ml-2 text-xs text-red-500">{conflicts[0].taskA.title} &amp; {conflicts[0].taskB.title} are too close.</span>
            </div>
            <Link href="/study-planner" className="shrink-0 flex items-center gap-1 rounded-lg bg-red-100 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 transition-colors">
              Fix Schedule <CalendarRange className="h-3 w-3" />
            </Link>
          </motion.div>
        )}
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div key={s.title} custom={i} variants={fade} initial="hidden" animate="show">
            <Card className="border border-slate-100 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', s.iconBg)}>
                    <s.icon className={cn('h-4.5 w-4.5', s.iconColor)} />
                  </div>
                  <Sparkline data={s.sparkData} color={s.sparkColor} />
                </div>
                <p className="text-xs font-medium text-slate-500">{s.title}</p>
                <p className="mt-0.5 text-2xl font-extrabold text-slate-900">{s.value}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {s.trendUp
                    ? <ChevronUp className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                    : <ChevronDown className="h-3 w-3 text-rose-500 flex-shrink-0" />}
                  <span className={cn('text-[11px] font-semibold', s.trendUp ? 'text-emerald-600' : 'text-rose-500')}>{s.trend}</span>
                  <span className="text-[11px] text-slate-400">{s.sub}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Main grid ───────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Progress Chart */}
        <motion.div custom={4} variants={fade} initial="hidden" animate="show" className="lg:col-span-2">
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800">Grade Progress</CardTitle>
              <span className="text-[11px] text-slate-400">This Week vs Last Week</span>
            </CardHeader>
            <CardContent className="px-5 pb-5 pl-8">
              <ProgressChart />
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activities */}
        <motion.div custom={5} variants={fade} initial="hidden" animate="show">
          <Card className="border border-slate-100 shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {recentActivities.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn('mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg', a.bg)}>
                    <a.icon className={cn('h-3.5 w-3.5', a.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-slate-700 leading-snug">{a.text}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{a.time}</p>
                  </div>
                </div>
              ))}
              <Link href="/tasks">
                <button className="mt-1 w-full text-center text-[11px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  View All →
                </button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Courses / Grade Overview */}
        <motion.div custom={6} variants={fade} initial="hidden" animate="show" className="lg:col-span-1">
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800">Top Courses</CardTitle>
              <Link href="/grades">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-600 hover:text-emerald-700 px-2">
                  Details <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {topCourses.map((course, i) => (
                <div key={course.id} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-400 w-4 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold text-slate-700 truncate">{course.code}</span>
                      <span className={cn('text-[12px] font-bold ml-2 flex-shrink-0', getGradeColor(course.currentGrade ?? 0))}>{Math.round(course.currentGrade ?? 0)}%</span>
                    </div>
                    <Progress value={course.currentGrade ?? 0} className="h-1.5"
                      indicatorClassName={(course.currentGrade ?? 0) >= 85 ? 'bg-emerald-500' : (course.currentGrade ?? 0) >= 70 ? 'bg-blue-500' : 'bg-amber-500'} />
                  </div>
                </div>
              ))}
              {topCourses.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">Add grades to see your strongest courses.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks */}
        <motion.div custom={7} variants={fade} initial="hidden" animate="show" className="lg:col-span-1">
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800">Tasks</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-600 hover:text-emerald-700 px-2">
                  View All <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2.5">
              {upcomingTasks.slice(0, 4).map((task) => {
                const status = task.dueDate ? getDueDateStatus(task.dueDate) : 'upcoming'
                return (
                  <div key={task.id} className="flex items-center gap-3">
                    <div className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 border-slate-200 hover:border-emerald-400 cursor-pointer transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-700 truncate">{task.title}</p>
                      <p className="text-[10px] text-slate-400">{task.courseCode}</p>
                    </div>
                    <span className={cn('text-[10px] font-semibold flex-shrink-0',
                      status === 'overdue' ? 'text-rose-500' : status === 'urgent' ? 'text-amber-500' : 'text-slate-400')}>
                      {task.dueDate ? formatRelativeDate(task.dueDate) : '—'}
                    </span>
                  </div>
                )
              })}
              {upcomingTasks.length === 0 && (
                <div className="py-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">All caught up!</p>
                </div>
              )}
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="mt-1 w-full text-xs text-slate-500 hover:text-emerald-600 gap-1 h-7">
                  Manage Tasks <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mini Calendar */}
        <motion.div custom={8} variants={fade} initial="hidden" animate="show" className="lg:col-span-1">
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800">Calendar</CardTitle>
              <Link href="/calendar">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-600 hover:text-emerald-700 px-2">
                  Open <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">{format(now, 'MMMM yyyy')}</p>
              {/* Week strip */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-slate-400">{d}</div>
                ))}
                {calDays.map((cd, i) => (
                  <div key={i}
                    className={cn(
                      'relative flex flex-col items-center justify-center h-8 rounded-lg text-[11px] font-medium',
                      cd.isToday ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50',
                    )}>
                    {format(cd.d, 'd')}
                    {cd.hasTasks && !cd.isToday && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-400" />
                    )}
                  </div>
                ))}
              </div>
              {/* Upcoming */}
              {upcomingTasks.slice(0, 2).map((task) => (
                <div key={task.id} className="mb-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
                  <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: task.courseColor }} />
                  <p className="text-[11px] font-medium text-slate-700 flex-1 truncate">{task.title}</p>
                  <p className="text-[10px] text-slate-400 flex-shrink-0">
                    {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* My Courses */}
        <motion.div custom={9} variants={fade} initial="hidden" animate="show" className="lg:col-span-3">
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800">My Courses</CardTitle>
              <Link href="/courses">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-600 hover:text-emerald-700 px-2">
                  Manage <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {courses.map((course) => (
                  <Link key={course.id} href="/courses">
                    <div className="group rounded-xl border border-slate-100 p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer bg-white"
                      style={{ borderLeftColor: course.color, borderLeftWidth: 3 }}>
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <p className="text-[11px] font-bold" style={{ color: course.color }}>{course.code}</p>
                          <p className="text-[12px] font-semibold text-slate-800 leading-tight mt-0.5">{course.name}</p>
                        </div>
                        {course.currentGrade !== undefined && (
                          <span className={cn('text-sm font-bold', getGradeColor(course.currentGrade))}>{course.currentGrade}%</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-2">{course.instructor}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {course.syllabusUploaded
                          ? <Badge variant="success" className="text-[9px] py-0">Syllabus ✓</Badge>
                          : <Badge variant="warning" className="text-[9px] py-0">No syllabus</Badge>}
                        <Badge variant="secondary" className="text-[9px] py-0">{course.credits} cr</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  )
}
