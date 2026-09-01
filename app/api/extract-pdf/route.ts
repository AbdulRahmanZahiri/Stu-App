import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

async function extractPdfText(buffer: Uint8Array): Promise<{ text: string; pages: number }> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // Disable worker — runs in the same thread, no native deps, works in Vercel
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const doc = await pdfjsLib.getDocument({ data: buffer, useWorkerFetch: false }).promise
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ')
    parts.push(pageText)
  }
  return { text: parts.join('\n').replace(/\s+/g, ' ').trim(), pages: doc.numPages }
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
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx'
    const isText = file.type.startsWith('text/') || extension === 'txt' || extension === 'md'

    if (!isPdf && !isDocx && !isText) {
      return NextResponse.json({ error: 'Supported files: PDF, DOCX, TXT, Markdown.' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 10 MB.' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text = ''
    let pages: number | null = null

    if (isPdf) {
      const result = await extractPdfText(new Uint8Array(buffer))
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
        { error: isPdf
            ? 'This PDF has no selectable text — it may be scanned. Try copying the text and using Paste Text instead.'
            : 'Could not extract readable text. Try the Paste Text option.' },
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
