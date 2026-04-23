'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Calculator, Award, ChevronDown, ChevronUp,
  BookOpen, TrendingUp, Target, AlertCircle, CheckCircle2, Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/app-store'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell,
} from 'recharts'

// ─── GPA helpers ────────────────────────────────────────────────────────────

function percentToGPA(pct: number): number {
  if (pct >= 90) return 4.0
  if (pct >= 85) return 3.7
  if (pct >= 80) return 3.3
  if (pct >= 75) return 3.0
  if (pct >= 70) return 2.7
  if (pct >= 65) return 2.3
  if (pct >= 60) return 2.0
  if (pct >= 55) return 1.7
  if (pct >= 50) return 1.0
  return 0.0
}

function percentToLetter(pct: number): string {
  if (pct >= 90) return 'A+'
  if (pct >= 85) return 'A'
  if (pct >= 80) return 'A-'
  if (pct >= 75) return 'B+'
  if (pct >= 70) return 'B'
  if (pct >= 65) return 'B-'
  if (pct >= 60) return 'C+'
  if (pct >= 55) return 'C'
  if (pct >= 50) return 'C-'
  if (pct >= 45) return 'D'
  return 'F'
}

function gradeColor(pct: number): string {
  if (pct >= 85) return 'text-emerald-600'
  if (pct >= 70) return 'text-blue-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-rose-600'
}

function gradeBg(pct: number): string {
  if (pct >= 85) return 'bg-emerald-50 text-emerald-700'
  if (pct >= 70) return 'bg-blue-50 text-blue-700'
  if (pct >= 60) return 'bg-amber-50 text-amber-700'
  return 'bg-rose-50 text-rose-700'
}

// Default grading breakdown for courses without a syllabus
const DEFAULT_BREAKDOWN = [
  { name: 'Assignments', weight: 20 },
  { name: 'Quizzes',     weight: 15 },
  { name: 'Midterm',     weight: 25 },
  { name: 'Final Exam',  weight: 40 },
]

// ─── Single Course Calculator ────────────────────────────────────────────────

function SingleCourseCalculator() {
  const { courses } = useAppStore()
  const active = courses.filter((c) => c.status === 'active')

  const [selectedId, setSelectedId] = useState<string>(active[0]?.id ?? '')
  const [grades, setGrades] = useState<Record<string, string>>({})  // componentIndex_courseId -> score string
  const [targetGrade, setTargetGrade] = useState<string>('80')

  const course = active.find((c) => c.id === selectedId)
  const breakdown = course?.gradingBreakdown?.length
    ? course.gradingBreakdown
    : DEFAULT_BREAKDOWN

  // key for each row
  function key(i: number) { return `${selectedId}-${i}` }

  // Parse entered grade (0-100) or null
  function getScore(i: number): number | null {
    const val = grades[key(i)]
    if (!val || val.trim() === '') return null
    const n = parseFloat(val)
    if (isNaN(n)) return null
    return Math.max(0, Math.min(100, n))
  }

  // Weighted contribution of graded items so far
  const gradedRows   = breakdown.map((_, i) => getScore(i) !== null ? i : -1).filter((i) => i >= 0)
  const ungradedRows = breakdown.map((_, i) => getScore(i) === null ? i : -1).filter((i) => i >= 0)

  const weightedSoFar = gradedRows.reduce((sum, i) => {
    return sum + (getScore(i)! * breakdown[i].weight) / 100
  }, 0)

  const gradedWeight   = gradedRows.reduce((sum, i) => sum + breakdown[i].weight, 0)
  const ungradedWeight = ungradedRows.reduce((sum, i) => sum + breakdown[i].weight, 0)

  // Current weighted average (scaled to 100% of graded weight)
  const currentAvg = gradedWeight > 0 ? (weightedSoFar / gradedWeight) * 100 : null

  // Projected final if remaining = same as current avg
  const projected = gradedWeight > 0
    ? weightedSoFar + (currentAvg! * ungradedWeight) / 100
    : null

  // What score do you need on remaining to hit target?
  const target  = parseFloat(targetGrade) || 0
  const needed  = ungradedWeight > 0
    ? ((target - weightedSoFar) / ungradedWeight) * 100
    : null

  const totalWeightEntered = breakdown.reduce((s, r) => s + r.weight, 0)
  const weightError = Math.abs(totalWeightEntered - 100) > 0.5

  return (
    <div className="space-y-5">
      {/* Course selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label className="text-xs font-medium mb-1.5 block">Select Course</Label>
          <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); setGrades({}) }}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Choose a course" />
            </SelectTrigger>
            <SelectContent>
              {active.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="font-semibold">{c.code}</span>
                  <span className="ml-2 text-slate-400">{c.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {course && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: course.color + '18', color: course.color }}>
            <BookOpen className="h-3.5 w-3.5" />
            <span className="font-bold">{course.credits} credits</span>
            {course.syllabusUploaded && course.gradingBreakdown?.length
              ? <Badge className="text-[9px] border-0" style={{ backgroundColor: course.color + '30', color: course.color }}>Syllabus</Badge>
              : <Badge variant="secondary" className="text-[9px]">Default weights</Badge>
            }
          </div>
        )}
      </div>

      {!course && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 py-12 text-center">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Select a course to start calculating</p>
        </div>
      )}

      {course && (
        <>
          {!course.syllabusUploaded && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
              <Info className="h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-700">
                No syllabus uploaded for {course.code} — using default weights. Upload the syllabus in <strong>Courses</strong> for accurate weights.
              </p>
            </div>
          )}

          {weightError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <p className="text-xs text-rose-700">Weights sum to {totalWeightEntered}% instead of 100%. Results may be inaccurate.</p>
            </div>
          )}

          {/* Grade entry table */}
          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-[1fr_60px_110px_80px] gap-0 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              <span>Component</span>
              <span className="text-center">Weight</span>
              <span className="text-center">Your Grade (%)</span>
              <span className="text-right">Contribution</span>
            </div>

            {breakdown.map((row, i) => {
              const score = getScore(i)
              const contribution = score !== null ? (score * row.weight) / 100 : null

              return (
                <div
                  key={i}
                  className={cn(
                    'grid grid-cols-[1fr_60px_110px_80px] items-center gap-0 px-4 py-3 border-b border-slate-50 last:border-0',
                    score !== null ? 'bg-white' : 'bg-slate-50/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: course.color + (score !== null ? 'ff' : '60') }}
                    />
                    <span className="text-sm font-medium text-slate-700">{row.name}</span>
                  </div>

                  <div className="text-center">
                    <span className="text-sm font-bold text-slate-500">{row.weight}%</span>
                  </div>

                  <div className="flex justify-center">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="—"
                      value={grades[key(i)] ?? ''}
                      onChange={(e) => setGrades((prev) => ({ ...prev, [key(i)]: e.target.value }))}
                      className="h-8 w-24 rounded-lg text-center text-sm"
                    />
                  </div>

                  <div className="text-right">
                    {contribution !== null ? (
                      <span className={cn('text-sm font-bold', gradeColor(score!))}>
                        {contribution.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Totals row */}
            <div className="grid grid-cols-[1fr_60px_110px_80px] items-center gap-0 border-t-2 border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Total</span>
              <span className="text-center text-sm font-bold text-slate-700">{totalWeightEntered}%</span>
              <div />
              <span className={cn('text-right text-sm font-extrabold', projected !== null ? gradeColor(projected) : 'text-slate-400')}>
                {weightedSoFar.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Results */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Grade so far */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Grade So Far</p>
              {currentAvg !== null ? (
                <>
                  <p className={cn('text-3xl font-extrabold', gradeColor(currentAvg))}>
                    {currentAvg.toFixed(1)}%
                  </p>
                  <p className={cn('mt-1 text-sm font-bold', gradeColor(currentAvg))}>
                    {percentToLetter(currentAvg)}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Based on {gradedWeight}% of grade
                  </p>
                </>
              ) : (
                <p className="text-slate-300 text-sm">Enter grades above</p>
              )}
            </div>

            {/* Projected final */}
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400 mb-2">Projected Final</p>
              {projected !== null ? (
                <>
                  <p className={cn('text-3xl font-extrabold', gradeColor(projected))}>
                    {projected.toFixed(1)}%
                  </p>
                  <p className={cn('mt-1 text-sm font-bold', gradeColor(projected))}>
                    {percentToLetter(projected)} · GPA {percentToGPA(projected).toFixed(1)}
                  </p>
                  <p className="mt-1 text-[10px] text-violet-400">
                    Assuming {currentAvg!.toFixed(0)}% on remaining
                  </p>
                </>
              ) : (
                <p className="text-violet-300 text-sm">Pending grades</p>
              )}
            </div>

            {/* Weighted contribution chart mini */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">GPA Points</p>
              {projected !== null ? (
                <>
                  <p className="text-3xl font-extrabold text-indigo-600">
                    {(percentToGPA(projected) * course.credits).toFixed(2)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Quality Points
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {percentToGPA(projected).toFixed(1)} GPA × {course.credits} credits
                  </p>
                </>
              ) : (
                <p className="text-slate-300 text-sm">Pending grades</p>
              )}
            </div>
          </div>

          {/* Target grade calculator */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-indigo-600" />
              <p className="text-sm font-bold text-indigo-800">Target Grade Calculator</p>
            </div>
            <p className="text-xs text-indigo-600/70 mb-4">
              What do you need on the remaining {ungradedWeight}% of your grade to hit your target?
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label className="text-xs font-medium mb-1.5 block text-indigo-700">Target Final Grade (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 80"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="h-9 max-w-[140px]"
                />
              </div>

              {needed !== null && ungradedWeight > 0 && (
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: `To get ${percentToLetter(target)} (${target}%)`, score: needed, color: 'indigo' },
                    { label: `To get A (90%)`, score: ((90 - weightedSoFar) / ungradedWeight) * 100, color: 'emerald' },
                    { label: `To pass (50%)`, score: ((50 - weightedSoFar) / ungradedWeight) * 100, color: 'amber' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white/80 px-3 py-2 border border-white">
                      <p className="text-[10px] text-slate-500 mb-0.5">{item.label}</p>
                      <p className={cn(
                        'text-lg font-extrabold',
                        item.score <= 100 ? (item.score <= 70 ? 'text-emerald-600' : item.score <= 85 ? 'text-amber-600' : 'text-rose-600') : 'text-slate-400'
                      )}>
                        {item.score > 100 ? 'Not possible' : item.score < 0 ? 'Already achieved!' : `${item.score.toFixed(1)}%`}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {ungradedWeight === 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs text-emerald-700 font-medium">All components graded!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Semester GPA Calculator ─────────────────────────────────────────────────

function SemesterCalculator() {
  const { courses } = useAppStore()
  const active = courses.filter((c) => c.status === 'active')

  // courseId -> percentage grade string
  const [grades, setGrades] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    active.forEach((c) => {
      if (c.currentGrade !== undefined) init[c.id] = String(c.currentGrade)
    })
    return init
  })

  const [expanded, setExpanded] = useState<string | null>(null)
  // Per-course component grades: courseId-componentIndex -> score
  const [compGrades, setCompGrades] = useState<Record<string, string>>({})

  function getPercent(courseId: string): number | null {
    const val = grades[courseId]
    if (!val || val.trim() === '') return null
    const n = parseFloat(val)
    return isNaN(n) ? null : Math.max(0, Math.min(100, n))
  }

  // Compute from component grades if available
  function computeFromComponents(course: typeof active[0]): number | null {
    const breakdown = course.gradingBreakdown?.length ? course.gradingBreakdown : null
    if (!breakdown) return null

    let weighted = 0
    let gradedWeight = 0

    breakdown.forEach((row, i) => {
      const k = `${course.id}-comp-${i}`
      const val = compGrades[k]
      if (!val || val.trim() === '') return
      const score = parseFloat(val)
      if (isNaN(score)) return
      weighted += (Math.max(0, Math.min(100, score)) * row.weight) / 100
      gradedWeight += row.weight
    })

    if (gradedWeight === 0) return null
    return (weighted / gradedWeight) * 100
  }

  // For each course: use computed if available, else manual input
  const rows = active.map((c) => {
    const computed = computeFromComponents(c)
    const manual   = getPercent(c.id)
    const pct      = computed ?? manual
    return { course: c, pct, computed }
  })

  const gradedRows  = rows.filter((r) => r.pct !== null)
  const totalCredits = gradedRows.reduce((s, r) => s + r.course.credits, 0)
  const totalQP     = gradedRows.reduce((s, r) => s + percentToGPA(r.pct!) * r.course.credits, 0)
  const semGPA      = totalCredits > 0 ? totalQP / totalCredits : null
  const semAvgPct   = gradedRows.length > 0
    ? gradedRows.reduce((s, r) => s + r.pct!, 0) / gradedRows.length
    : null

  const allCredits  = active.reduce((s, c) => s + c.credits, 0)

  const chartData = rows.map((r) => ({
    name: r.course.code,
    grade: r.pct ?? 0,
    color: r.course.color,
  }))

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Semester GPA',
            value: semGPA !== null ? semGPA.toFixed(2) : '—',
            sub: semGPA !== null && semGPA >= 3.7 ? "Dean's List" : semGPA !== null && semGPA >= 2.0 ? 'Good Standing' : '—',
            color: 'from-violet-500 to-indigo-500',
            icon: Award,
          },
          {
            label: 'Semester Avg',
            value: semAvgPct !== null ? `${semAvgPct.toFixed(1)}%` : '—',
            sub: semAvgPct !== null ? percentToLetter(semAvgPct) : '—',
            color: 'from-sky-500 to-blue-500',
            icon: TrendingUp,
          },
          {
            label: 'Courses',
            value: active.length,
            sub: `${gradedRows.length} graded`,
            color: 'from-emerald-500 to-teal-500',
            icon: BookOpen,
          },
          {
            label: 'Total Credits',
            value: allCredits,
            sub: `${totalCredits} counted`,
            color: 'from-amber-500 to-orange-500',
            icon: BarChart3,
          },
        ].map((s) => (
          <Card key={s.label} className="border-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                  <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart */}
      {gradedRows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Grade by Course</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'Grade']}
                />
                <Bar dataKey="grade" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Course table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700">Course Grade Entry</h3>
        {active.map((course) => {
          const breakdown = course.gradingBreakdown?.length ? course.gradingBreakdown : null
          const isExpanded = expanded === course.id
          const row = rows.find((r) => r.course.id === course.id)!

          return (
            <Card key={course.id} className={cn('overflow-hidden transition-shadow', isExpanded && 'shadow-md')}>
              {/* Course header row */}
              <div className="flex items-center gap-3 p-4">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: course.color }}
                >
                  {row.pct !== null ? percentToLetter(row.pct) : '—'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{course.code}</span>
                    <span className="truncate text-sm text-slate-500">{course.name}</span>
                    <span className="text-xs text-slate-400">{course.credits} cr</span>
                  </div>
                  {row.pct !== null && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress
                        value={row.pct}
                        className="h-1.5 w-28"
                        indicatorStyle={{ backgroundColor: course.color }}
                      />
                      <span className="text-xs font-bold" style={{ color: course.color }}>
                        {row.pct.toFixed(1)}%
                      </span>
                      {row.computed !== null && (
                        <Badge className="text-[9px] border-0 bg-violet-100 text-violet-700">auto</Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick grade input (no syllabus) OR expand toggle (has syllabus) */}
                <div className="flex items-center gap-2 shrink-0">
                  {!breakdown ? (
                    <div>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Grade %"
                        value={grades[course.id] ?? ''}
                        onChange={(e) => setGrades((prev) => ({ ...prev, [course.id]: e.target.value }))}
                        className="h-8 w-24 text-center text-sm"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : course.id)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                    >
                      {isExpanded ? 'Collapse' : 'Enter Grades'}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded: component entry */}
              {isExpanded && breakdown && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Enter grades per component — auto-calculates weighted average
                  </p>
                  <div className="space-y-2">
                    {breakdown.map((row, i) => {
                      const k = `${course.id}-comp-${i}`
                      const val = compGrades[k]
                      const score = val ? parseFloat(val) : NaN
                      const contribution = !isNaN(score) ? (Math.max(0, Math.min(100, score)) * row.weight) / 100 : null

                      return (
                        <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-700">{row.name}</p>
                            <p className="text-[10px] text-slate-400">Weight: {row.weight}%</p>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Score %"
                            value={compGrades[k] ?? ''}
                            onChange={(e) => setCompGrades((prev) => ({ ...prev, [k]: e.target.value }))}
                            className="h-8 w-24 text-center text-sm"
                          />
                          <div className="w-16 text-right">
                            {contribution !== null ? (
                              <span className={cn('text-sm font-bold', gradeColor(score))}>{contribution.toFixed(1)}</span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Course total */}
                  {(() => {
                    const computed = computeFromComponents(course)
                    if (!computed) return null
                    return (
                      <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                        <div>
                          <p className="text-xs font-semibold text-slate-600">Weighted Average</p>
                          <p className="text-[10px] text-slate-400">GPA: {percentToGPA(computed).toFixed(1)} · Quality Points: {(percentToGPA(computed) * course.credits).toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn('text-xl font-extrabold', gradeColor(computed))}>{computed.toFixed(1)}%</p>
                          <p className={cn('text-xs font-bold', gradeColor(computed))}>{percentToLetter(computed)}</p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* GPA breakdown table */}
      {gradedRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-violet-600" />
              Credit-Weighted GPA Calculation
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    <th className="pb-2 text-left">Course</th>
                    <th className="pb-2 text-center">Credits</th>
                    <th className="pb-2 text-center">Grade %</th>
                    <th className="pb-2 text-center">Letter</th>
                    <th className="pb-2 text-center">GPA</th>
                    <th className="pb-2 text-right">Quality Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ course, pct }) => (
                    <tr key={course.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5">
                        <span className="font-semibold text-slate-800">{course.code}</span>
                      </td>
                      <td className="py-2.5 text-center text-slate-600">{course.credits}</td>
                      <td className="py-2.5 text-center">
                        {pct !== null
                          ? <span className={cn('font-bold', gradeColor(pct))}>{pct.toFixed(1)}%</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 text-center">
                        {pct !== null
                          ? <span className={cn('rounded-md px-2 py-0.5 text-xs font-bold', gradeBg(pct))}>{percentToLetter(pct)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 text-center">
                        {pct !== null
                          ? <span className="font-semibold text-slate-700">{percentToGPA(pct).toFixed(1)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 text-right">
                        {pct !== null
                          ? <span className="font-bold text-indigo-600">{(percentToGPA(pct) * course.credits).toFixed(2)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="py-3 text-xs font-bold uppercase text-slate-500">Semester Total</td>
                    <td className="py-3 text-center font-bold text-slate-700">{totalCredits}</td>
                    <td className="py-3 text-center">
                      {semAvgPct !== null && <span className={cn('font-bold', gradeColor(semAvgPct))}>{semAvgPct.toFixed(1)}%</span>}
                    </td>
                    <td className="py-3 text-center">
                      {semAvgPct !== null && (
                        <span className={cn('rounded-md px-2 py-0.5 text-xs font-bold', gradeBg(semAvgPct))}>
                          {percentToLetter(semAvgPct)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {semGPA !== null && <span className="text-lg font-extrabold text-violet-700">{semGPA.toFixed(2)}</span>}
                    </td>
                    <td className="py-3 text-right font-extrabold text-indigo-600">{totalQP.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-amber-700">
                GPA scale: A+ 90% = 4.0 · A 85% = 3.7 · A– 80% = 3.3 · B+ 75% = 3.0 · B 70% = 2.7 · B– 65% = 2.3 · C+ 60% = 2.0 · C 55% = 1.7 · D 50% = 1.0 · F &lt;50% = 0.0.
                Verify with your university's official grading policy.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GradesPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Grade Calculator</h1>
        <p className="mt-1 text-sm text-slate-500">
          Calculate weighted grades per course and your semester GPA
        </p>
      </motion.div>

      <Tabs defaultValue="single">
        <TabsList className="mb-6 h-10 rounded-xl bg-slate-100 p-1">
          <TabsTrigger value="single" className="rounded-lg text-xs font-semibold">
            Single Course
          </TabsTrigger>
          <TabsTrigger value="semester" className="rounded-lg text-xs font-semibold">
            Semester GPA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <SingleCourseCalculator />
          </motion.div>
        </TabsContent>

        <TabsContent value="semester">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <SemesterCalculator />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
