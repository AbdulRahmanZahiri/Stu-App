'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Headphones, Play, Pause, SkipForward, SkipBack, Volume2,
  Loader2, Sparkles, FileText, Check, AlertCircle, Music,
  Upload, ClipboardPaste, Mic, Radio, ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/app-store'
import { extractDocumentText } from '@/lib/client-document-extractor'
import type { AudioStudyItem, PodcastLine } from '@/lib/types'

const EMPTY_ITEM: AudioStudyItem = {
  id: '__empty__',
  title: 'No episode selected',
  status: 'ready',
  createdAt: new Date(0),
}

type GenerateTab = 'note' | 'pdf' | 'paste'

const LARGE_DOCUMENT_BYTES = 5 * 1024 * 1024
const MAX_PODCAST_SOURCE_CHARS = 12_000
const MIN_PODCAST_SECTION_CHARS = 2_400
const SERIES_EPISODE_OPTIONS = [1, 3, 5] as const
const GEN_STEPS = ['Reading your content…', 'Writing the script…', 'Polishing dialogue…', 'Almost ready…']

type SeriesEpisodeCount = (typeof SERIES_EPISODE_OPTIONS)[number]

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function samplePodcastSection(section: string): string {
  if (section.length <= MAX_PODCAST_SOURCE_CHARS) return section

  const separator = '\n\nAdditional material from this section:\n\n'
  const excerptLength = Math.floor((MAX_PODCAST_SOURCE_CHARS - separator.length * 2) / 3)
  const middleStart = Math.max(excerptLength, Math.floor((section.length - excerptLength) / 2))

  return [
    section.slice(0, excerptLength),
    section.slice(middleStart, middleStart + excerptLength),
    section.slice(-excerptLength),
  ].join(separator)
}

function createPodcastSections(source: string, requestedCount: SeriesEpisodeCount): string[] {
  const normalized = source.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  const usefulEpisodeCount = Math.max(1, Math.floor(normalized.length / MIN_PODCAST_SECTION_CHARS))
  const episodeCount = Math.min(requestedCount, usefulEpisodeCount)

  if (episodeCount === 1) return [normalized.slice(0, MAX_PODCAST_SOURCE_CHARS)]

  const sectionLength = Math.ceil(normalized.length / episodeCount)
  return Array.from({ length: episodeCount }, (_, index) => {
    const start = index * sectionLength
    const end = Math.min(normalized.length, start + sectionLength)
    return samplePodcastSection(normalized.slice(start, end).trim())
  }).filter(section => section.length >= 50)
}

// ─── Voice picker ────────────────────────────────────────────────────────────
// Priority lists: first match wins. Alex = HOST_1 (female/bright), Jordan = HOST_2 (male/deep)
const ALEX_VOICES = ['Samantha', 'Karen', 'Moira', 'Fiona', 'Victoria', 'Google UK English Female', 'Microsoft Zira', 'Tessa']
const JORDAN_VOICES = ['Daniel', 'Rishi', 'Google UK English Male', 'Microsoft David', 'Fred', 'Tom', 'Alex', 'Google US English']

function pickVoices(): [SpeechSynthesisVoice | null, SpeechSynthesisVoice | null] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [null, null]
  const all = window.speechSynthesis.getVoices()
  if (!all.length) return [null, null]
  const en = all.filter(v => v.lang.startsWith('en'))
  const pool = en.length ? en : all

  function find(names: string[], exclude?: SpeechSynthesisVoice | null) {
    for (const name of names) {
      const v = pool.find(v => v.name.toLowerCase().includes(name.toLowerCase()))
      if (v && v !== exclude) return v
    }
    return null
  }

  const v1 = find(ALEX_VOICES)
  const v2 = find(JORDAN_VOICES, v1) ?? pool.find(v => v !== v1) ?? null
  return [v1, v2]
}

// ─── Waveform bars ───────────────────────────────────────────────────────────
const BARS = Array.from({ length: 52 }, (_, i) => Math.round(20 + Math.sin(i * 0.7) * 14 + (i * 5 % 11)))

// ─── Host avatar ─────────────────────────────────────────────────────────────
function HostBadge({ host, active }: { host: 'HOST_1' | 'HOST_2'; active: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide shrink-0',
      host === 'HOST_1'
        ? active ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
        : active ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700',
    )}>
      <Mic className="h-2.5 w-2.5" />
      {host === 'HOST_1' ? 'Alex' : 'Jordan'}
    </span>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function AudioStudyPage() {
  const { notes, audioItems, addAudioItems, dataMode } = useAppStore()

  // Player state
  const [activeId, setActiveId] = useState<string>('')
  const activeItem = audioItems.find(i => i.id === activeId) ?? audioItems[0] ?? EMPTY_ITEM
  const isEmpty = activeItem.id === EMPTY_ITEM.id

  const [playing, setPlaying] = useState(false)
  const [segIndex, setSegIndex] = useState(0)
  const [volume, setVolume] = useState(80)
  const [showTranscript, setShowTranscript] = useState(false)
  const volumeRef = useRef(0.8)
  const voicesRef = useRef<[SpeechSynthesisVoice | null, SpeechSynthesisVoice | null]>([null, null])
  const segRef = useRef(0)
  const playingRef = useRef(false)
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Generate state
  const [tab, setTab] = useState<GenerateTab>('note')
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genSuccess, setGenSuccess] = useState<string | null>(null)
  const [genProgress, setGenProgress] = useState(0)
  const [genStep, setGenStep] = useState(0)
  const [generationPart, setGenerationPart] = useState(1)
  const [generationTotal, setGenerationTotal] = useState(1)
  const [episodeCount, setEpisodeCount] = useState<SeriesEpisodeCount>(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isLargeDocument = (pdfFile?.size ?? 0) >= LARGE_DOCUMENT_BYTES

  useEffect(() => {
    if (!generating) return
    const start = Date.now()
    const TOTAL_MS = 28_000
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const partProgress = Math.min(0.92, elapsed / TOTAL_MS)
      const totalProgress = ((generationPart - 1 + partProgress) / generationTotal) * 100
      setGenProgress(totalProgress)
      setGenStep(Math.min(GEN_STEPS.length - 1, Math.floor((elapsed / TOTAL_MS) * GEN_STEPS.length)))
    }, 200)
    return () => clearInterval(tick)
  }, [generating, generationPart, generationTotal])
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Load voices (async on some browsers)
  useEffect(() => {
    if (typeof window === 'undefined') return
    function load() { voicesRef.current = pickVoices() }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  useEffect(() => {
    volumeRef.current = volume / 100
  }, [volume])

  // Cancel on unmount + clear keepalive
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel()
      if (keepaliveRef.current) clearInterval(keepaliveRef.current)
    }
  }, [])

  // Chrome bug: speechSynthesis silently pauses after ~15 s — keep it awake
  useEffect(() => {
    if (playing) {
      keepaliveRef.current = setInterval(() => {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
        }
      }, 10_000)
    } else {
      if (keepaliveRef.current) { clearInterval(keepaliveRef.current); keepaliveRef.current = null }
    }
    return () => { if (keepaliveRef.current) { clearInterval(keepaliveRef.current); keepaliveRef.current = null } }
  }, [playing])

  // ── Playback helpers ──────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    playingRef.current = false
    setPlaying(false)
  }, [])

  // Sequential speak — each line triggers the next on `onend` (most reliable cross-browser)
  const speakFrom = useCallback((startIdx: number, dialogue: PodcastLine[]) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    if (!dialogue.length || startIdx >= dialogue.length) return

    const [v1, v2] = voicesRef.current

    function speakLine(idx: number) {
      if (!playingRef.current || idx >= dialogue.length) {
        if (idx >= dialogue.length) {
          playingRef.current = false
          setPlaying(false)
          segRef.current = 0
          setSegIndex(0)
        }
        return
      }

      const line = dialogue[idx]
      const utt = new SpeechSynthesisUtterance(line.text)

      if (line.speaker === 'HOST_1') {
        if (v1) utt.voice = v1
        utt.rate = 1.05
        utt.pitch = 1.1
      } else {
        if (v2) utt.voice = v2
        utt.rate = 1.1
        utt.pitch = 0.92
      }
      utt.volume = volumeRef.current

      utt.onstart = () => {
        segRef.current = idx
        setSegIndex(idx)
      }

      utt.onend = () => speakLine(idx + 1)

      utt.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return
        speakLine(idx + 1) // skip broken line, continue
      }

      window.speechSynthesis.speak(utt)
    }

    speakLine(startIdx)
  }, [])

  function togglePlay() {
    if (isEmpty || activeItem.status !== 'ready') return
    const dialogue = activeItem.dialogue
    if (!dialogue?.length) return

    if (playing) {
      stopAll()
    } else {
      playingRef.current = true
      setPlaying(true)
      const start = segRef.current >= dialogue.length ? 0 : segRef.current
      speakFrom(start, dialogue)
    }
  }

  function skipBack() {
    const dialogue = activeItem.dialogue
    if (!dialogue?.length) return
    const next = Math.max(0, segRef.current - 2)
    segRef.current = next
    setSegIndex(next)
    if (playing) speakFrom(next, dialogue)
  }

  function skipForward() {
    const dialogue = activeItem.dialogue
    if (!dialogue?.length) return
    const next = Math.min(dialogue.length - 1, segRef.current + 2)
    segRef.current = next
    setSegIndex(next)
    if (playing) speakFrom(next, dialogue)
  }

  function selectItem(item: AudioStudyItem) {
    if (item.status !== 'ready' || item.id === activeId) return
    stopAll()
    segRef.current = 0
    setSegIndex(0)
    setActiveId(item.id)
    setShowTranscript(false)
  }

  // Auto-scroll transcript
  useEffect(() => {
    if (!showTranscript || !transcriptRef.current) return
    const el = transcriptRef.current.querySelector(`[data-seg="${segIndex}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [segIndex, showTranscript])

  // ── Generation ────────────────────────────────────────────────────────────
  function selectDocument(file: File | null) {
    setPdfFile(file)
    setEpisodeCount(file && file.size >= LARGE_DOCUMENT_BYTES ? 3 : 1)
    setGenError(null)
    setGenSuccess(null)
  }

  async function generate() {
    const generatedItems: AudioStudyItem[] = []
    let saveAttempted = false

    setGenProgress(0)
    setGenStep(0)
    setGenerationPart(1)
    setGenerationTotal(1)
    setGenerating(true)
    setGenError(null)
    setGenSuccess(null)

    try {
      let source = ''
      let title = ''

      if (tab === 'note') {
        const note = notes.find(n => n.id === selectedNote)
        if (!note) throw new Error('Select a note first')
        source = note.content || note.excerpt || ''
        title = note.title
      } else if (tab === 'pdf') {
        if (!pdfFile) throw new Error('Upload a PDF first')
        source = (await extractDocumentText(pdfFile)).text
        title = pdfFile.name.replace(/\.[^.]+$/, '')
      } else {
        source = pasteText.trim()
        title = source.split('\n')[0].slice(0, 60) || 'Pasted content'
      }

      if (!source || source.length < 50) throw new Error('Not enough text to generate a podcast')

      const requestedCount = tab === 'pdf' && isLargeDocument ? episodeCount : 1
      const sections = createPodcastSections(source, requestedCount)
      setGenerationTotal(sections.length)

      for (let index = 0; index < sections.length; index += 1) {
        const part = index + 1
        const partTitle = sections.length > 1 ? `${title} — Part ${part} of ${sections.length}` : title

        setGenerationPart(part)
        setGenStep(0)

        const res = await fetch('/api/podcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: sections[index], title: partTitle }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Episode ${part} generation failed`)

        generatedItems.push({
          id: crypto.randomUUID(),
          title: sections.length > 1 ? partTitle : `${title} — Podcast`,
          sourceNoteId: tab === 'note' ? selectedNote ?? undefined : undefined,
          sourceType: tab === 'paste' ? 'text' : tab,
          sourceName: title,
          duration: data.duration,
          script: data.script,
          dialogue: data.dialogue,
          status: 'ready',
          createdAt: new Date(),
        })

        setGenProgress((part / sections.length) * 100)
      }

      saveAttempted = true
      await addAudioItems(generatedItems)

      const firstItem = generatedItems[0]
      stopAll()
      segRef.current = 0
      setSegIndex(0)
      setActiveId(firstItem.id)

      const savedLocation = dataMode === 'database' ? 'to your account' : 'in this browser'
      setGenSuccess(generatedItems.length > 1
        ? `${generatedItems.length}-part podcast series created and saved ${savedLocation}. Start with Part 1.`
        : `Episode ready and saved ${savedLocation}. Hit play.`
      )
      setSelectedNote(null)
      setPdfFile(null)
      setPasteText('')
      setEpisodeCount(1)
      setTimeout(() => setGenSuccess(null), 7000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed'
      if (generatedItems.length > 0 && !saveAttempted) {
        try {
          await addAudioItems(generatedItems)
          stopAll()
          segRef.current = 0
          setSegIndex(0)
          setActiveId(generatedItems[0].id)
          setGenError(`${generatedItems.length} completed episode${generatedItems.length === 1 ? '' : 's'} saved, but the series stopped: ${message}`)
        } catch (saveError) {
          const saveMessage = saveError instanceof Error ? saveError.message : 'Database save failed'
          setGenError(`${generatedItems.length} episode${generatedItems.length === 1 ? ' was' : 's were'} generated, but could not be saved: ${saveMessage}`)
        }
      } else if (saveAttempted) {
        setGenError(`${generatedItems.length > 1 ? 'Episodes were' : 'The episode was'} generated, but could not be saved: ${message}`)
      } else {
        setGenError(message)
      }
    } finally {
      setGenerating(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const dialogue = activeItem.dialogue ?? []
  const totalSegs = dialogue.length
  const progress = totalSegs > 0 ? (segIndex / totalSegs) * 100 : 0
  const currentSpeaker = dialogue[segIndex]?.speaker

  function fmt(secs?: number) {
    if (!secs) return '--:--'
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  }

  const canGenerate = !generating && (
    (tab === 'note' && !!selectedNote) ||
    (tab === 'pdf' && !!pdfFile) ||
    (tab === 'paste' && pasteText.trim().length >= 50)
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-md">
            <Radio className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Podcast Studio</h1>
            <p className="text-sm text-slate-500">Turn any PDF, note, or text into a 2-host podcast episode</p>
          </div>
        </div>
      </motion.div>

      {/* Hosts banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 p-4 text-white flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-base font-bold">A</div>
          <div>
            <p className="text-xs font-semibold opacity-70">Host 1</p>
            <p className="text-sm font-bold">Alex</p>
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1">
            {[4, 8, 12, 8, 16, 8, 12, 8, 4].map((h, i) => (
              <div key={i} className="w-1 rounded-full bg-white/50" style={{ height: h }} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div>
            <p className="text-xs font-semibold opacity-70 text-right">Host 2</p>
            <p className="text-sm font-bold text-right">Jordan</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-base font-bold">J</div>
        </div>
        <p className="hidden sm:block ml-4 text-xs text-white/60 max-w-xs">Two AI hosts have a real conversation about your material · Browser text-to-speech</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Player ────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-6">
              {/* Episode info */}
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg">
                  <Headphones className="h-7 w-7 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-slate-900">{activeItem.title}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {isEmpty
                      ? <span className="text-xs text-slate-400">Generate an episode to get started</span>
                      : activeItem.status === 'ready'
                        ? <>
                            <Badge variant="success" className="text-[10px]">Ready</Badge>
                            <span className="text-xs text-slate-400">{fmt(activeItem.duration)} · {totalSegs} exchanges</span>
                          </>
                        : <Badge variant="error" className="text-[10px]">Failed</Badge>
                    }
                  </div>
                </div>
                {!isEmpty && activeItem.dialogue?.length ? (
                  <button
                    onClick={() => setShowTranscript(v => !v)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors shrink-0"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Transcript
                    <ChevronDown className={cn('h-3 w-3 transition-transform', showTranscript && 'rotate-180')} />
                  </button>
                ) : null}
              </div>

              {/* Current speaker indicator */}
              {playing && currentSpeaker && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs text-slate-400">Now speaking:</span>
                  <HostBadge host={currentSpeaker} active={true} />
                </div>
              )}

              {/* Waveform */}
              <div className="mb-4 flex h-10 items-end gap-0.5">
                {BARS.map((h, i) => {
                  const filled = i < (progress / 100) * BARS.length
                  const isCurrent = playing && i === Math.floor((progress / 100) * BARS.length)
                  return (
                    <div
                      key={i}
                      className={cn(
                        'rounded-full transition-colors duration-150',
                        filled ? 'bg-emerald-500' : 'bg-slate-200',
                        isCurrent && 'animate-pulse',
                      )}
                      style={{ width: 3, height: h }}
                    />
                  )
                })}
              </div>

              {/* Progress */}
              <div className="mb-5">
                <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                  <span>Exchange {Math.min(segIndex + 1, totalSegs)} of {totalSegs || '--'}</span>
                  <span>{fmt(activeItem.duration)}</span>
                </div>
                <div className="relative h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-5">
                <button
                  onClick={skipBack}
                  disabled={isEmpty || activeItem.status !== 'ready'}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 transition-all"
                  title="Back 2 exchanges"
                >
                  <SkipBack className="h-5 w-5" />
                </button>
                <Button
                  onClick={togglePlay}
                  disabled={isEmpty || activeItem.status !== 'ready'}
                  className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg hover:from-emerald-600 hover:to-green-600 disabled:opacity-40"
                  size="icon"
                >
                  {playing
                    ? <Pause className="h-6 w-6" />
                    : <Play className="h-6 w-6 ml-0.5" />
                  }
                </Button>
                <button
                  onClick={skipForward}
                  disabled={isEmpty || activeItem.status !== 'ready'}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 transition-all"
                  title="Forward 2 exchanges"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
              </div>

              {/* Volume */}
              <div className="mt-5 flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="range" min={0} max={100} value={volume}
                  onChange={e => { setVolume(Number(e.target.value)) }}
                  className="flex-1 accent-emerald-600 cursor-pointer"
                />
                <span className="w-8 text-right text-xs text-slate-400">{volume}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Transcript */}
          <AnimatePresence>
            {showTranscript && dialogue.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-500" />
                      Episode Transcript
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div ref={transcriptRef} className="max-h-72 overflow-y-auto space-y-3 pr-1">
                      {dialogue.map((line, i) => (
                        <div
                          key={i}
                          data-seg={i}
                          className={cn(
                            'flex gap-2.5 rounded-xl p-3 transition-colors',
                            i === segIndex && playing ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50',
                          )}
                        >
                          <HostBadge host={line.speaker} active={i === segIndex && playing} />
                          <p className="text-xs leading-relaxed text-slate-700 flex-1">{line.text}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">

          {/* Episode queue */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Music className="h-4 w-4 text-emerald-500" />
                Episodes
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {audioItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                    activeItem.id === item.id
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-100 bg-white hover:bg-slate-50',
                    item.status !== 'ready' && 'opacity-50 cursor-default',
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                    item.status === 'ready' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400',
                  )}>
                    {item.status === 'generating' ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : 'EP'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700">{item.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {item.status === 'ready'
                        ? `${fmt(item.duration)} · ${item.dialogue?.length ?? 0} exchanges`
                        : item.status === 'generating' ? 'Generating...' : 'Failed'}
                    </p>
                  </div>
                  {activeItem.id === item.id && playing && (
                    <div className="flex gap-0.5 items-end">
                      {[8, 12, 8].map((h, i) => (
                        <div key={i} className="w-0.5 rounded-full bg-emerald-500 animate-bounce" style={{ height: h, animationDelay: `${i * 120}ms` }} />
                      ))}
                    </div>
                  )}
                </button>
              ))}
              {audioItems.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">No episodes yet. Generate one below.</p>
              )}
            </CardContent>
          </Card>

          {/* Generate card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Generate Episode
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* Tabs */}
              <div className="mb-3 flex rounded-xl bg-slate-100 p-0.5">
                {([
                  { id: 'note', icon: FileText, label: 'Note' },
                  { id: 'pdf', icon: Upload, label: 'PDF' },
                  { id: 'paste', icon: ClipboardPaste, label: 'Paste' },
                ] as const).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-all',
                      tab === t.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    <t.icon className="h-3 w-3" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="mb-3">
                {tab === 'note' && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {notes.length === 0 && (
                      <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-400">
                        Create a note first, then come back here.
                      </p>
                    )}
                    {notes.slice(0, 12).map(note => (
                      <button
                        key={note.id}
                        onClick={() => setSelectedNote(note.id === selectedNote ? null : note.id)}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-all',
                          selectedNote === note.id
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-slate-100 hover:bg-slate-50 text-slate-700',
                        )}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="flex-1 truncate">{note.title}</span>
                        {selectedNote === note.id && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}

                {tab === 'pdf' && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      className="hidden"
                      onChange={e => {
                        selectDocument(e.target.files?.[0] ?? null)
                        e.currentTarget.value = ''
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'w-full rounded-xl border-2 border-dashed p-5 text-center transition-all',
                        pdfFile
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50',
                      )}
                    >
                      {pdfFile ? (
                        <>
                          <Check className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
                          <p className="text-xs font-medium text-emerald-700 truncate">{pdfFile.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatFileSize(pdfFile.size)} · Click to change</p>
                        </>
                      ) : (
                        <>
                          <Upload className="mx-auto mb-1 h-5 w-5 text-slate-400" />
                          <p className="text-xs font-medium text-slate-600">Upload PDF, DOCX, or TXT</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Up to 10 MB</p>
                        </>
                      )}
                    </button>

                    {isLargeDocument && (
                      <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                          <Radio className="h-3.5 w-3.5" />
                          Large document detected
                        </div>
                        <p className="mt-1 text-[10px] leading-relaxed text-emerald-700">
                          Create a series to cover more sections. Each episode is saved separately; the raw file stays on this device.
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-1.5">
                          {SERIES_EPISODE_OPTIONS.map(option => (
                            <button
                              key={option}
                              type="button"
                              aria-pressed={episodeCount === option}
                              onClick={() => setEpisodeCount(option)}
                              className={cn(
                                'rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-colors',
                                episodeCount === option
                                  ? 'border-emerald-500 bg-emerald-600 text-white'
                                  : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400',
                              )}
                            >
                              {option === 1 ? '1 episode' : `Up to ${option} parts`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'paste' && (
                  <div>
                    <textarea
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      placeholder="Paste your notes, textbook excerpts, or any text here..."
                      className="w-full h-28 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 placeholder:text-slate-400 resize-none focus:border-emerald-300 focus:outline-none focus:bg-white transition-all"
                    />
                    <p className="mt-1 text-right text-[10px] text-slate-400">{pasteText.length} chars</p>
                  </div>
                )}
              </div>

              {/* Errors / success */}
              {genError && (
                <div className="mb-2 flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <p className="text-xs text-rose-600">{genError}</p>
                </div>
              )}
              {genSuccess && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <p className="text-xs text-emerald-700 font-medium">{genSuccess}</p>
                </div>
              )}

              {generating ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>
                      {generationTotal > 1 ? `Episode ${generationPart} of ${generationTotal} · ` : ''}
                      {GEN_STEPS[genStep]}
                    </span>
                    <span>{Math.round(genProgress)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300"
                      style={{ width: `${genProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-[10px] text-slate-400">Usually takes 20–35 seconds per episode</p>
                </div>
              ) : (
                <Button
                  className="w-full gap-1.5 text-xs"
                  onClick={generate}
                  disabled={!canGenerate}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isLargeDocument && episodeCount > 1 ? `Generate Up to ${episodeCount} Episodes` : 'Generate Podcast Episode'}
                </Button>
              )}

              {!generating && (
                <p className="mt-2 text-center text-[10px] text-slate-400">
                  AI-powered · Free · ~30 sec to generate
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
