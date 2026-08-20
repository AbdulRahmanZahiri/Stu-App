'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles, Send, BookOpen, FileText, BrainCircuit,
  ListChecks, Zap, Copy, ThumbsUp, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getInitials, cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import type { AIMessage } from '@/lib/types'

const quickPrompts = [
  { icon: FileText, label: 'Summarize COMP 2007 notes', color: 'text-emerald-600' },
  { icon: BrainCircuit, label: 'Create a study plan for finals', color: 'text-green-600' },
  { icon: ListChecks, label: 'Generate quiz questions for Data Structures', color: 'text-blue-600' },
  { icon: BookOpen, label: 'Explain eigenvalues simply', color: 'text-sky-600' },
  { icon: Zap, label: 'Create MATH 2050 flashcards', color: 'text-amber-600' },
  { icon: Sparkles, label: 'Review my essay structure for ENGL 1110', color: 'text-emerald-600' },
]

const WELCOME: AIMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Hi! I'm your AI academic assistant powered by Llama 3. I'm here to help you with COMP 2007, COMP 2003, MATH 2050, and ENGL 1110.\n\nI can summarize topics, generate practice questions, create flashcards, build study plans, and explain concepts simply.\n\nWhat would you like help with today?`,
  timestamp: new Date(),
}

function MessageContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []

  function flushList() {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={`ul-${elements.length}`} className="my-1 space-y-0.5 pl-4">
        {listBuffer.map((item, i) => (
          <li key={i} className="list-disc text-slate-700">{renderBold(item)}</li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('- ') || line.startsWith('* ')) {
      listBuffer.push(line.slice(2))
      continue
    }

    flushList()

    if (line === '') {
      elements.push(<br key={`br-${i}`} />)
    } else if (line.startsWith('### ')) {
      elements.push(<p key={i} className="font-bold text-slate-900 mt-1">{line.slice(4)}</p>)
    } else if (line.startsWith('## ') || line.startsWith('# ')) {
      elements.push(<p key={i} className="font-bold text-slate-900 text-base mt-1">{line.replace(/^#+\s/, '')}</p>)
    } else if (line.startsWith('> ')) {
      elements.push(<p key={i} className="border-l-2 border-emerald-300 pl-3 text-slate-500 italic my-0.5">{line.slice(2)}</p>)
    } else if (line === '---') {
      elements.push(<hr key={i} className="border-slate-100 my-2" />)
    } else if (/^\d+\. /.test(line)) {
      elements.push(<p key={i} className="text-slate-700 my-0.5">{renderBold(line)}</p>)
    } else {
      elements.push(<p key={i} className="text-slate-800 my-0.5">{renderBold(line)}</p>)
    }
  }

  flushList()
  return <div className="space-y-0">{elements}</div>
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  if (parts.length === 1) return text
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

export default function AIAssistantPage() {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<AIMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [likedMessages, setLikedMessages] = useState<Set<string>>(() => new Set())
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text?: string) {
    const content = text || input.trim()
    if (!content || loading) return

    const userMsg: AIMessage = {
      id: `msg-${crypto.randomUUID()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${crypto.randomUUID()}-ai`,
          role: 'assistant' as const,
          content: data.content,
          timestamp: new Date(),
        },
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg === 'AI service not configured'
        ? 'Add your GROQ_API_KEY to .env.local to enable AI responses.'
        : msg
      )
    } finally {
      setLoading(false)
    }
  }

  async function copyMessage(content: string, id: string) {
    await navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">AI Academic Assistant</h1>
            <p className="text-xs text-slate-400">Powered by Llama 3.3 via Groq · Free</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-600 font-medium">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4 md:px-8">
        <div className="mx-auto max-w-3xl space-y-6 pb-4">

          {/* Quick prompts — only when first message */}
          {messages.length <= 1 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {quickPrompts.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => sendMessage(p.label)}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 text-left text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <p.icon className={`h-4 w-4 shrink-0 ${p.color}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={cn(
                  'text-[10px]',
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-500 to-green-500 text-white'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                )}>
                  {msg.role === 'user' ? getInitials(profile?.name || 'Student') : 'AI'}
                </AvatarFallback>
              </Avatar>

              <div className={cn('max-w-[75%] flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start')}>
                <div className={cn(
                  'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-600 to-green-600 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-tl-sm'
                )}>
                  {msg.role === 'assistant'
                    ? <MessageContent text={msg.content} />
                    : <span>{msg.content}</span>
                  }
                </div>

                <div className={cn('flex items-center gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  <span className="text-[10px] text-slate-400">
                    {msg.id === 'welcome'
                      ? 'Ready'
                      : msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.role === 'assistant' && msg.id !== 'welcome' && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => copyMessage(msg.content, msg.id)} className="rounded p-0.5 text-slate-300 hover:text-slate-500" title="Copy">
                        <Copy className="h-3 w-3" />
                      </button>
                      {copied === msg.id && <span className="text-[10px] text-emerald-500">Copied!</span>}
                      <button
                        onClick={() => setLikedMessages((current) => {
                          const next = new Set(current)
                          if (next.has(msg.id)) next.delete(msg.id)
                          else next.add(msg.id)
                          return next
                        })}
                        className={cn('rounded p-0.5 hover:text-emerald-500', likedMessages.has(msg.id) ? 'text-emerald-500' : 'text-slate-300')}
                        aria-label={likedMessages.has(msg.id) ? 'Remove positive feedback' : 'Mark response helpful'}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[10px]">AI</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white border border-slate-100 px-4 py-3 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input box */}
      <div className="shrink-0 border-t border-slate-100 bg-white p-4 md:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 focus-within:border-emerald-300 focus-within:bg-white transition-all">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Ask about your courses, request summaries, study plans, or anything academic..."
              className="min-h-[44px] max-h-32 flex-1 resize-none border-0 bg-transparent p-0 text-sm placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              size="icon"
              className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-300">
            Powered by Llama 3.3 via Groq · Free to use · Verify important info with your instructor
          </p>
        </div>
      </div>
    </div>
  )
}
