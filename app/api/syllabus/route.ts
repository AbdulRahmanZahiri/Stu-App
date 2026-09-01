import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { parseSyllabusLocally, type ParsedSyllabusData } from '@/lib/basic-syllabus-parser'

let client: Groq | null = null
function getClient(): Groq {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return client
}

const MAX_TEXT_LENGTH = 15_000
const MAX_FILENAME_LENGTH = 260

type JsonObject = Record<string, unknown>

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\x00/g, '')
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .slice(0, maxLength)
}

function cleanString(value: unknown, maxLength = 500): string | null {
  if (typeof value !== 'string') return null
  const cleaned = sanitizeText(value, maxLength).trim()
  return cleaned || null
}

function cleanCount(value: unknown): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(500, Math.round(number)))
}

function normalizeResult(value: unknown): ParsedSyllabusData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The AI returned an invalid result')
  }
  const source = value as JsonObject

  const gradingBreakdown = Array.isArray(source.gradingBreakdown)
    ? source.gradingBreakdown
        .flatMap((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return []
          const row = item as JsonObject
          const name = cleanString(row.name, 120)
          const weight = Number(row.weight)
          if (!name || !Number.isFinite(weight) || weight < 0 || weight > 100) return []
          return [{ name, weight: Number(weight.toFixed(2)) }]
        })
        .slice(0, 50)
    : []

  const keyDates = Array.isArray(source.keyDates)
    ? source.keyDates
        .flatMap((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return []
          const row = item as JsonObject
          const title = cleanString(row.title, 200)
          const date = cleanString(row.date, 50)
          if (!title || !date) return []
          const parsedDate = new Date(date)
          if (Number.isNaN(parsedDate.getTime())) return []
          return [{ title, date: parsedDate.toISOString() }]
        })
        .slice(0, 250)
    : []

  return {
    instructor: cleanString(source.instructor, 200),
    courseTitle: cleanString(source.courseTitle, 300),
    courseCode: cleanString(source.courseCode, 80),
    assignments: cleanCount(source.assignments),
    quizzes: cleanCount(source.quizzes),
    exams: cleanCount(source.exams),
    deadlines: keyDates.length || cleanCount(source.deadlines),
    gradingBreakdown,
    keyDates,
    officeHours: cleanString(source.officeHours, 500),
    textbook: cleanString(source.textbook, 500),
    summary: cleanString(source.summary, 1500),
  }
}

function basicResponse(data: ParsedSyllabusData, warning: string) {
  return NextResponse.json({ data, parser: 'basic', warning })
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => (
    name.startsWith('sb-') && name.includes('auth-token')
  ))
}

export async function POST(req: NextRequest) {
  const contentLength = req.headers.get('content-length')
  if (contentLength && Number.parseInt(contentLength, 10) > 204_800) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { text: rawText, fileName: rawFileName } = body as JsonObject
  const text = sanitizeText(rawText, MAX_TEXT_LENGTH)
  const fileName = sanitizeText(rawFileName, MAX_FILENAME_LENGTH)

  if (text.trim().length < 50) {
    return NextResponse.json({ error: 'Syllabus text too short or empty' }, { status: 400 })
  }

  const basicData = parseSyllabusLocally(text)
  if (!process.env.GROQ_API_KEY) {
    return basicResponse(basicData, 'Basic parser used because the AI service is not configured.')
  }
  if (!hasSupabaseAuthCookie(req)) {
    return basicResponse(basicData, 'Basic parser used in demo mode. Sign in for AI-enhanced extraction.')
  }

  const access = await requireApiUser()
  if (!access.ok) {
    return basicResponse(
      basicData,
      'Basic parser used because account verification is currently unavailable.',
    )
  }

  try {
    const response = await getClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are a university syllabus parser. Output only valid JSON.',
            'Extract ALL due dates and deadlines from the syllabus — every assignment, quiz, exam, midterm, final, project, lab, presentation, report, reading, homework, and any other graded or required work.',
            'Each item with a concrete date MUST appear as its own entry in keyDates. Do NOT summarize or combine items.',
            'If a recurring item (e.g. weekly quizzes) has individual due dates listed, include every individual date.',
            'Convert dates to ISO 8601. Preserve the year when given; infer the most plausible year from semester context when omitted. Never create an entry with only a week number or "TBD".',
            'Weights must be numeric percentages from 0 to 100.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Parse the complete syllabus below.

File: ${fileName || 'syllabus'}
Current date: ${new Date().toISOString().slice(0, 10)}

Return a JSON object with this exact shape:
{
  "instructor": "string or null",
  "courseTitle": "string or null",
  "courseCode": "string or null",
  "assignments": 0,
  "quizzes": 0,
  "exams": 0,
  "deadlines": 0,
  "gradingBreakdown": [{ "name": "string", "weight": 0 }],
  "keyDates": [{ "title": "string", "date": "ISO 8601 date" }],
  "officeHours": "string or null",
  "textbook": "string or null",
  "summary": "2-3 sentence course summary"
}

SYLLABUS START
${text}
SYLLABUS END`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content?.trim() ?? ''
    if (!raw) throw new Error('The AI returned an empty response')
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    const parsed = normalizeResult(JSON.parse(cleaned))
    return NextResponse.json({ data: parsed, parser: 'ai', warning: null })
  } catch (error) {
    console.error('Syllabus parse error:', error)
    return basicResponse(basicData, 'AI enhancement was unavailable, so ScholarFlow used the basic parser instead.')
  }
}
