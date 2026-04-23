'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Headphones, Play, Pause, SkipForward, SkipBack, Volume2,
  Plus, Loader2, Sparkles, FileText, Check, AlertCircle, Music,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { mockAudioItems, mockNotes } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/app-store'
import { ProGate } from '@/components/ui/pro-gate'
import type { AudioStudyItem } from '@/lib/types'

export default function AudioStudyPage() {
  const { plan } = useAppStore()
  const [playing, setPlaying] = useState(false)
  const [items, setItems] = useState(mockAudioItems)
  const [activeItem, setActiveItem] = useState(mockAudioItems[0])
  const [progress, setProgress] = useState(35)
  const [volume, setVolume] = useState(80)
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generateSuccess, setGenerateSuccess] = useState(false)

  function formatDuration(seconds?: number) {
    if (!seconds) return '--:--'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function skipBack() {
    setProgress((p) => Math.max(0, p - 10))
  }

  function skipForward() {
    setProgress((p) => Math.min(100, p + 10))
  }

  function selectItem(item: typeof mockAudioItems[0]) {
    if (item.status !== 'ready') return
    setActiveItem(item)
    setPlaying(false)
    setProgress(0)
  }

  async function generateAudio() {
    if (!selectedNote) return
    const note = mockNotes.find((n) => n.id === selectedNote)
    if (!note) return

    setGenerating(true)
    setGenerateError(null)
    setGenerateSuccess(false)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Generate a podcast-style audio script (2-3 minutes when read aloud) summarizing this note titled "${note.title}"${note.courseCode ? ` from ${note.courseCode}` : ''}. Make it engaging and educational. Content: ${note.content || note.excerpt || 'No content available'}`
          }]
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      const newItem: AudioStudyItem = {
        id: `audio-${Date.now()}`,
        title: `${note.title} — Audio Summary`,
        sourceNoteId: note.id,
        duration: Math.floor(data.content.length / 12),
        script: data.content,
        status: 'ready',
        createdAt: new Date(),
      }
      setItems((p) => [newItem, ...p])
      setActiveItem(newItem)
      setProgress(0)
      setPlaying(false)
      setGenerateSuccess(true)
      setSelectedNote(null)
      setTimeout(() => setGenerateSuccess(false), 3000)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }

  if (plan === 'free') {
    return (
      <ProGate
        feature="audio"
        title="Audio Podcasts is a Pro Feature"
        description="Turn any of your notes into a podcast-style audio summary — AI-generated scripts you can listen to while commuting, working out, or relaxing."
      />
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audio Study Mode</h1>
          <p className="mt-1 text-sm text-slate-500">Listen to AI-generated podcast-style summaries of your notes</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
            <Headphones className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold">Audio Study Mode — Beta</p>
            <p className="text-xs text-white/70">AI generates podcast-style scripts from your notes · Real TTS coming soon</p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Player */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              {/* Active item info */}
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg">
                  <Headphones className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">{activeItem.title}</p>
                  <p className="text-sm text-slate-400">
                    {activeItem.status === 'ready' ? `${formatDuration(activeItem.duration)} · AI Generated` :
                     activeItem.status === 'generating' ? 'Generating audio...' : 'Generation failed'}
                  </p>
                  <Badge variant={activeItem.status === 'ready' ? 'success' : activeItem.status === 'generating' ? 'warning' : 'error'} className="mt-1 text-[10px]">
                    {activeItem.status === 'ready' ? 'Ready' : activeItem.status === 'generating' ? 'Generating' : 'Failed'}
                  </Badge>
                </div>
              </div>

              {/* Waveform */}
              <div className="mb-4 flex h-12 items-center gap-0.5">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn('rounded-full transition-colors', i < (progress / 100) * 60 ? 'bg-violet-500' : 'bg-slate-200')}
                    style={{ width: 3, height: `${20 + Math.sin(i * 0.5) * 15 + ((i * 7) % 10)}px` }}
                  />
                ))}
              </div>

              {/* Timeline */}
              <div className="mb-4">
                <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                  <span>{formatDuration(Math.floor((progress / 100) * (activeItem.duration ?? 0)))}</span>
                  <span>{formatDuration(activeItem.duration)}</span>
                </div>
                <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-violet-600 cursor-pointer" />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-700" onClick={skipBack} title="Back 10%">
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button
                  onClick={() => setPlaying((p) => !p)}
                  disabled={activeItem.status !== 'ready'}
                  className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg hover:from-violet-600 hover:to-indigo-600"
                  size="icon"
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-700" onClick={skipForward} title="Forward 10%">
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              {/* Volume */}
              <div className="mt-4 flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-slate-400 shrink-0" />
                <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="flex-1 accent-violet-600 cursor-pointer" />
                <span className="text-xs text-slate-400 w-8 text-right">{volume}%</span>
              </div>

              {/* Script preview */}
              {activeItem.script && (
                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Script Preview</p>
                  <p className="text-xs leading-relaxed text-slate-600 line-clamp-4">{activeItem.script}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
          {/* Queue */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Listen Later</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                    activeItem.id === item.id ? 'border-violet-200 bg-violet-50' : 'border-slate-100 hover:bg-slate-50',
                    item.status !== 'ready' && 'opacity-60 cursor-default'
                  )}
                >
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', item.status === 'ready' ? 'bg-violet-100' : 'bg-slate-100')}>
                    {item.status === 'generating' ? <Loader2 className="h-4 w-4 text-amber-500 animate-spin" /> : <Music className="h-4 w-4 text-violet-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700">{item.title}</p>
                    <p className="text-[10px] text-slate-400">{item.status === 'ready' ? formatDuration(item.duration) : item.status === 'generating' ? 'Generating...' : 'Failed'}</p>
                  </div>
                  {activeItem.id === item.id && playing && (
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => <div key={i} className="w-0.5 rounded-full bg-violet-500 animate-bounce" style={{ height: 12, animationDelay: `${i * 100}ms` }} />)}
                    </div>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Generate from note */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Generate from Note</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-xs text-slate-500 mb-3">Select a note to generate an AI audio summary</p>
              {mockNotes.slice(0, 3).map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNote(note.id === selectedNote ? null : note.id)}
                  className={cn(
                    'mb-2 w-full flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-all',
                    selectedNote === note.id ? 'border-violet-300 bg-violet-50' : 'border-slate-100 hover:bg-slate-50'
                  )}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                  <span className="truncate text-slate-700 flex-1">{note.title}</span>
                  {selectedNote === note.id && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
                </button>
              ))}

              {generateError && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <p className="text-xs text-rose-600">{generateError}</p>
                </div>
              )}
              {generateSuccess && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-600">Audio script generated!</p>
                </div>
              )}

              <Button
                variant="gradient-subtle"
                size="sm"
                className="mt-2 w-full text-xs gap-1"
                onClick={generateAudio}
                disabled={!selectedNote || generating}
              >
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {generating ? 'Generating...' : 'Generate Audio Summary'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
