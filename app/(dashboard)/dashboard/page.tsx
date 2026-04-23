'use client'

import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  BookOpen, CheckSquare, TrendingUp, Clock, AlertTriangle,
  ArrowRight, Upload, ChevronRight, Sparkles, Trophy, Flame,
  CalendarDays,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { mockStudent, mockCourses, mockDashboardStats, mockCourseGrades } from '@/lib/mock-data'
import { formatRelativeDate, getLetterGrade, getPriorityColor, getDueDateStatus, getGradeColor, cn } from '@/lib/utils'
import { useAppStore } from '@/lib/app-store'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const statCards = [
  {
    title: 'Active Courses',
    value: '4',
    icon: BookOpen,
    color: 'from-violet-500 to-indigo-500',
    bg: 'from-violet-50 to-indigo-50',
    iconBg: 'bg-violet-100',
    textColor: 'text-violet-700',
    sub: 'Winter 2026',
  },
  {
    title: 'Due Today',
    value: '2',
    icon: CheckSquare,
    color: 'from-amber-400 to-orange-500',
    bg: 'from-amber-50 to-orange-50',
    iconBg: 'bg-amber-100',
    textColor: 'text-amber-700',
    sub: '1 overdue',
    subAlert: true,
  },
  {
    title: 'Current GPA',
    value: '3.72',
    icon: Trophy,
    color: 'from-emerald-500 to-teal-500',
    bg: 'from-emerald-50 to-teal-50',
    iconBg: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    sub: 'Dean\'s List track',
  },
  {
    title: 'Study Hours',
    value: '22h',
    icon: Flame,
    color: 'from-sky-400 to-blue-500',
    bg: 'from-sky-50 to-blue-50',
    iconBg: 'bg-sky-100',
    textColor: 'text-sky-700',
    sub: 'This week',
  },
]

export default function DashboardPage() {
  const { tasks } = useAppStore()
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const activeTasks = tasks.filter((t) => t.status !== 'completed')
  const upcomingTasks = activeTasks
    .filter((t) => t.dueDate)
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 5)

  const todayTasks = activeTasks.slice(0, 4)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {mockStudent.name.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {format(now, "EEEE, MMMM d, yyyy")} · {mockStudent.semester}
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/courses">
            <Button variant="gradient" size="sm" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Upload Syllabus
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {statCards.map((stat) => (
          <motion.div key={stat.title} variants={itemVariants}>
            <Card className={`bg-gradient-to-br ${stat.bg} border-0 shadow-none`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">{stat.title}</p>
                    <p className={`text-2xl font-extrabold ${stat.textColor}`}>{stat.value}</p>
                    <p className={cn(
                      'mt-0.5 text-[11px] font-medium',
                      stat.subAlert ? 'text-rose-500' : 'text-slate-400'
                    )}>
                      {stat.sub}
                    </p>
                  </div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconBg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 lg:grid-cols-3"
      >
        {/* Upcoming Deadlines */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900">Upcoming Deadlines</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-violet-600 hover:text-violet-700">
                  View all <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5 px-5 pb-5">
              {upcomingTasks.length === 0 ? (
                <div className="py-8 text-center">
                  <Trophy className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                  <p className="text-sm font-medium text-slate-600">All caught up!</p>
                  <p className="text-xs text-slate-400">No upcoming deadlines</p>
                </div>
              ) : (
                upcomingTasks.map((task) => {
                  const status = task.dueDate ? getDueDateStatus(task.dueDate) : 'upcoming'
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-50 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50"
                    >
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: task.courseColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{task.title}</p>
                        <p className="text-xs text-slate-400">{task.courseCode}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn(
                          'text-xs font-semibold',
                          status === 'overdue' ? 'text-rose-600' :
                          status === 'urgent' ? 'text-amber-600' :
                          status === 'soon' ? 'text-orange-500' :
                          'text-slate-500'
                        )}>
                          {task.dueDate ? formatRelativeDate(task.dueDate) : '—'}
                        </p>
                        <Badge
                          variant={task.priority === 'urgent' ? 'error' : task.priority === 'high' ? 'warning' : 'secondary'}
                          className="mt-0.5 text-[10px]"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Focus */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Today&apos;s Focus</CardTitle>
              <CalendarDays className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent className="space-y-2.5 px-5 pb-5">
              {todayTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3">
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-slate-300 transition-colors hover:border-violet-400 cursor-pointer" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 leading-tight">{task.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {task.courseCode}
                      {task.estimatedHours && ` · ~${task.estimatedHours}h`}
                    </p>
                  </div>
                </div>
              ))}
              <Link href="/tasks">
                <Button variant="gradient-subtle" size="sm" className="mt-3 w-full text-xs gap-1">
                  View All Tasks <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Grade Summary */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Grade Overview</CardTitle>
              <Link href="/grades">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-violet-600">
                  Details <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              {mockCourseGrades.map((cg) => (
                <div key={cg.courseId}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: cg.courseColor }}
                      />
                      <span className="text-sm font-medium text-slate-700">{cg.courseCode}</span>
                      <span className="text-xs text-slate-400">{cg.courseName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{cg.currentGrade}%</span>
                      <Badge variant={cg.currentGrade >= 85 ? 'success' : cg.currentGrade >= 70 ? 'info' : 'warning'} className="text-[10px]">
                        {cg.letterGrade}
                      </Badge>
                    </div>
                  </div>
                  <Progress
                    value={cg.currentGrade}
                    className="h-1.5"
                    indicatorClassName={
                      cg.currentGrade >= 85 ? 'bg-emerald-500' :
                      cg.currentGrade >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Assistant Quick Panel */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-sm font-semibold text-violet-900">AI Assistant</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="mb-4 text-xs leading-relaxed text-violet-700/70">
                Ask anything about your courses, get study guides, summaries, and academic advice.
              </p>
              <div className="space-y-2">
                {[
                  'Summarize my COMP 2007 notes',
                  'Create a study plan for finals',
                  'Explain eigenvalues simply',
                ].map((prompt) => (
                  <Link key={prompt} href="/ai-assistant">
                    <button className="w-full rounded-lg border border-violet-200 bg-white/80 px-3 py-2 text-left text-xs font-medium text-violet-700 transition-all hover:bg-white hover:shadow-sm">
                      &ldquo;{prompt}&rdquo;
                    </button>
                  </Link>
                ))}
              </div>
              <Link href="/ai-assistant">
                <Button variant="gradient" size="sm" className="mt-4 w-full text-xs gap-1">
                  Open AI Assistant <Sparkles className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Courses Quick View */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">My Courses</CardTitle>
              <Link href="/courses">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-violet-600">
                  Manage courses <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {mockCourses.map((course) => (
                  <Link key={course.id} href="/courses">
                    <div
                      className="group relative overflow-hidden rounded-xl border border-slate-100 p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                      style={{ borderLeftColor: course.color, borderLeftWidth: 3 }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs font-bold" style={{ color: course.color }}>
                            {course.code}
                          </p>
                          <p className="text-sm font-medium text-slate-800 leading-tight mt-0.5">
                            {course.name}
                          </p>
                        </div>
                        {course.currentGrade && (
                          <span className={`text-sm font-bold ${getGradeColor(course.currentGrade)}`}>
                            {course.currentGrade}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{course.instructor}</p>
                      <div className="mt-2 flex items-center gap-2">
                        {course.syllabusUploaded ? (
                          <Badge variant="success" className="text-[9px] py-0">Syllabus ✓</Badge>
                        ) : (
                          <Badge variant="warning" className="text-[9px] py-0">No syllabus</Badge>
                        )}
                        <Badge variant="secondary" className="text-[9px] py-0">{course.credits} cr</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
