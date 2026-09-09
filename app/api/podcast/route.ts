import { NextRequest, NextResponse } from 'next/server'
import type { PodcastLine } from '@/lib/types'
import { groqChat, GROQ_MODEL } from '@/lib/groq-client'

export const runtime = 'nodejs'

const PODCAST_SYSTEM = `You are writing a script for StudyCast — a fast, fun, genuinely entertaining academic podcast.

HOST_1 is Alex: quick, enthusiastic, reacts with energy. Opens strong, asks punchy questions. Says things like "Wait, hold on —", "Okay that's actually wild", "So basically what you're saying is...".
HOST_2 is Jordan: confident, funny, loves a good analogy. Drops knowledge casually. Says things like "Right, exactly —", "Think of it this way:", "And here's what most people miss —", "No no, it's even cooler than that."

Rules — follow them exactly:
- EVERY single line must be: HOST_1: [dialogue text] OR HOST_2: [dialogue text] — absolutely nothing else
- 14–20 TOTAL dialogue lines, not 14–20 speaker pairs (fast pace = 2–3 min spoken)
- Short snappy lines — no single line longer than 3 sentences
- Alternate speakers frequently, but let 2–3 lines go to one speaker when building momentum
- Both hosts are genuinely excited — this is NOT a lecture, it's a conversation
- Use contractions, informal language, reactions ("Oh that's huge", "Exactly!", "Okay wait —")
- Cover key concepts, surprising details, real-world relevance, and one memorable analogy
- Alex opens with energy, Jordan closes with a punchy takeaway line
- ZERO markdown, ZERO asterisks, ZERO headers, ZERO stage directions like [laughs] — pure dialogue only`

const MAX_DIALOGUE_LINES = 20

function parseDialogue(raw: string): PodcastLine[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const result: PodcastLine[] = []
  for (const line of lines) {
    const match = line.match(
      /^(?:[-*]\s*)?(?:\*\*)?(HOST[_\s-]?1|HOST[_\s-]?2|ALEX|JORDAN)\s*:\s*(?:\*\*)?\s*(.+)$/i,
    )
    if (!match) continue

    const label = match[1].toUpperCase().replace(/[\s-]/g, '_')
    const speaker = label === 'HOST_1' || label === 'ALEX' ? 'HOST_1' : 'HOST_2'
    const text = match[2].replace(/^\*+|\*+$/g, '').trim().slice(0, 600)
    if (text) result.push({ speaker, text })
  }

  if (result.length <= MAX_DIALOGUE_LINES) return result
  const closing = result.slice(MAX_DIALOGUE_LINES - 1).reverse().find(line => line.speaker === 'HOST_2')
  return [...result.slice(0, MAX_DIALOGUE_LINES - 1), closing ?? result[MAX_DIALOGUE_LINES - 1]]
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { source, title } = body as { source?: unknown; title?: unknown }

  if (typeof source !== 'string' || source.trim().length < 20) {
    return NextResponse.json({ error: 'Source text is too short to generate a podcast' }, { status: 400 })
  }

  const MAX_SOURCE = 12_000
  const truncated = source.trim().slice(0, MAX_SOURCE)
  const episodeTitle = typeof title === 'string' && title.trim()
    ? title.trim().replace(/[\r\n]+/g, ' ').slice(0, 160)
    : 'Study Episode'

  try {
    const completion = await groqChat({
      model: GROQ_MODEL,
      max_tokens: 1400,
      temperature: 0.75,
      messages: [
        { role: 'system', content: PODCAST_SYSTEM },
        {
          role: 'user',
          content: `Create a podcast episode titled "${episodeTitle}" based on this content:\n\n${truncated}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    const dialogue = parseDialogue(raw)

    if (dialogue.length < 4) {
      return NextResponse.json({ error: 'AI did not return a valid dialogue. Try with more text.' }, { status: 500 })
    }

    const script = dialogue.map(l => `${l.speaker === 'HOST_1' ? 'Alex' : 'Jordan'}: ${l.text}`).join('\n')
    const estimatedDuration = Math.floor(dialogue.reduce((acc, l) => acc + l.text.split(' ').length, 0) / 2.5)

    return NextResponse.json({ dialogue, script, duration: estimatedDuration })
  } catch (error) {
    console.error('Podcast generation error:', error)
    const err = error as Error & { code?: string; retryAfter?: number }
    if (err.code === 'RATE_LIMITED') {
      return NextResponse.json({ error: err.message, retryAfter: err.retryAfter }, { status: 429 })
    }
    const msg = err.message ?? String(error)
    if (msg.includes('401') || msg.includes('Authentication')) {
      return NextResponse.json({ error: 'Groq API key is invalid or not configured.' }, { status: 500 })
    }
    return NextResponse.json({ error: `Generation failed: ${msg}` }, { status: 500 })
  }
}
