'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Upload, Plus, CheckCircle2,
  Clock, ChevronRight, Check, Loader2, AlertCircle, Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/app-store'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import type { Course, Task } from '@/lib/types'

const COURSE_COLORS = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

type UploadState = 'idle' | 'reading' | 'parsing' | 'done' | 'error'
type UploadTab = 'file' | 'paste'

interface ParsedSyllabus {
  instructor: string | null
  courseTitle: string | null
  courseCode: string | null
  assignments: number
  quizzes: number
  exams: number
  deadlines: number
  gradingBreakdown: { name: string; weight: number }[]
  keyDates: { title: string; date: string }[]
  officeHours: string | null
  textbook: string | null
  summary: string | null
}

export default function CoursesPage() {
  const { courses, addCourse: storeAddCourse, deleteCourse, saveSyllabusImport } = useAppStore()
  const { user, profile } = useAuth()
  const [uploadingCourse, setUploadingCourse] = useState<Course | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [dragOver, setDragOver] = useState(false)
  const [parsed, setParsed] = useState<ParsedSyllabus | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseWarning, setParseWarning] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadTab, setUploadTab] = useState<UploadTab>('file')
  const [pasteText, setPasteText] = useState('')
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [newCourse, setNewCourse] = useState({ code: '', name: '', instructor: '', credits: '3', schedule: '', room: '', color: '#6366f1' })
  const fileRef = useRef<HTMLInputElement>(null)

  function handleAddCourse() {
    if (!newCourse.code.trim() || !newCourse.name.trim()) return
    const course: Course = {
      id: crypto.randomUUID(),
      studentId: user?.id ?? '',
      code: newCourse.code.trim().toUpperCase(),
      name: newCourse.name.trim(),
      instructor: newCourse.instructor.trim() || undefined,
      credits: parseInt(newCourse.credits) || 3,
      semester: profile?.semester ?? new Date().getFullYear().toString(),
      year: 2026,
      color: newCourse.color,
      schedule: newCourse.schedule.trim() || undefined,
      room: newCourse.room.trim() || undefined,
      status: 'active',
      syllabusUploaded: false,
    }
    storeAddCourse(course)
    setNewCourse({ code: '', name: '', instructor: '', credits: '3', schedule: '', room: '', color: '#6366f1' })
    setShowAddCourse(false)
  }

  async function parseSyllabusText(text: string, name: string) {
    setUploadState('parsing')
    setParseError(null)
    setParseWarning(null)
    setParsed(null)

    try {
      const res = await fetch('/api/syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fileName: name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to parse syllabus')
      setParsed(data.data)
      setParseWarning(typeof data.warning === 'string' ? data.warning : null)
      setUploadState('done')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Something went wrong')
      setUploadState('error')
    }
  }

  async function handleFile(file: File) {
    setFileName(file.name)
    setSourceFile(file)
    setUploadState('reading')
    setParseError(null)
    setParseWarning(null)
    setParsed(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (file.size > 10 * 1024 * 1024) {
      setParseError('Files must be under 10 MB.')
      setUploadState('error')
      return
    }
    if (!['pdf', 'docx', 'txt', 'md'].includes(ext) && file.type !== 'application/pdf' && !file.type.startsWith('text/')) {
      setParseError('Supported files are PDF, DOCX, TXT, and Markdown.')
      setUploadState('error')
      return
    }

    try {
      let text: string

      if (file.type === 'application/pdf' || ext === 'pdf' || ext === 'docx') {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/extract-pdf', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to extract PDF text')
        text = data.text as string
      } else {
        text = await readFileAsText(file)
      }

      await parseSyllabusText(text, file.name)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Could not read file')
      setUploadState('error')
    }
  }

  async function handlePasteSubmit() {
    if (!pasteText.trim() || pasteText.trim().length < 50) {
      setParseError('Please paste at least a few sentences of your syllabus.')
      setUploadState('error')
      return
    }
    setFileName('pasted-syllabus.txt')
    setSourceFile(null)
    setUploadState('reading')
    await parseSyllabusText(pasteText.trim(), uploadingCourse?.code ?? 'syllabus')
  }

  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Could not read file'))
      reader.readAsText(file)
    })
  }

  function resetDialog() {
    setUploadingCourse(null)
    setUploadState('idle')
    setParsed(null)
    setParseError(null)
    setParseWarning(null)
    setFileName('')
    setSourceFile(null)
    setSaving(false)
    setPasteText('')
    setUploadTab('file')
  }

  async function confirmSave() {
    if (!uploadingCourse || !parsed) return

    const newTasks: Task[] = (parsed.keyDates ?? [])
      .filter((kd) => {
        if (!kd.title || !kd.date) return false
        const d = new Date(kd.date)
        return !isNaN(d.getTime())  // skip dates the AI made up like "Week 5" or "TBD"
      })
      .map((kd) => {
        const t = kd.title.toLowerCase()
        const isExam = t.includes('exam') || t.includes('midterm') || t.includes('final')
        const isQuiz = t.includes('quiz') || t.includes('test')
        const isLab = t.includes('lab')
        const isProject = t.includes('project') || t.includes('presentation') || t.includes('report')
        const type: Task['type'] = isExam ? 'exam' : isQuiz ? 'quiz' : isLab ? 'assignment' : isProject ? 'assignment' : 'assignment'
        const priority: Task['priority'] = isExam ? 'high' : isProject ? 'high' : isQuiz ? 'medium' : 'medium'
        return {
          id: crypto.randomUUID(),
          studentId: user?.id ?? '',
          courseId: uploadingCourse.id,
          title: kd.title,
          type,
          status: 'not_started' as Task['status'],
          priority,
          dueDate: new Date(kd.date),
          courseCode: uploadingCourse.code,
          courseColor: uploadingCourse.color,
          courseName: uploadingCourse.name,
          tags: ['syllabus-import'],
        }
      })

    setSaving(true)
    try {
      await saveSyllabusImport({
        courseId: uploadingCourse.id,
        file: sourceFile,
        fileName: fileName || 'pasted-syllabus.txt',
        extractedData: { ...parsed },
        gradingBreakdown: parsed.gradingBreakdown ?? [],
        tasks: newTasks,
      })
      if (newTasks.length > 0) {
        toast.success(`Syllabus saved! Added ${newTasks.length} task${newTasks.length !== 1 ? 's' : ''} from ${uploadingCourse.code}`)
      } else {
        toast.success(`Syllabus saved for ${uploadingCourse.code}`)
      }
      resetDialog()
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Could not save the syllabus')
      setUploadState('error')
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your courses and upload syllabi for AI parsing</p>
        </div>
        <Button variant="gradient" size="sm" className="gap-1.5" onClick={() => setShowAddCourse(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Course
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2"
      >
        {courses.map((course, i) => (
          <motion.div key={course.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <CourseCard
              course={course}
              onUploadSyllabus={() => {
                setUploadingCourse(course)
                setUploadState('idle')
              }}
              onDelete={() => {
                if (confirm(`Delete "${course.code} – ${course.name}"?\n\nThis will also remove all associated grades and tasks.`)) {
                  deleteCourse(course.id)
                  toast.success(`${course.code} removed`)
                }
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0]
          e.currentTarget.value = ''
          if (file) void handleFile(file)
        }}
      />

      <Dialog open={!!uploadingCourse} onOpenChange={(open) => { if (!open) resetDialog() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Syllabus</DialogTitle>
            <DialogDescription>
              {uploadingCourse?.code} · {uploadingCourse?.name}
            </DialogDescription>
          </DialogHeader>

          {/* IDLE — tabs: file upload or paste text */}
          {uploadState === 'idle' && (
            <div>
              {/* Tab switcher */}
              <div className="mb-4 flex rounded-xl border border-slate-100 bg-slate-50 p-1">
                <button
                  onClick={() => setUploadTab('file')}
                  className={cn('flex-1 rounded-lg py-2 text-xs font-semibold transition-all', uploadTab === 'file' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setUploadTab('paste')}
                  className={cn('flex-1 rounded-lg py-2 text-xs font-semibold transition-all', uploadTab === 'paste' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                >
                  Paste Text
                </button>
              </div>

              {uploadTab === 'file' ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    const file = e.dataTransfer.files[0]
                    if (file) handleFile(file)
                  }}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all cursor-pointer',
                    dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                  )}
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                    <Upload className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Drop your syllabus here</p>
                  <p className="mt-1 text-xs text-slate-400">or click to browse</p>
                  <p className="mt-3 text-[11px] text-slate-300">PDF, DOCX, TXT, or Markdown · Max 10 MB</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Open your syllabus (PDF, Word, or any format), select all text, copy it, and paste it below.
                  </p>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste your syllabus text here..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:outline-none resize-none"
                    rows={8}
                  />
                  <Button
                    variant="gradient"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={handlePasteSubmit}
                    disabled={pasteText.trim().length < 50}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Parse Syllabus
                  </Button>
                </div>
              )}

              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-xs font-semibold text-emerald-700 mb-2">✨ What gets extracted:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {['Assignments & deadlines', 'Grade weights', 'Quiz & exam dates', 'Instructor info', 'Course policies', 'Weekly schedule'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-xs text-emerald-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* READING / PARSING */}
          {(uploadState === 'reading' || uploadState === 'parsing') && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="relative mb-6">
                <div className="h-16 w-16 rounded-full border-4 border-emerald-100" />
                <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-emerald-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {uploadState === 'reading' ? 'Reading file...' : 'Parsing your syllabus...'}
              </p>
              {fileName && <p className="mt-1 text-xs text-slate-400 truncate max-w-xs">{fileName}</p>}
              {uploadState === 'parsing' && (
                <div className="mt-4 w-full max-w-xs space-y-2 text-left">
                  {[
                    { label: 'Reading document structure', done: true },
                    { label: 'Extracting grade breakdown', done: true },
                    { label: 'Identifying deadlines & dates', done: false },
                    { label: 'Building task list', done: false },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {step.done
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        : <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 border-t-emerald-500 animate-spin" />
                      }
                      <span className={step.done ? 'text-slate-600' : 'text-slate-400'}>{step.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ERROR */}
          {uploadState === 'error' && (
            <div className="py-6">
              <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 mb-4">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-800">Parsing failed</p>
                  <p className="text-xs text-rose-600 mt-1">{parseError}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setUploadState('idle')}>
                Try again
              </Button>
            </div>
          )}

          {/* DONE — results */}
          {uploadState === 'done' && parsed && (
            <div>
              <div className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Syllabus parsed successfully!</p>
                  {parsed.summary && <p className="text-xs text-emerald-600 mt-0.5">{parsed.summary}</p>}
                </div>
              </div>

              {parseWarning && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{parseWarning}</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Assignments Found', value: parsed.assignments, color: 'bg-emerald-50 text-emerald-700' },
                    { label: 'Deadlines Extracted', value: parsed.deadlines, color: 'bg-blue-50 text-blue-700' },
                    { label: 'Quizzes', value: parsed.quizzes, color: 'bg-amber-50 text-amber-700' },
                    { label: 'Exams', value: parsed.exams, color: 'bg-rose-50 text-rose-700' },
                  ].map((stat) => (
                    <div key={stat.label} className={`rounded-xl p-3 ${stat.color}`}>
                      <p className="text-xl font-extrabold">{stat.value}</p>
                      <p className="text-xs opacity-70">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Instructor / office hours */}
                {(parsed.instructor || parsed.officeHours) && (
                  <div className="rounded-xl border border-slate-100 p-3 space-y-1">
                    {parsed.instructor && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Instructor</span>
                        <span className="font-medium text-slate-700">{parsed.instructor}</span>
                      </div>
                    )}
                    {parsed.officeHours && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Office Hours</span>
                        <span className="font-medium text-slate-700">{parsed.officeHours}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Grade breakdown */}
                {parsed.gradingBreakdown.length > 0 && (
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Grade Breakdown</p>
                    {parsed.gradingBreakdown.map((item) => (
                      <div key={item.name} className="flex items-center justify-between py-1">
                        <span className="text-sm text-slate-700">{item.name}</span>
                        <span className="text-sm font-semibold text-slate-900">{item.weight}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Key dates */}
                {parsed.keyDates.length > 0 && (
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      Key Dates &amp; Tasks ({parsed.keyDates.length})
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {parsed.keyDates.map((d, i) => (
                        <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                          <span className="text-sm text-slate-700 flex-1 min-w-0 truncate pr-2">{d.title}</span>
                          <span className="text-xs text-slate-400 shrink-0">{new Date(d.date).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={resetDialog}>
                    Close
                  </Button>
                  <Button variant="gradient" size="sm" className="flex-1" onClick={confirmSave} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {saving ? 'Saving...' : 'Confirm & Save'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Course Dialog */}
      <Dialog open={showAddCourse} onOpenChange={setShowAddCourse}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
            <DialogDescription>Add a course to your semester</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Course Code *</Label>
                <Input placeholder="e.g. COMP 3001" value={newCourse.code} onChange={(e) => setNewCourse((p) => ({ ...p, code: e.target.value }))} autoFocus />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Credits</Label>
                <Select value={newCourse.credits} onValueChange={(v) => setNewCourse((p) => ({ ...p, credits: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{['1','2','3','4','5','6'].map((c) => <SelectItem key={c} value={c}>{c} credits</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Course Name *</Label>
              <Input placeholder="e.g. Algorithms & Complexity" value={newCourse.name} onChange={(e) => setNewCourse((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Instructor</Label>
              <Input placeholder="e.g. Dr. Smith" value={newCourse.instructor} onChange={(e) => setNewCourse((p) => ({ ...p, instructor: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Schedule</Label>
                <Input placeholder="e.g. MWF 10:00-10:50" value={newCourse.schedule} onChange={(e) => setNewCourse((p) => ({ ...p, schedule: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Room</Label>
                <Input placeholder="e.g. EN-2006" value={newCourse.room} onChange={(e) => setNewCourse((p) => ({ ...p, room: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Color</Label>
              <div className="flex gap-2">
                {COURSE_COLORS.map((c) => (
                  <button key={c} onClick={() => setNewCourse((p) => ({ ...p, color: c }))} className={cn('h-7 w-7 rounded-full transition-all', newCourse.color === c ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : 'hover:scale-105')} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowAddCourse(false)}>Cancel</Button>
              <Button variant="gradient" size="sm" className="flex-1" onClick={handleAddCourse} disabled={!newCourse.code.trim() || !newCourse.name.trim()}>
                <Plus className="h-3.5 w-3.5" />Add Course
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CourseCard({ course, onUploadSyllabus, onDelete }: { course: Course; onUploadSyllabus: () => void; onDelete: () => void }) {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="h-1.5 w-full" style={{ backgroundColor: course.color }} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-extrabold" style={{ color: course.color }}>{course.code}</span>
              <Badge variant="secondary" className="text-[9px]">{course.credits} cr</Badge>
            </div>
            <h3 className="text-base font-semibold text-slate-900 leading-tight">{course.name}</h3>
            {course.instructor && <p className="mt-0.5 text-xs text-slate-400">{course.instructor}</p>}
          </div>
          <div className="flex items-start gap-2 ml-2">
            {course.currentGrade !== undefined && (
              <div className="text-right">
                <p className="text-xl font-extrabold" style={{ color: course.color }}>{course.currentGrade}%</p>
                <p className="text-xs font-semibold text-slate-500">{course.letterGrade}</p>
              </div>
            )}
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500"
              title="Delete course"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {course.schedule && (
          <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            {course.schedule}
            {course.room && <><span className="text-slate-300">·</span><span>{course.room}</span></>}
          </div>
        )}

        {course.currentGrade !== undefined && (
          <div className="mb-4">
            <Progress
              value={course.currentGrade}
              className="h-1.5"
              indicatorClassName={course.currentGrade >= 85 ? 'bg-emerald-500' : course.currentGrade >= 70 ? 'bg-blue-500' : 'bg-amber-500'}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          {course.syllabusUploaded ? (
            <div className="flex flex-1 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">Syllabus uploaded</span>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs border-dashed border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              onClick={onUploadSyllabus}
            >
              <Upload className="h-3 w-3" />
              Upload Syllabus
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUploadSyllabus} title={course.syllabusUploaded ? 'Replace syllabus' : 'Upload syllabus'}>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
