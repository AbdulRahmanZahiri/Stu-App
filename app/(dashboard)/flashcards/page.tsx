'use client'

import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BrainCircuit, ChevronLeft, ChevronRight, RotateCcw,
  Shuffle, Upload, FileText, ClipboardList, Check, X,
  Loader2, AlertCircle, Trophy, Lightbulb, Eye, BookOpen,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/app-store'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Flashcard {
  front: string
  back: string
  hint?: string
}

type Mode = 'generate' | 'study' | 'quiz'
type QuizResult = 'correct' | 'incorrect' | null
type CardResult = { card: Flashcard; result: 'correct' | 'incorrect' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Flip Card ─────────────────────────────────────────────────────────────────

function FlipCard({ card, isFlipped, onClick }: { card: Flashcard; isFlipped: boolean; onClick: () => void }) {
  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ perspective: 1200, height: 260 }}
      onClick={onClick}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl border border-slate-200 bg-white shadow-lg flex flex-col items-center justify-center p-8 gap-3"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Question</span>
          <p className="text-lg font-semibold text-slate-800 text-center leading-relaxed">{card.front}</p>
          {card.hint && (
            <div className="flex items-center gap-1 mt-3 text-xs text-amber-600 bg-amber-50 rounded-full px-3 py-1">
              <Lightbulb className="h-3 w-3" />
              {card.hint}
            </div>
          )}
          <span className="absolute bottom-4 text-[10px] text-slate-300 font-medium">Click to reveal answer</span>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg flex flex-col items-center justify-center p-8 gap-3"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Answer</span>
          <p className="text-base font-medium text-slate-800 text-center leading-relaxed">{card.back}</p>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FlashcardsPage() {
  const { notes } = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)

  // Generate state
  const [tab, setTab] = useState<'note' | 'pdf' | 'paste'>('note')
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [cardCount, setCardCount] = useState('15')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Study/Quiz state
  const [cards, setCards] = useState<Flashcard[]>([])
  const [mode, setMode] = useState<Mode>('generate')
  const [cardIndex, setCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [results, setResults] = useState<CardResult[]>([])
  const [quizResult, setQuizResult] = useState<QuizResult>(null)
  const [showQuizAnswer, setShowQuizAnswer] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)

  const currentCard = cards[cardIndex]

  // ── PDF text extraction (client-side via PDF.js) ──────────────────────────

  async function extractPdfText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const parts: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      parts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
    }
    const text = parts.join('\n').trim()
    if (text.length < 50) throw new Error('This PDF has no selectable text (may be scanned). Use Paste Text instead.')
    return text
  }

  // ── Generate ───────────────────────────────────────────────────────────────

  async function generate() {
    setGenerating(true)
    setGenError(null)

    try {
      let source = ''
      let title = 'Study Material'

      if (tab === 'note') {
        const note = notes.find(n => n.id === selectedNote)
        if (!note) throw new Error('Select a note first')
        source = note.content || note.excerpt || ''
        title = note.title
      } else if (tab === 'pdf') {
        if (!pdfFile) throw new Error('Upload a PDF first')
        // Extract text in the browser using PDF.js — avoids serverless native-module issues
        source = await extractPdfText(pdfFile)
        title = pdfFile.name.replace(/\.[^.]+$/, '')
      } else {
        source = pasteText.trim()
        title = source.split('\n')[0].slice(0, 60) || 'Pasted Content'
      }

      if (!source || source.length < 30) throw new Error('Not enough text to generate flashcards')

      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: source.slice(0, 40_000), title, count: parseInt(cardCount) }),
      })

      let data: { error?: string; cards?: Flashcard[]; title?: string }
      try {
        data = await res.json()
      } catch {
        throw new Error(`Server error (${res.status}) — please try again`)
      }
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      setCards(data.cards ?? [])
      setCardIndex(0)
      setIsFlipped(false)
      setResults([])
      setQuizResult(null)
      setShowQuizAnswer(false)
      setSessionDone(false)
      setMode('study')
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  // ── Study navigation ───────────────────────────────────────────────────────

  function next() {
    if (cardIndex < cards.length - 1) {
      setCardIndex(i => i + 1)
      setIsFlipped(false)
    } else {
      setSessionDone(true)
    }
  }

  function prev() {
    if (cardIndex > 0) {
      setCardIndex(i => i - 1)
      setIsFlipped(false)
    }
  }

  // ── Quiz mode ──────────────────────────────────────────────────────────────

  function markQuiz(result: 'correct' | 'incorrect') {
    setQuizResult(result)
    setResults(r => [...r, { card: currentCard, result }])
    setTimeout(() => {
      setQuizResult(null)
      setShowQuizAnswer(false)
      if (cardIndex < cards.length - 1) {
        setCardIndex(i => i + 1)
      } else {
        setSessionDone(true)
      }
    }, 800)
  }

  const restartStudy = useCallback(() => {
    setCardIndex(0)
    setIsFlipped(false)
    setResults([])
    setQuizResult(null)
    setShowQuizAnswer(false)
    setSessionDone(false)
  }, [])

  const shuffleCards = useCallback(() => {
    setCards(prev => shuffle(prev))
    restartStudy()
  }, [restartStudy])

  const correctCount = results.filter(r => r.result === 'correct').length
  const incorrectCount = results.filter(r => r.result === 'incorrect').length
  const score = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0

  // ── Session Done ───────────────────────────────────────────────────────────

  if (mode !== 'generate' && sessionDone) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Trophy className="h-9 w-9 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Session Complete!</h2>
            <p className="text-slate-500 mt-1">{cards.length} cards reviewed</p>
          </div>
          {mode === 'quiz' && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Score', value: `${score}%`, color: score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-rose-600' },
                { label: 'Correct', value: correctCount, color: 'text-emerald-600' },
                { label: 'Needs Work', value: incorrectCount, color: 'text-rose-600' },
              ].map(s => (
                <Card key={s.label} className="border-0 bg-slate-50">
                  <CardContent className="p-4 text-center">
                    <p className={cn('text-2xl font-extrabold', s.color)}>{s.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {mode === 'quiz' && incorrectCount > 0 && (
            <Card className="border border-rose-100 bg-rose-50/50">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-rose-600 mb-2">Cards to review again:</p>
                <div className="space-y-2">
                  {results.filter(r => r.result === 'incorrect').map((r, i) => (
                    <p key={i} className="text-sm text-slate-700">• {r.card.front}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={restartStudy} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Restart
            </Button>
            <Button variant="outline" onClick={shuffleCards} className="gap-1.5">
              <Shuffle className="h-3.5 w-3.5" /> Shuffle & Retry
            </Button>
            <Button onClick={() => { setMode('generate'); setCards([]) }} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <BrainCircuit className="h-3.5 w-3.5" /> New Set
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Generate Screen ────────────────────────────────────────────────────────

  if (mode === 'generate') {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-indigo-500" />
            Flashcards & Quizzes
          </h1>
          <p className="mt-1 text-sm text-slate-500">Generate AI-powered flashcards from your notes, PDFs, or any text</p>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardContent className="p-5 space-y-5">
              <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="note" className="gap-1.5 text-xs"><BookOpen className="h-3.5 w-3.5" />My Notes</TabsTrigger>
                  <TabsTrigger value="pdf" className="gap-1.5 text-xs"><Upload className="h-3.5 w-3.5" />PDF / File</TabsTrigger>
                  <TabsTrigger value="paste" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Paste Text</TabsTrigger>
                </TabsList>

                <TabsContent value="note" className="mt-4">
                  {notes.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No notes yet. Add notes first or use PDF / Paste Text.</p>
                  ) : (
                    <Select value={selectedNote ?? ''} onValueChange={setSelectedNote}>
                      <SelectTrigger><SelectValue placeholder="Choose a note…" /></SelectTrigger>
                      <SelectContent>
                        {notes.map(n => (
                          <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TabsContent>

                <TabsContent value="pdf" className="mt-4">
                  <input ref={fileRef} type="file" accept=".pdf,.txt,.docx,.md" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50 transition-colors p-8 text-center"
                  >
                    {pdfFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm font-medium text-indigo-600">{pdfFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Click to upload PDF, DOCX, or TXT</p>
                      </>
                    )}
                  </button>
                </TabsContent>

                <TabsContent value="paste" className="mt-4">
                  <Textarea
                    placeholder="Paste your lecture notes, textbook excerpt, or any study material here…"
                    className="min-h-[140px] resize-none text-sm"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                  />
                  <p className="text-xs text-slate-400 mt-1 text-right">{pasteText.length.toLocaleString()} chars</p>
                </TabsContent>
              </Tabs>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700 shrink-0">Cards to generate</label>
                <Select value={cardCount} onValueChange={setCardCount}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['5', '10', '15', '20', '25', '30'].map(n => (
                      <SelectItem key={n} value={n}>{n} cards</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {genError && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {genError}
                </div>
              )}

              <Button
                className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={generate}
                disabled={generating}
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                {generating ? 'Generating flashcards…' : 'Generate Flashcards'}
              </Button>
            </CardContent>
          </Card>

          {/* Feature callouts */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '🃏', label: 'Flip Cards', desc: 'Interactive 3D flip cards' },
              { icon: '🧠', label: 'Quiz Mode', desc: 'Test recall with scoring' },
              { icon: '📊', label: 'Track Progress', desc: 'See what needs work' },
            ].map(f => (
              <Card key={f.label} className="border-0 bg-slate-50">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <p className="text-xs font-semibold text-slate-700">{f.label}</p>
                  <p className="text-[10px] text-slate-400">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Study / Quiz Screen ────────────────────────────────────────────────────

  const progress = ((cardIndex + 1) / cards.length) * 100

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setMode('generate'); setCards([]) }} className="gap-1.5 text-slate-500">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{cards.length} cards</Badge>
            {mode === 'quiz' && results.length > 0 && (
              <>
                <Badge className="bg-emerald-100 text-emerald-700 border-0">{correctCount} ✓</Badge>
                <Badge className="bg-rose-100 text-rose-700 border-0">{incorrectCount} ✗</Badge>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={shuffleCards} title="Shuffle">
            <Shuffle className="h-4 w-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={restartStudy} title="Restart">
            <RotateCcw className="h-4 w-4 text-slate-400" />
          </Button>
          <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); restartStudy() }}>
            <TabsList className="h-8">
              <TabsTrigger value="study" className="text-xs px-2 gap-1"><Eye className="h-3 w-3" />Study</TabsTrigger>
              <TabsTrigger value="quiz" className="text-xs px-2 gap-1"><ClipboardList className="h-3 w-3" />Quiz</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-5">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1 h-1.5" />
          <span className="text-xs font-semibold text-slate-400 shrink-0">{cardIndex + 1} / {cards.length}</span>
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={cardIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.18 }}
          >
            {mode === 'study' ? (
              <FlipCard card={currentCard} isFlipped={isFlipped} onClick={() => setIsFlipped(f => !f)} />
            ) : (
              /* Quiz mode */
              <div className={cn(
                'rounded-2xl border p-8 space-y-5 transition-colors',
                quizResult === 'correct' ? 'border-emerald-300 bg-emerald-50' :
                quizResult === 'incorrect' ? 'border-rose-300 bg-rose-50' :
                'border-slate-200 bg-white',
              )}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Question {cardIndex + 1}</span>
                <p className="text-lg font-semibold text-slate-800 leading-relaxed">{currentCard.front}</p>

                {currentCard.hint && !showQuizAnswer && (
                  <button onClick={() => setShowQuizAnswer(true)} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700">
                    <Lightbulb className="h-3.5 w-3.5" /> Show hint
                  </button>
                )}
                {(showQuizAnswer || quizResult) && (
                  <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Answer</p>
                    <p className="text-sm text-slate-700">{currentCard.back}</p>
                  </div>
                )}

                {quizResult ? (
                  <div className={cn('flex items-center justify-center gap-2 text-sm font-semibold py-2', quizResult === 'correct' ? 'text-emerald-600' : 'text-rose-600')}>
                    {quizResult === 'correct' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    {quizResult === 'correct' ? 'Correct!' : 'Moving on…'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {!showQuizAnswer && (
                      <Button variant="outline" className="w-full gap-1.5" onClick={() => setShowQuizAnswer(true)}>
                        <Eye className="h-3.5 w-3.5" /> Reveal Answer
                      </Button>
                    )}
                    {showQuizAnswer && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markQuiz('correct')}>
                          <Check className="h-4 w-4" /> Got it
                        </Button>
                        <Button variant="outline" className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => markQuiz('incorrect')}>
                          <X className="h-4 w-4" /> Needs work
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation (study mode only) */}
        {mode === 'study' && (
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={prev} disabled={cardIndex === 0} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <div className="flex gap-1.5">
              {cards.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCardIndex(i); setIsFlipped(false) }}
                  className={cn('h-1.5 rounded-full transition-all', i === cardIndex ? 'w-5 bg-indigo-500' : 'w-1.5 bg-slate-200')}
                />
              ))}
            </div>
            <Button
              onClick={next}
              className={cn('gap-1.5', cardIndex === cards.length - 1 ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : '')}
              variant={cardIndex === cards.length - 1 ? 'default' : 'outline'}
            >
              {cardIndex === cards.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
