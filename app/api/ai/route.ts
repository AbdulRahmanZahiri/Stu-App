import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { optionalApiUser } from '@/lib/api-auth'

let client: Groq | null = null
function getClient(): Groq {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return client
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

    const response = await getClient().chat.completions.create({
      model: 'groq/compound',
      max_tokens: 1024,
      messages: [{ role: 'system', content: `${SYSTEM_PROMPT}${courseContext}` }, ...messages],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    // Don't leak internal error details
    if (message.startsWith('Invalid') || message.startsWith('Empty') || message.startsWith('Too many')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('AI route error:', error)
    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
  }
}
