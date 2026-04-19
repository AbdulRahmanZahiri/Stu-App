import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const { text, fileName } = await req.json()

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: 'Syllabus text too short or empty' }, { status: 400 })
    }

    const response = await client.chat.completions.create({
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
${text.slice(0, 8000)}

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
