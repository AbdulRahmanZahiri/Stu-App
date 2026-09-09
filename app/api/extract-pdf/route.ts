import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_PDF_PAGES = 300
const MAX_EXTRACTED_CHARACTERS = 250_000
const MIN_EXTRACTED_CHARACTERS = 50

class DocumentImportError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
  }
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\x00/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function hasPdfHeader(buffer: Buffer): boolean {
  return buffer.subarray(0, 1024).toString('latin1').includes('%PDF-')
}

async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  // pdfjs-dist v3 legacy build: no external worker, no canvas, works on Vercel serverless
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js') as typeof import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '' // use fake inline worker

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true,
  })

  const document = await loadingTask.promise

  if (document.numPages > MAX_PDF_PAGES) {
    await loadingTask.destroy()
    throw new DocumentImportError(
      `PDFs are limited to ${MAX_PDF_PAGES} pages. Split this document into smaller files and try again.`,
      413,
      'TOO_MANY_PAGES',
    )
  }

  const parts: string[] = []
  for (let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ')
    parts.push(pageText)
  }

  await loadingTask.destroy()

  return {
    text: normalizeExtractedText(parts.join('\n\n')),
    pages: document.numPages,
  }
}

function extractionFailure(error: unknown): NextResponse {
  if (error instanceof DocumentImportError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }

  const message = error instanceof Error ? error.message : String(error)
  if (/password|encrypted/i.test(message)) {
    return NextResponse.json(
      { error: 'This PDF is password-protected. Remove the password and upload it again.', code: 'PASSWORD_PROTECTED' },
      { status: 422 },
    )
  }
  if (/invalid pdf|missing pdf|corrupt|format error/i.test(message)) {
    return NextResponse.json(
      { error: 'This PDF appears to be damaged or invalid. Export a fresh copy and try again.', code: 'INVALID_PDF' },
      { status: 422 },
    )
  }

  console.error('Document extraction error:', error)
  return NextResponse.json(
    { error: 'Failed to read this file. Try exporting it again or use Paste Text.', code: 'EXTRACTION_FAILED' },
    { status: 500 },
  )
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') ?? 0)
    if (contentLength > (MAX_FILE_SIZE + 65_536)) {
      return NextResponse.json({ error: 'File must be under 10 MB.' }, { status: 413 })
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json(
        { error: 'File must be under 10 MB. If your file is smaller, try again.', code: 'INVALID_UPLOAD' },
        { status: 413 },
      )
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
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

    if (file.size === 0) {
      return NextResponse.json({ error: 'The selected file is empty.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be under 10 MB.' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let text = ''
    let pages: number | null = null

    if (isPdf) {
      if (!hasPdfHeader(buffer)) {
        throw new DocumentImportError(
          'This file is named as a PDF but does not contain valid PDF data.',
          422,
          'INVALID_PDF',
        )
      }
      const result = await extractPdfText(buffer)
      text = result.text
      pages = result.pages
    } else if (isDocx) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = normalizeExtractedText(result.value)
    } else {
      text = normalizeExtractedText(buffer.toString('utf8').replace(/^﻿/, ''))
    }

    if (text.length < MIN_EXTRACTED_CHARACTERS) {
      return NextResponse.json(
        {
          error: isPdf
            ? 'This PDF has little or no selectable text and may be scanned. Run OCR first or use Paste Text.'
            : 'Could not extract readable text. Try the Paste Text option.',
          code: 'NO_SELECTABLE_TEXT',
        },
        { status: 422 },
      )
    }

    const truncated = text.length > MAX_EXTRACTED_CHARACTERS
    const returnedText = truncated ? text.slice(0, MAX_EXTRACTED_CHARACTERS) : text
    return NextResponse.json({
      text: returnedText,
      pages,
      characters: returnedText.length,
      truncated,
    })
  } catch (error) {
    return extractionFailure(error)
  }
}
