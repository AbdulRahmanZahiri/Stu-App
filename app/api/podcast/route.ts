import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { PodcastLine } from '@/lib/types'

export const runtime = 'nodejs'

let client: Groq | null = null
function getClient(): Groq {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return client
}

const PODCAST_SYSTEM = `You are writing a script for StudyCast — a fast, fun, genuinely entertaining academic podcast.

HOST_1 is Alex: quick, enthusiastic, reacts with energy. Opens strong, asks punchy questions. Says things like "Wait, hold on —", "Okay that's actually wild", "So basically what you're saying is...".
HOST_2 is Jordan: confident, funny, loves a good analogy. Drops knowledge casually. Says things like "Right, exactly —", "Think of it this way:", "And here's what most people miss —", "No no, it's even cooler than that."

Rules — follow them exactly:
- EVERY single line must be: HOST_1: [dialogue text] OR HOST_2: [dialogue text] — absolutely nothing else
- 22–30 exchanges (fast pace = 3–4 min spoken)
- Short snappy lines — no single line longer than 3 sentences
- Alternate speakers frequently, but let 2–3 lines go to one speaker when building momentum
- Both hosts are genuinely excited — this is NOT a lecture, it's a conversation
- Use contractions, informal language, reactions ("Oh that's huge", "Exactly!", "Okay wait —")
- Cover key concepts, surprising details, real-world relevance, and one memorable analogy
- Alex opens with energy, Jordan closes with a punchy takeaway line
- ZERO markdown, ZERO asterisks, ZERO headers, ZERO stage directions like [laughs] — pure dialogue only`

function parseDialogue(raw: string): PodcastLine[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const result: PodcastLine[] = []
  for (const line of lines) {
    if (line.startsWith('HOST_1:')) {
      result.push({ speaker: 'HOST_1', text: line.slice(7).trim() })
    } else if (line.startsWith('HOST_2:')) {
      result.push({ speaker: 'HOST_2', text: line.slice(7).trim() })
    }
    // ignore any lines that don't match the format
  }
  return result
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
  const episodeTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Study Episode'

  try {
    const completion = await getClient().chat.completions.create({
      model: 'groq/compound',
      max_tokens: 3000,
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
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('Authentication')) {
      return NextResponse.json({ error: 'Groq API key is invalid or not configured in Vercel.' }, { status: 500 })
    }
    if (msg.includes('429') || msg.includes('rate_limit')) {
      return NextResponse.json({ error: 'Groq rate limit hit. Wait 30 seconds and try again.' }, { status: 500 })
    }
    if (msg.includes('model') || msg.includes('404')) {
      return NextResponse.json({ error: 'AI model unavailable. Try again in a moment.' }, { status: 500 })
    }
    return NextResponse.json({ error: `Generation failed: ${msg}` }, { status: 500 })
  }
}
