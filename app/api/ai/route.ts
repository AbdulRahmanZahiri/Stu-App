import Groq, { APIError } from 'groq-sdk'
import type { ChatCompletionCreateParamsStreaming } from 'groq-sdk/resources/chat/completions'
import { NextRequest, NextResponse } from 'next/server'
import { optionalApiUser } from '@/lib/api-auth'
import { GROQ_MODEL } from '@/lib/groq-client'

export const maxDuration = 60

const MAX_RETRY_WAIT_MS = 35_000
const MAX_ATTEMPTS = 4

let _client: Groq | null = null
function getClient(): Groq {
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0, timeout: 120_000 })
  return _client
}

async function createStreamWithRetry(params: ChatCompletionCreateParamsStreaming) {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await getClient().chat.completions.create(params)
    } catch (err) {
      lastError = err
      if (!(err instanceof APIError) || err.status !== 429) throw err
      const header = (err as unknown as { headers?: Record<string, string> }).headers?.['retry-after']
      const waitMs = header ? parseFloat(header) * 1000 : Math.min(3_000 * 3 ** attempt, MAX_RETRY_WAIT_MS)
      if (waitMs > MAX_RETRY_WAIT_MS || attempt === MAX_ATTEMPTS - 1) {
        const retryAfter = Math.ceil(waitMs / 1000)
        throw Object.assign(new Error(`Rate limit — try again in ${retryAfter}s`), { code: 'RATE_LIMITED', retryAfter })
      }
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }
  throw lastError
}

const SYSTEM_PROMPT = `You are an AI academic assistant for ScholarFlow, a student portal for university students.
You help students with their coursework, study plans, summaries, flashcards, and academic questions.
Be concise, helpful, and encouraging. Use markdown formatting with **bold** for key terms, bullet points for lists, and numbered lists for steps. Keep responses focused and academic.`

const MAX_MESSAGES    = 50    // max conversation turns
const MAX_MSG_LENGTH  = 4000  // max chars per message
const ALLOWED_ROLES   = new Set(['user', 'assistant'])

function sanitizeText(str: unknown, maxLength = MAX_MSG_LENGTH): string {
  if (typeof str !== 'string') return ''
  // Remove null bytes and control chars (except newline/tab)
  return str.replace(/\x00/g, '').replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').slice(0, maxLength)
}

export async function POST(req: NextRequest) {
  // Block oversized bodies (>64 KB)
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 65_536) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const access = await optionalApiUser()

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || !Array.isArray((body as { messages?: unknown }).messages)) {
      return NextResponse.json({ error: 'messages must be an array' }, { status: 400 })
    }

    const rawMessages = (body as { messages: unknown[] }).messages

    if (rawMessages.length === 0) {
      return NextResponse.json({ error: 'messages array is empty' }, { status: 400 })
    }

    if (rawMessages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: `Too many messages (max ${MAX_MESSAGES})` }, { status: 400 })
    }

    // Validate and sanitize each message
    const messages = rawMessages.map((m: unknown) => {
      if (!m || typeof m !== 'object') throw new Error('Invalid message format')
      const msg = m as Record<string, unknown>
      const role = typeof msg.role === 'string' ? msg.role : ''
      if (!ALLOWED_ROLES.has(role)) throw new Error(`Invalid role: ${role}`)
      const content = sanitizeText(msg.content)
      if (!content.trim()) throw new Error('Empty message content')
      return { role: role as 'user' | 'assistant', content }
    })

    let courseContext = '\nThe student has not added any active courses yet.'
    if (access.client && access.user) {
      const { data: courses } = await access.client
        .from('courses')
        .select('code, name')
        .eq('student_id', access.user.id)
        .eq('status', 'active')
        .limit(20)
      if ((courses ?? []).length > 0) {
        courseContext = `\nThe student's active courses are:\n${(courses ?? []).map((course) => `- ${sanitizeText(course.code, 80)}: ${sanitizeText(course.name, 160)}`).join('\n')}`
      }
    }

    const stream = await createStreamWithRetry({
      model: GROQ_MODEL,
      max_tokens: 1024,
      stream: true,
      messages: [{ role: 'system', content: `${SYSTEM_PROMPT}${courseContext}` }, ...messages],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(encoder.encode(text))
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.startsWith('Invalid') || message.startsWith('Empty') || message.startsWith('Too many')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('AI route error:', error)
    const err = error as Error & { code?: string; retryAfter?: number }
    if (err.code === 'RATE_LIMITED') {
      return NextResponse.json({ error: err.message, retryAfter: err.retryAfter }, { status: 429 })
    }
    const msg = message.includes('401') || message.includes('Authentication')
      ? 'AI API key is invalid or missing.'
      : 'Failed to get AI response'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
