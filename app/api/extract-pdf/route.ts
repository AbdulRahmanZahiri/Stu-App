import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'

export const runtime = 'nodejs'

// createRequire lets us call require() from an ESM module — needed because
// Next.js compiles API routes as ESM but pdf-parse is CommonJS.
const nodeRequire = createRequire(import.meta.url)

async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  // Import from lib path — skips pdf-parse's main entry which tries to read
  // a test PDF file and load canvas (both fail in Vercel's serverless env).
  // pdf-parse is in serverExternalPackages so it's a real Node module at runtime.
  const pdfParse = nodeRequire('pdf-parse/lib/pdf-parse.js') as (
    buf: Buffer,
    opts?: Record<string, unknown>
  ) => Promise<{ text: string; numpages: number }>

  const result = await pdfParse(buffer, { max: 0 }) // max:0 = all pages
  return {
    text: result.text.replace(/\s+/g, ' ').trim(),
    pages: result.numpages,
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    const isPdf = file.type === 'application/pdf' || extension === 'pdf'
    const isDocx =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === 'docx'
    const isText = file.type.startsWith('text/') || extension === 'txt' || extension === 'md'

    if (!isPdf && !isDocx && !isText) {
      return NextResponse.json(
        { error: 'Supported files: PDF, DOCX, TXT, Markdown.' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 10 MB.' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text = ''
    let pages: number | null = null

    if (isPdf) {
      const result = await extractPdfText(buffer)
      text = result.text
      pages = result.pages
    } else if (isDocx) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value.trim()
    } else {
      text = buffer.toString('utf8').replace(/^﻿/, '').trim()
    }

    if (!text || text.length < 50) {
      return NextResponse.json(
        {
          error: isPdf
            ? 'This PDF has no selectable text — it may be scanned. Try copying the text and using Paste Text instead.'
            : 'Could not extract readable text. Try the Paste Text option.',
        },
        { status: 422 }
      )
    }

    return NextResponse.json({ text, pages })
  } catch (error) {
    console.error('PDF extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to read this file. Try the Paste Text option instead.' },
      { status: 500 }
    )
  }
}
