'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Calculator, ChevronDown, ChevronUp, Award, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { mockCourseGrades, mockStudent } from '@/lib/mock-data'
import { getLetterGrade, getGradeColor, cn } from '@/lib/utils'
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

const gradeColors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981']

export default function GradesPage() {
  const [expandedCourse, setExpandedCourse] = useState<string | null>('course-001')
  const [whatIfScores, setWhatIfScores] = useState<Record<string, number>>({})

  const overallGPA = mockStudent.gpa ?? 3.72

  const chartData = mockCourseGrades.map((cg) => ({
    name: cg.courseCode.replace(' ', '\n'),
    grade: cg.currentGrade,
    color: cg.courseColor,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Grade Tracker</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track your academic performance and project final grades
        </p>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {mockCourseGrades.map((cg, i) => (
          <Card key={cg.courseId} className="border-0 shadow-none" style={{ background: `${cg.courseColor}10` }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: cg.courseColor }}>{cg.courseCode}</p>
                  <p className="text-2xl font-extrabold text-slate-900">{cg.currentGrade}%</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{cg.letterGrade}</p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: cg.courseColor }}
                >
                  {cg.letterGrade}
                </div>
              </div>
              <Progress
                value={cg.currentGrade}
                className="mt-3 h-1"
                indicatorStyle={{ backgroundColor: cg.courseColor }}
              />
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Grade chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Grades by Course</CardTitle>
              <CardDescription>Current semester performance overview</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    formatter={(v: number) => [`${v}%`, 'Grade']}
                  />
                  <Bar dataKey="grade" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* GPA summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-100">
            <CardContent className="p-6 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg">
                <Award className="h-8 w-8 text-white" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-500 mb-1">Cumulative GPA</p>
              <p className="text-5xl font-extrabold text-violet-900 mb-1">{overallGPA}</p>
              <p className="text-sm text-violet-600 font-medium mb-4">Dean's List eligible at 3.70+</p>

              <div className="space-y-2 text-left">
                {[
                  { label: 'Semester Average', value: '84.5%' },
                  { label: 'Credits Completed', value: '15 / 120' },
                  { label: 'Academic Standing', value: 'Good' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between rounded-lg bg-white/60 px-3 py-2">
                    <span className="text-xs text-violet-700">{item.label}</span>
                    <span className="text-xs font-bold text-violet-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Per-course breakdowns */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 space-y-4"
      >
        <h2 className="text-base font-semibold text-slate-900">Course Breakdowns</h2>
        {mockCourseGrades.map((cg) => {
          const isOpen = expandedCourse === cg.courseId

          return (
            <Card key={cg.courseId} className={cn('transition-all', isOpen && 'shadow-md')}>
              <button
                className="w-full"
                onClick={() => setExpandedCourse(isOpen ? null : cg.courseId)}
              >
                <CardHeader className="flex flex-row items-center gap-4 pb-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: cg.courseColor }}
                  >
                    {cg.letterGrade}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{cg.courseCode}</span>
                      <span className="text-sm text-slate-500">{cg.courseName}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <Progress
                        value={cg.currentGrade}
                        className="h-1.5 w-32"
                        indicatorStyle={{ backgroundColor: cg.courseColor }}
                      />
                      <span className="text-xs font-semibold" style={{ color: cg.courseColor }}>
                        {cg.currentGrade}%
                      </span>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </CardHeader>
              </button>

              {isOpen && (
                <CardContent className="border-t border-slate-50 px-5 py-4">
                  {/* Grade categories */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Grade Breakdown</p>
                    <div className="space-y-3">
                      {cg.categories.map((cat) => {
                        const catEntries = cg.entries.filter((e) => e.categoryId === cat.id)
                        const earned = catEntries.filter((e) => e.score !== undefined)
                        const avg = earned.length > 0
                          ? earned.reduce((sum, e) => sum + ((e.score! / e.maxScore) * 100), 0) / earned.length
                          : null

                        return (
                          <div key={cat.id}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                                <span className="text-xs text-slate-400">({cat.weight}%)</span>
                              </div>
                              <span className={cn('text-sm font-bold', avg !== null ? getGradeColor(avg) : 'text-slate-400')}>
                                {avg !== null ? `${avg.toFixed(1)}%` : 'Pending'}
                              </span>
                            </div>
                            <Progress
                              value={avg ?? 0}
                              className="h-1.5"
                              indicatorClassName={avg && avg >= 85 ? 'bg-emerald-500' : avg && avg >= 70 ? 'bg-blue-500' : 'bg-amber-500'}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Grade entries */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Graded Items</p>
                    <div className="space-y-2">
                      {cg.entries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{entry.title}</p>
                            <p className="text-xs text-slate-400">{entry.categoryName}</p>
                          </div>
                          <div className="text-right">
                            {entry.score !== undefined ? (
                              <>
                                <p className={cn('text-sm font-bold', getGradeColor((entry.score / entry.maxScore) * 100))}>
                                  {entry.score}/{entry.maxScore}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {((entry.score / entry.maxScore) * 100).toFixed(1)}%
                                </p>
                              </>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* What-if calculator */}
                  <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-violet-600" />
                      <p className="text-xs font-semibold text-violet-700">What-If Calculator</p>
                    </div>
                    <p className="text-xs text-violet-600/70 mb-3">
                      Enter a hypothetical final exam score to see your projected grade.
                    </p>
                    <div className="flex gap-3 items-center">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Final exam score %"
                        value={whatIfScores[cg.courseId] ?? ''}
                        onChange={(e) => setWhatIfScores((prev) => ({ ...prev, [cg.courseId]: Number(e.target.value) }))}
                        className="h-8 rounded-lg text-xs"
                      />
                      {whatIfScores[cg.courseId] !== undefined && (
                        <div className="shrink-0">
                          <p className="text-xs text-violet-600">Projected:</p>
                          <p className="text-sm font-bold text-violet-800">
                            ~{Math.min(100, Math.round(cg.currentGrade * 0.8 + whatIfScores[cg.courseId] * 0.2))}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 p-3">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                    <p className="text-[10px] leading-relaxed text-amber-700">
                      Projected grades are estimates based on available data. Always verify with your course syllabus and instructor.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </motion.div>
    </div>
  )
}
