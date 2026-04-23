import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

let client: Groq | null = null
function getClient(): Groq {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return client
}

const MAX_TEXT_LENGTH     = 120_000  // ~120 KB of raw syllabus text
const PARSE_WINDOW        = 8_000    // chars sent to the model
const MAX_FILENAME_LENGTH = 260

function sanitizeText(str: unknown, maxLen: number): string {
  if (typeof str !== 'string') return ''
  return str.replace(/\x00/g, '').replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').slice(0, maxLen)
}

export async function POST(req: NextRequest) {
  // Block oversized bodies (>200 KB)
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 204_800) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { text: rawText, fileName: rawFileName } = body as Record<string, unknown>

    const text     = sanitizeText(rawText, MAX_TEXT_LENGTH)
    const fileName = sanitizeText(rawFileName, MAX_FILENAME_LENGTH)

    if (text.trim().length < 50) {
      return NextResponse.json({ error: 'Syllabus text too short or empty' }, { status: 400 })
    }

    const response = await getClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: 'You are a university syllabus parser. Extract structured data from syllabi and return ONLY valid JSON with no explanation or markdown code blocks.',
        },
        {
          role: 'user',
          content: `Parse this syllabus and return ONLY a JSON object (no markdown, no explanation):

File: ${fileName}

Content:
${text.slice(0, PARSE_WINDOW)}

Required JSON format:
{
  "instructor": "string or null",
  "courseTitle": "string or null",
  "courseCode": "string or null",
  "assignments": 0,
  "quizzes": 0,
  "exams": 0,
  "deadlines": 0,
  "gradingBreakdown": [{ "name": "string", "weight": 0 }],
  "keyDates": [{ "title": "string", "date": "string" }],
  "officeHours": "string or null",
  "textbook": "string or null",
  "summary": "2-3 sentence course summary"
}`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content?.trim() ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ data: parsed })
  } catch (error) {
    console.error('Syllabus parse error:', error)
    return NextResponse.json({ error: 'Failed to parse syllabus' }, { status: 500 })
  }
}
