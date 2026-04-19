import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `You are an AI academic assistant for ScholarFlow, a student portal for university students.
You help students with their coursework, study plans, summaries, flashcards, and academic questions.
The student is currently enrolled in these courses:
- COMP 2007: Data Structures & Algorithms
- COMP 2003: Programming II (Java)
- MATH 2050: Linear Algebra
- ENGL 1110: Academic Writing

Be concise, helpful, and encouraging. Use markdown formatting with **bold** for key terms, bullet points for lists, and numbered lists for steps. Keep responses focused and academic.`

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const { messages } = await req.json()

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('AI route error:', error)
    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
  }
}
