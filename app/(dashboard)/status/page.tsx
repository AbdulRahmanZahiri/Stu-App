'use client'

import { useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Loader2, RefreshCw, Zap, Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Status = 'idle' | 'loading' | 'ok' | 'error'

interface ServiceResult {
  status: Status
  message: string
  ms?: number
}

const INITIAL: ServiceResult = { status: 'idle', message: 'Not tested yet' }

const SAMPLE_TEXT = `Course: Introduction to Computer Science
Instructor: Dr. Smith
Assignments: 5 (30%), Midterm: 20%, Final Exam: 40%, Labs: 10%
Key Dates: Assignment 1 due Sept 15, Midterm Oct 20, Final Dec 10
Textbook: Introduction to Algorithms, 4th Edition`

const SAMPLE_TASKS = [
  { title: 'Assignment 1', dueDate: new Date(Date.now() + 3 * 86400000).toISOString(), estimatedHours: 3, type: 'assignment', priority: 'high' },
  { title: 'Midterm Exam', dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), estimatedHours: 5, type: 'exam', priority: 'urgent' },
]

export default function StatusPage() {
  const [results, setResults] = useState<Record<string, ServiceResult>>({
    supabase: INITIAL,
    ai: INITIAL,
    syllabus: INITIAL,
    schedule: INITIAL,
    podcast: INITIAL,
    pdf: INITIAL,
  })
  const [runningAll, setRunningAll] = useState(false)

  function set(key: string, val: ServiceResult) {
    setResults(prev => ({ ...prev, [key]: val }))
  }

  const testSupabase = useCallback(async () => {
    set('supabase', { status: 'loading', message: 'Checking auth session…' })
    const t = Date.now()
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      const user = data.session?.user
      set('supabase', {
        status: 'ok',
        message: user ? `Signed in as ${user.email}` : 'Connected (no session)',
        ms: Date.now() - t,
      })
    } catch (e) {
      set('supabase', { status: 'error', message: e instanceof Error ? e.message : 'Failed', ms: Date.now() - t })
    }
  }, [])

  const testAI = useCallback(async () => {
    set('ai', { status: 'loading', message: 'Sending test message…' })
    const t = Date.now()
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Reply with exactly 5 words.' }] }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
      }
      set('ai', { status: 'ok', message: `"${text.slice(0, 80)}"`, ms: Date.now() - t })
    } catch (e) {
      set('ai', { status: 'error', message: e instanceof Error ? e.message : 'Failed', ms: Date.now() - t })
    }
  }, [])

  const testSyllabus = useCallback(async () => {
    set('syllabus', { status: 'loading', message: 'Parsing sample syllabus…' })
    const t = Date.now()
    try {
      const res = await fetch('/api/syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: SAMPLE_TEXT, fileName: 'test-syllabus.txt' }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || res.statusText)
      const parser = d.parser ?? 'unknown'
      const course = d.data?.courseTitle ?? 'parsed'
      set('syllabus', { status: 'ok', message: `${parser} parser — "${course}"`, ms: Date.now() - t })
    } catch (e) {
      set('syllabus', { status: 'error', message: e instanceof Error ? e.message : 'Failed', ms: Date.now() - t })
    }
  }, [])

  const testSchedule = useCallback(async () => {
    set('schedule', { status: 'loading', message: 'Generating sample schedule…' })
    const t = Date.now()
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: SAMPLE_TASKS, calendarEvents: [] }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || res.statusText)
      const days = d.days?.length ?? 0
      set('schedule', { status: 'ok', message: `Generated ${days} day${days !== 1 ? 's' : ''} of sessions`, ms: Date.now() - t })
    } catch (e) {
      set('schedule', { status: 'error', message: e instanceof Error ? e.message : 'Failed', ms: Date.now() - t })
    }
  }, [])

  const testPodcast = useCallback(async () => {
    set('podcast', { status: 'loading', message: 'Generating sample podcast script…' })
    const t = Date.now()
    try {
      const res = await fetch('/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: SAMPLE_TEXT, title: 'Status Test Episode' }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || res.statusText)
      const lines = d.dialogue?.length ?? 0
      set('podcast', { status: 'ok', message: `Generated ${lines} dialogue lines`, ms: Date.now() - t })
    } catch (e) {
      set('podcast', { status: 'error', message: e instanceof Error ? e.message : 'Failed', ms: Date.now() - t })
    }
  }, [])

  const testPDF = useCallback(async () => {
    set('pdf', { status: 'loading', message: 'Testing PDF extractor…' })
    const t = Date.now()
    try {
      // Test with a minimal plain text file to verify the endpoint responds
      const blob = new Blob(['Hello world test file for ScholarFlow status check.'], { type: 'text/plain' })
      const file = new File([blob], 'test.txt', { type: 'text/plain' })
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/extract-pdf', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || res.statusText)
      set('pdf', { status: 'ok', message: `Extracted ${d.text?.length ?? 0} characters`, ms: Date.now() - t })
    } catch (e) {
      set('pdf', { status: 'error', message: e instanceof Error ? e.message : 'Failed', ms: Date.now() - t })
    }
  }, [])

  const runAll = useCallback(async () => {
    setRunningAll(true)
    await testSupabase()
    await testAI()
    await testSyllabus()
    await testSchedule()
    await testPodcast()
    await testPDF()
    setRunningAll(false)
  }, [testSupabase, testAI, testSyllabus, testSchedule, testPodcast, testPDF])

  const services = [
    { key: 'supabase', label: 'Supabase Auth', description: 'Auth session & database connection', onTest: testSupabase, fast: true },
    { key: 'ai',       label: 'AI Assistant',  description: 'Streaming chat via Groq',            onTest: testAI,       fast: false },
    { key: 'syllabus', label: 'Syllabus Import', description: 'AI syllabus parser',               onTest: testSyllabus, fast: false },
    { key: 'schedule', label: 'Smart Schedule', description: 'AI weekly schedule generator',      onTest: testSchedule, fast: false },
    { key: 'podcast',  label: 'Podcast (StudyCast)', description: 'AI dialogue generator',        onTest: testPodcast,  fast: false },
    { key: 'pdf',      label: 'File Extractor', description: 'PDF / DOCX / TXT text extraction',  onTest: testPDF,      fast: true },
  ]

  const allOk = services.every(s => results[s.key].status === 'ok')
  const anyError = services.some(s => results[s.key].status === 'error')
  const anyLoading = services.some(s => results[s.key].status === 'loading')
  const anyTested = services.some(s => results[s.key].status !== 'idle')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-md">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">System Status</h1>
          </div>
          <p className="text-sm text-slate-500">Test every ScholarFlow feature in one click</p>
        </div>
        <button
          onClick={runAll}
          disabled={anyLoading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {anyLoading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Testing…</>
            : <><Play className="h-4 w-4" /> Test All</>
          }
        </button>
      </div>

      {/* Overall banner */}
      {anyTested && !anyLoading && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium flex items-center gap-2 ${
          allOk
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : anyError
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          {allOk
            ? <><CheckCircle2 className="h-4 w-4" /> All systems operational</>
            : anyError
            ? <><XCircle className="h-4 w-4" /> Some services need attention</>
            : <><Loader2 className="h-4 w-4" /> Partially tested</>
          }
        </div>
      )}

      {/* Service cards */}
      <div className="space-y-3">
        {services.map(({ key, label, description, onTest, fast }) => {
          const r = results[key]
          return (
            <div key={key} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">

              {/* Status icon */}
              <div className="shrink-0">
                {r.status === 'loading' && <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />}
                {r.status === 'ok'      && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                {r.status === 'error'   && <XCircle className="h-5 w-5 text-rose-500" />}
                {r.status === 'idle'    && <div className="h-5 w-5 rounded-full border-2 border-slate-200" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  {fast && <span className="text-[10px] font-medium text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">fast</span>}
                  {r.ms !== undefined && (
                    <span className="text-[10px] text-slate-400">{r.ms}ms</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
                {r.status !== 'idle' && (
                  <p className={`text-xs mt-1 font-mono ${
                    r.status === 'ok' ? 'text-emerald-600' :
                    r.status === 'error' ? 'text-rose-600' : 'text-slate-400'
                  }`}>
                    {r.message}
                  </p>
                )}
              </div>

              {/* Test button */}
              <button
                onClick={onTest}
                disabled={r.status === 'loading' || runningAll}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {r.status === 'loading'
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <RefreshCw className="h-3 w-3" />
                }
                {r.status === 'loading' ? 'Testing' : r.status === 'idle' ? 'Test' : 'Retest'}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-slate-400">
        Note: AI tests (AI, Syllabus, Schedule, Podcast) each take 5–35 seconds — that's normal.
      </p>
    </div>
  )
}
