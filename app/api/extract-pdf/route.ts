import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

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
      return NextResponse.json({ error: 'Supported files are PDF, DOCX, TXT, and Markdown.' }, { status: 400 })
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File must be under 10 MB' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text = ''
    let pages: number | null = null

    if (isPdf) {
      // Use the inner module path to avoid pdf-parse loading its test file at require() time,
      // which throws in Next.js / serverless environments.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>
      const result = await pdfParse(buffer)
      text = result.text?.trim() ?? ''
      pages = result.numpages
    } else if (isDocx) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value.trim()
    } else {
      text = buffer.toString('utf8').replace(/^\uFEFF/, '').trim()
    }

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: isPdf
          ? 'This PDF contains little or no selectable text and may be scanned. Run OCR on it or use Paste Text.'
          : 'Could not extract readable text from this file. Try the Paste Text option instead.' },
        { status: 422 }
      )
    }

    return NextResponse.json({ text, pages })
  } catch (error) {
    console.error('PDF extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to read PDF. Try the Paste Text option instead.' },
      { status: 500 }
    )
  }
}
