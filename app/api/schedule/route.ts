import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

let client: Groq | null = null
function getClient() {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return client
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { tasks, calendarEvents } = body as {
    tasks?: Array<{ title: string; dueDate?: string; estimatedHours?: number; type?: string; priority?: string; courseCode?: string }>
    calendarEvents?: Array<{ title: string; startDate: string; endDate?: string; type?: string }>
  }

  if (!tasks?.length) return NextResponse.json({ suggestions: [] })

  const today = new Date()
  const taskSummary = tasks
    .filter(t => t.dueDate && new Date(t.dueDate) > today)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 6)
    .map(t => `${t.title}|${new Date(t.dueDate!).toLocaleDateString()}|${t.estimatedHours ?? 2}h|${t.type ?? 'task'}|${t.priority ?? 'medium'}`)
    .join('\n')

  const eventSummary = (calendarEvents ?? [])
    .filter(e => new Date(e.startDate) > today)
    .slice(0, 8)
    .map(e => `${e.title}|${new Date(e.startDate).toLocaleDateString()}`)
    .join('\n')

  const prompt = `Today: ${today.toLocaleDateString()}. Tasks (title|due|hours|type|priority):\n${taskSummary}\nEvents:\n${eventSummary || 'none'}\n\nReturn JSON with a "days" key containing an array of 7 days. Each day: {"day":"Mon Aug 25","date":"2026-08-25","sessions":[{"time":"2-4 PM","task":"...","goal":"...","hours":2}],"note":"tip"}. Max 4h/day. Prioritize exams.`

  try {
    const res = await getClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1200,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return ONLY a valid JSON object with a "days" array. No markdown, no explanation.' },
        { role: 'user', content: prompt },
      ],
    })

    const raw = res.choices[0]?.message?.content ?? ''
    // Strip markdown code fences if the model wraps JSON in them
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned || '{}')
    } catch {
      return NextResponse.json({ error: 'AI returned invalid data. Please try again.' }, { status: 500 })
    }

    const days = Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>).days ?? (parsed as Record<string, unknown>).schedule ?? []

    return NextResponse.json({ days })
  } catch (err) {
    console.error('Schedule API error:', err)
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('401') || msg.includes('Authentication')) {
      return NextResponse.json({ error: 'Groq API key is invalid or not set in Vercel.' }, { status: 500 })
    }
    if (msg.includes('429') || msg.includes('rate_limit')) {
      return NextResponse.json({ error: 'Rate limit hit. Wait 30 seconds and try again.' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to generate schedule. Please try again.' }, { status: 500 })
  }
}
