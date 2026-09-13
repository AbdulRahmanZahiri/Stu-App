'use client'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_EXTRACTED_CHARACTERS = 250_000
const MIN_EXTRACTED_CHARACTERS = 50

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

function finalizeText(text: string, pages: number | null, isPdf: boolean): ExtractedDocument {
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

// PDF and DOCX extraction runs server-side via /api/extract-pdf.
// This avoids bundling pdfjs-dist (large, worker-dependent) and mammoth
// (serverExternalPackages — not available in the client bundle) into the
// browser chunk, which causes silent failures in production.
async function extractViaServer(file: File): Promise<ExtractedDocument> {
  const form = new FormData()
  form.append('file', file)

  let res: Response
  try {
    res = await fetch('/api/extract-pdf', { method: 'POST', body: form })
  } catch {
    throw new DocumentExtractionError('Network error — check your connection and try again.')
  }

  type ApiResult = { error?: string; text?: string; pages?: number; characters?: number; truncated?: boolean }
  let data: ApiResult
  try {
    data = (await res.json()) as ApiResult
  } catch {
    throw new DocumentExtractionError(
      res.status >= 500
        ? 'The server could not process this file. Try again or use Paste Text.'
        : 'Unexpected response from server.',
    )
  }

  if (!res.ok) throw new DocumentExtractionError(data.error || 'Failed to read this file.')
  if (!data.text) throw new DocumentExtractionError('No readable text was found in this file.')

  return {
    text: data.text,
    pages: data.pages ?? null,
    characters: data.characters ?? data.text.length,
    truncated: data.truncated ?? false,
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

  if (isPdf || isDocx) return extractViaServer(file)
  if (isText) return finalizeText((await file.text()).replace(/^﻿/, ''), null, false)

  throw new DocumentExtractionError('Supported files: PDF, DOCX, TXT, Markdown.')
}
