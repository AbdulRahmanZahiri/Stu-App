import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string; totalPages: number }> } }
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()

    const text = result.text?.trim()
    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract readable text from this PDF. Try the Paste Text option instead.' },
        { status: 422 }
      )
    }

    return NextResponse.json({ text, pages: result.totalPages })
  } catch (error) {
    console.error('PDF extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to read PDF. Try the Paste Text option instead.' },
      { status: 500 }
    )
  }
}
