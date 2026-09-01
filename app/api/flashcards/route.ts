import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

let client: Groq | null = null
function getClient(): Groq {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return client
}

const MAX_SOURCE = 12_000

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { source, title, count } = body as { source?: unknown; title?: unknown; count?: unknown }

  if (typeof source !== 'string' || source.trim().length < 20) {
    return NextResponse.json({ error: 'Source text is too short' }, { status: 400 })
  }

  const text = source.trim().slice(0, MAX_SOURCE)
  const cardCount = typeof count === 'number' && count >= 5 && count <= 30 ? count : 15
  const episodeTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Study Material'

  try {
    const completion = await getClient().chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      temperature: 0.2,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are an expert academic flashcard generator.',
            'Create concise, effective flashcards from study material.',
            'Each card front is a clear question or concept prompt. The back is the precise answer or explanation (1-3 sentences max).',
            'Focus on: key definitions, important dates/numbers, cause-effect relationships, process steps, and exam-likely concepts.',
            'Output ONLY valid JSON in the exact shape: {"cards": [{"front": "...", "back": "...", "hint": "optional short hint"}]}',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Generate exactly ${cardCount} flashcards from this content titled "${episodeTitle}".\n\nContent:\n${text}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

    let parsed: unknown
    try { parsed = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'AI returned invalid data. Please try again.' }, { status: 500 })
    }

    const data = parsed as Record<string, unknown>
    if (!Array.isArray(data.cards)) {
      return NextResponse.json({ error: 'AI returned unexpected format. Try again.' }, { status: 500 })
    }

    const cards = (data.cards as unknown[])
      .flatMap((c) => {
        if (!c || typeof c !== 'object') return []
        const card = c as Record<string, unknown>
        const front = typeof card.front === 'string' ? card.front.trim() : ''
        const back = typeof card.back === 'string' ? card.back.trim() : ''
        if (!front || !back) return []
        return [{ front, back, hint: typeof card.hint === 'string' ? card.hint.trim() : undefined }]
      })
      .slice(0, 30)

    if (cards.length < 3) {
      return NextResponse.json({ error: 'Not enough content to generate flashcards. Try adding more text.' }, { status: 422 })
    }

    return NextResponse.json({ cards, title: episodeTitle })
  } catch (error) {
    console.error('Flashcard generation error:', error)
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('429') || msg.includes('rate_limit')) {
      return NextResponse.json({ error: 'Rate limit hit. Wait 30 seconds and try again.' }, { status: 429 })
    }
    if (msg.includes('401') || msg.includes('Authentication')) {
      return NextResponse.json({ error: 'AI API key is invalid.' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to generate flashcards. Please try again.' }, { status: 500 })
  }
}
