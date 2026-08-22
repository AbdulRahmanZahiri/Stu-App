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
    .slice(0, 15)
    .map(t => `- ${t.title} (due: ${new Date(t.dueDate!).toLocaleDateString()}, ~${t.estimatedHours ?? 2}h, ${t.type ?? 'assignment'}, ${t.priority ?? 'medium'} priority${t.courseCode ? `, ${t.courseCode}` : ''})`)
    .join('\n')

  const eventSummary = (calendarEvents ?? [])
    .filter(e => new Date(e.startDate) > today)
    .slice(0, 20)
    .map(e => `- ${e.title}: ${new Date(e.startDate).toLocaleDateString()} ${new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    .join('\n')

  const prompt = `You are a smart academic study scheduler. Today is ${today.toLocaleDateString()}.

Upcoming assignments:
${taskSummary}

Scheduled events/classes:
${eventSummary || '(none provided)'}

Create a realistic 7-day study plan. Return ONLY a JSON array of study session objects. Each object must have:
- "day": string like "Monday, Jan 20"
- "date": ISO date string (YYYY-MM-DD)
- "sessions": array of { "time": "e.g. 2:00 PM – 4:00 PM", "task": "task title", "goal": "specific goal for this session", "hours": number }
- "note": optional coaching tip for that day

Keep it realistic — max 4 study hours per day, avoid evenings after 9 PM, leave weekends lighter. Prioritize by due date and type (exams first).`

  try {
    const res = await getClient().chat.completions.create({
      model: 'groq/compound',
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a study schedule generator. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    })

    const raw = res.choices[0]?.message?.content ?? '{}'
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 }) }

    const days = Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>).days ?? (parsed as Record<string, unknown>).schedule ?? []

    return NextResponse.json({ days })
  } catch (err) {
    console.error('Schedule API error:', err)
    return NextResponse.json({ error: 'Failed to generate schedule' }, { status: 500 })
  }
}
