'use client'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_PDF_PAGES = 300
const MAX_EXTRACTED_CHARACTERS = 250_000
const MIN_EXTRACTED_CHARACTERS = 50
const PDF_WORKER_PATH = '/pdf.worker.min.mjs'

export interface ExtractedDocument {
  text: string
  pages: number | null
  characters: number
  truncated: boolean
}

class DocumentExtractionError extends Error {}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\x00/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function finalizeExtraction(text: string, pages: number | null, isPdf: boolean): ExtractedDocument {
  const normalized = normalizeExtractedText(text)
  if (normalized.length < MIN_EXTRACTED_CHARACTERS) {
    throw new DocumentExtractionError(
      isPdf
        ? 'This PDF has little or no selectable text and may be scanned. Run OCR first or use Paste Text.'
        : 'Could not extract readable text. Try the Paste Text option.',
    )
  }

  const truncated = normalized.length > MAX_EXTRACTED_CHARACTERS
  const returnedText = truncated ? normalized.slice(0, MAX_EXTRACTED_CHARACTERS) : normalized
  return { text: returnedText, pages, characters: returnedText.length, truncated }
}

function hasPdfHeader(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 1024))
  return String.fromCharCode(...bytes).includes('%PDF-')
}

function friendlyPdfError(error: unknown): DocumentExtractionError {
  if (error instanceof DocumentExtractionError) return error

  const message = error instanceof Error ? error.message : String(error)
  if (/password|encrypted/i.test(message)) {
    return new DocumentExtractionError('This PDF is password-protected. Remove the password and upload it again.')
  }
  if (/invalid pdf|missing pdf|corrupt|format error/i.test(message)) {
    return new DocumentExtractionError('This PDF appears to be damaged or invalid. Export a fresh copy and try again.')
  }
  return new DocumentExtractionError('Failed to read this PDF. Try exporting it again or use Paste Text.')
}

async function extractPdf(file: File): Promise<ExtractedDocument> {
  const buffer = await file.arrayBuffer()
  if (!hasPdfHeader(buffer)) {
    throw new DocumentExtractionError('This file is named as a PDF but does not contain valid PDF data.')
  }

  const pdfjs = await import('pdfjs-dist-client')
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_PATH
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  })

  try {
    const document = await loadingTask.promise
    if (document.numPages > MAX_PDF_PAGES) {
      throw new DocumentExtractionError(
        `PDFs are limited to ${MAX_PDF_PAGES} pages. Split this document into smaller files and try again.`,
      )
    }

    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const fragments: string[] = []

      for (const item of content.items) {
        if (!('str' in item)) continue
        fragments.push(item.str)
        fragments.push(item.hasEOL ? '\n' : ' ')
      }

      pages.push(fragments.join('').trim())
      page.cleanup()
    }

    return finalizeExtraction(pages.join('\n\n'), document.numPages, true)
  } catch (error) {
    throw friendlyPdfError(error)
  } finally {
    await loadingTask.destroy().catch(() => undefined)
  }
}

async function extractDocx(file: File): Promise<ExtractedDocument> {
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return finalizeExtraction(result.value, null, false)
  } catch (error) {
    if (error instanceof DocumentExtractionError) throw error
    throw new DocumentExtractionError('Failed to read this Word document. Export a fresh DOCX or use Paste Text.')
  }
}

export async function extractDocumentText(file: File): Promise<ExtractedDocument> {
  if (file.size === 0) throw new DocumentExtractionError('The selected file is empty.')
  if (file.size > MAX_FILE_SIZE) throw new DocumentExtractionError('Files must be under 10 MB.')

  const extension = file.name.split('.').pop()?.toLowerCase()
  const isPdf = file.type === 'application/pdf' || extension === 'pdf'
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  const isText = file.type.startsWith('text/') || extension === 'txt' || extension === 'md'

  if (isPdf) return extractPdf(file)
  if (isDocx) return extractDocx(file)
  if (isText) return finalizeExtraction((await file.text()).replace(/^﻿/, ''), null, false)

  throw new DocumentExtractionError('Supported files: PDF, DOCX, TXT, Markdown.')
}
