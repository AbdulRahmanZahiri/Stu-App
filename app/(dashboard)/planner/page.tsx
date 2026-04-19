'use client'

import { motion } from 'framer-motion'
import {
  GraduationCap, CheckCircle2, Circle, Clock, AlertTriangle,
  ChevronRight, TrendingUp, BookOpen, Star, Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { mockAcademicPlan, mockStudent } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const statusConfig = {
  completed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Completed' },
  in_progress: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'In Progress' },
  planned: { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Planned' },
  recommended: { icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Recommended' },
  required: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Required' },
}

export default function PlannerPage() {
  const plan = mockAcademicPlan
  const totalCompleted = plan.completedCourses.reduce((sum, c) => sum + c.credits, 0)
  const totalRequired = 120
  const progressPct = Math.round((totalCompleted / totalRequired) * 100)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academic Planner</h1>
          <p className="mt-1 text-sm text-slate-500">
            Plan your degree path, track requirements, and get course suggestions
          </p>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-xs leading-relaxed text-blue-700">
          <strong>Informational Only:</strong> This academic plan is provided as a general guide. Always verify course requirements, prerequisites, and graduation requirements with your university&apos;s official academic calendar or a registered academic advisor.
        </p>
      </motion.div>

      {/* Overview cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { label: 'Major', value: plan.major, sub: plan.university.split(' ').slice(0, 2).join(' '), icon: GraduationCap, color: 'bg-violet-50 text-violet-700', iconBg: 'bg-violet-100' },
          { label: 'Credits Earned', value: `${totalCompleted}`, sub: `of ${totalRequired} required`, icon: BookOpen, color: 'bg-blue-50 text-blue-700', iconBg: 'bg-blue-100' },
          { label: 'Expected Grad', value: `${plan.expectedGradYear}`, sub: `Started ${plan.startYear}`, icon: Star, color: 'bg-emerald-50 text-emerald-700', iconBg: 'bg-emerald-100' },
          { label: 'GPA', value: `${mockStudent.gpa}`, sub: 'Dean\'s List track', icon: TrendingUp, color: 'bg-amber-50 text-amber-700', iconBg: 'bg-amber-100' },
        ].map((card) => (
          <Card key={card.label} className={`border-0 shadow-none ${card.color.split(' ')[0]}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                  <p className={`text-lg font-extrabold truncate ${card.color.split(' ')[1]}`}>{card.value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <card.icon className={`h-4 w-4 ${card.color.split(' ')[1]}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-900">Degree Progress</p>
              <span className="text-xl font-extrabold text-violet-600">{progressPct}%</span>
            </div>
            <Progress
              value={progressPct}
              className="h-3"
              indicatorClassName="bg-gradient-to-r from-violet-500 to-indigo-500"
            />
            <p className="mt-2 text-xs text-slate-400">
              {totalCompleted} credits completed · {totalRequired - totalCompleted} remaining · Expected graduation {plan.expectedGradYear}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Requirements checklist */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Requirements Tracker</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {plan.requirements.map((req) => {
                const pct = Math.round((req.completedCredits / req.requiredCredits) * 100)
                return (
                  <div key={req.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {req.isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-slate-300" />
                        )}
                        <span className="text-sm font-medium text-slate-700">{req.title}</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {req.completedCredits}/{req.requiredCredits} cr
                      </span>
                    </div>
                    <div className="ml-6">
                      <Progress
                        value={pct}
                        className="h-1.5"
                        indicatorClassName={req.isComplete ? 'bg-emerald-500' : 'bg-violet-500'}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Course roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Course Roadmap</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <Tabs defaultValue="current">
                <TabsList className="mb-4 h-8">
                  <TabsTrigger value="completed" className="text-xs">Completed ({plan.completedCourses.length})</TabsTrigger>
                  <TabsTrigger value="current" className="text-xs">In Progress ({plan.inProgressCourses.length})</TabsTrigger>
                  <TabsTrigger value="planned" className="text-xs">Planned ({plan.plannedCourses.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="completed">
                  <div className="space-y-2">
                    {plan.completedCourses.map((course) => (
                      <CourseRow key={course.courseCode} course={course} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="current">
                  <div className="space-y-2">
                    {plan.inProgressCourses.map((course) => (
                      <CourseRow key={course.courseCode} course={course} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="planned">
                  <div className="space-y-2">
                    {plan.plannedCourses.map((course) => (
                      <CourseRow key={course.courseCode} course={course} />
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-4">
                    <p className="text-xs font-semibold text-violet-700 mb-1">Suggested Next Steps</p>
                    <p className="text-xs text-violet-600/70">
                      Based on your current progress, we recommend enrolling in{' '}
                      <strong>COMP 2004</strong> and <strong>COMP 3710</strong> in Fall 2026 to stay on track for your CS degree.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

function CourseRow({ course }: { course: (typeof mockAcademicPlan.completedCourses)[0] }) {
  const config = statusConfig[course.status]
  const Icon = config.icon

  return (
    <div className={cn('flex items-center gap-3 rounded-xl border p-3 transition-colors', config.bg, config.border)}>
      <Icon className={cn('h-4 w-4 shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-800">{course.courseCode}</span>
          <span className="text-xs text-slate-500 truncate">{course.courseName}</span>
        </div>
        {course.plannedSemester && (
          <p className="text-[11px] text-slate-400">
            {course.plannedSemester} {course.plannedYear}
            {course.prerequisites && course.prerequisites.length > 0 && ` · Prereq: ${course.prerequisites.join(', ')}`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {course.grade && (
          <Badge variant="success" className="text-[10px]">{course.grade}</Badge>
        )}
        <Badge className={cn('text-[10px]', config.bg, config.color, config.border)}>{course.credits} cr</Badge>
      </div>
    </div>
  )
}
