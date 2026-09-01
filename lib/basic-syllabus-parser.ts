export interface ParsedSyllabusData {
  instructor: string | null
  courseTitle: string | null
  courseCode: string | null
  assignments: number
  quizzes: number
  exams: number
  deadlines: number
  gradingBreakdown: Array<{ name: string; weight: number }>
  keyDates: Array<{ title: string; date: string }>
  officeHours: string | null
  textbook: string | null
  summary: string | null
}

const MONTH_PATTERN = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const TASK_PATTERN = /\b(assignment|homework|hw|quiz|exam|midterm|final|project|paper|essay|lab|presentation|test|assessment|portfolio|report|deadline|problem\s*set|ps\s*\d|discussion|reflection|submission|deliverable|milestone|case\s*study)\b/i
const CATEGORY_PATTERN = '(assignments?|homework|quizzes?|exams?|midterms?|final(?: exam)?|projects?|papers?|essays?|labs?|presentations?|participation|attendance|discussions?|portfolio|reports?|tests?|assessments?)'

function cleanLine(value: string): string {
  return value
    .replace(/[|*_#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findLabeledValue(lines: string[], labels: string[]): string | null {
  const labelPattern = labels.map((label) => label.replace(/\s+/g, '\\s+')).join('|')
  const pattern = new RegExp(`^(?:${labelPattern})\\s*[:\\-–—]\\s*(.+)$`, 'i')
  for (const line of lines) {
    const match = cleanLine(line).match(pattern)
    if (match?.[1]) return match[1].trim().slice(0, 500)
  }
  return null
}

function inferYear(text: string): number {
  const semesterYear = text.match(/\b(?:fall|autumn|winter|spring|summer)\s+(20\d{2})\b/i)?.[1]
  if (semesterYear) return Number(semesterYear)

  const courseYear = text.match(/\b(?:academic year|term|semester|course)\D{0,20}(20\d{2})\b/i)?.[1]
  if (courseYear) return Number(courseYear)
  return new Date().getFullYear()
}

function findDateToken(line: string): string | null {
  const patterns = [
    /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/,
    /\b\d{1,2}[/-]\d{1,2}\b/,
    new RegExp(`\\b${MONTH_PATTERN}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b`, 'i'),
    new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH_PATTERN}(?:,?\\s+\\d{4})?\\b`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match?.[0]) return match[0]
  }
  return null
}

function validUtcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null
  return date
}

function parseDateToken(token: string, fallbackYear: number): Date | null {
  const cleaned = token.replace(/(\d)(st|nd|rd|th)\b/gi, '$1').replace(/,/g, '').trim()

  if (/^\d{1,4}[/-]\d{1,2}(?:[/-]\d{1,4})?$/.test(cleaned)) {
    const parts = cleaned.split(/[/-]/).map(Number)
    let year = fallbackYear
    let month = parts[0]
    let day = parts[1]

    if (parts.length === 3 && String(parts[0]).length === 4) {
      year = parts[0]
      month = parts[1]
      day = parts[2]
    } else if (parts.length === 3) {
      year = parts[2] < 100 ? 2000 + parts[2] : parts[2]
      if (month > 12) [month, day] = [day, month]
    } else if (month > 12) {
      const originalMonth = month
      month = day
      day = originalMonth
    }

    return validUtcDate(year, month, day)
  }

  const withYear = /\b\d{4}\b/.test(cleaned) ? cleaned : `${cleaned} ${fallbackYear}`
  const timestamp = Date.parse(`${withYear} 12:00:00 UTC`)
  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

function cleanTaskTitle(line: string, token: string, previousLine: string): string {
  let title = cleanLine(line.replace(token, ' '))
    .replace(/\b(?:due\s*date|due|deadline|date|on)\b\s*[:\-–—]?/gi, ' ')
    .replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!TASK_PATTERN.test(title) && TASK_PATTERN.test(previousLine)) title = cleanLine(previousLine)
  if (!title || /^(due|deadline|date)$/i.test(title)) title = cleanLine(previousLine)
  return title.slice(0, 200)
}

function extractKeyDates(lines: string[], year: number): ParsedSyllabusData['keyDates'] {
  const entries: ParsedSyllabusData['keyDates'] = []
  const seen = new Set<string>()
  let previousLine = ''

  for (const rawLine of lines) {
    const line = cleanLine(rawLine)
    if (!line) continue
    const token = findDateToken(line)
    const hasTaskContext = TASK_PATTERN.test(line) || TASK_PATTERN.test(previousLine)

    if (token && hasTaskContext && !/office\s+hours?/i.test(line)) {
      const parsedDate = parseDateToken(token, year)
      const title = cleanTaskTitle(line, token, previousLine)
      if (parsedDate && title && (TASK_PATTERN.test(title) || hasTaskContext)) {
        const key = `${title.toLowerCase()}|${parsedDate.toISOString().slice(0, 10)}`
        if (!seen.has(key)) {
          seen.add(key)
          entries.push({ title, date: parsedDate.toISOString() })
        }
      }
    }

    previousLine = line
  }

  return entries.slice(0, 250)
}

function titleCaseCategory(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bAnd\b/g, 'and')
}

function extractGradingBreakdown(text: string): ParsedSyllabusData['gradingBreakdown'] {
  const entries: ParsedSyllabusData['gradingBreakdown'] = []
  const seen = new Set<string>()
  const patterns = [
    new RegExp(`\\b${CATEGORY_PATTERN}(?:\\s*\\([^)]{1,30}\\))?\\s*[:\\-–—]?\\s*(\\d{1,3}(?:\\.\\d+)?)\\s*%`, 'gi'),
    new RegExp(`\\b(\\d{1,3}(?:\\.\\d+)?)\\s*%\\s*[:\\-–—]?\\s*${CATEGORY_PATTERN}\\b`, 'gi'),
  ]

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const prefixWeight = /^\d/.test(match[0].trim())
      const rawName = prefixWeight ? match[2] : match[1]
      const rawWeight = prefixWeight ? match[1] : match[2]
      const weight = Number(rawWeight)
      const name = titleCaseCategory(rawName)
      const key = name.toLowerCase().replace(/s$/, '')
      if (!name || !Number.isFinite(weight) || weight <= 0 || weight > 100 || seen.has(key)) continue
      seen.add(key)
      entries.push({ name, weight: Number(weight.toFixed(2)) })
    }
  }

  return entries.slice(0, 50)
}

function countDatedItems(keyDates: ParsedSyllabusData['keyDates'], pattern: RegExp): number {
  return keyDates.filter((entry) => pattern.test(entry.title)).length
}

function countNumberedItems(text: string, item: string): number {
  const matches = text.match(new RegExp(`\\b${item}\\s*(?:#|no\\.?\\s*)?\\d+\\b`, 'gi')) ?? []
  return new Set(matches.map((match) => match.toLowerCase().replace(/\s+/g, ' '))).size
}

function extractCourseTitle(lines: string[], courseCode: string | null): string | null {
  const labeled = findLabeledValue(lines, ['course title', 'course name', 'title'])
  if (labeled) return labeled.slice(0, 300)
  if (!courseCode) return null

  const codePattern = new RegExp(courseCode.replace(/\s+/g, '\\s*'), 'i')
  for (const rawLine of lines) {
    const line = cleanLine(rawLine)
    if (!codePattern.test(line)) continue
    const title = line.replace(codePattern, '').replace(/^[\s:;,.\-–—]+/, '').trim()
    if (title.length >= 3 && title.length <= 300) return title
  }
  return null
}

export function parseSyllabusLocally(text: string): ParsedSyllabusData {
  const lines = text.split(/\r?\n/)
  const cleanedText = lines.map(cleanLine).filter(Boolean).join('\n')
  const year = inferYear(cleanedText)
  const compactCode = cleanedText.match(/\b[A-Z]{2,6}\s*[- ]?\s*\d{3,4}[A-Z]?\b/i)?.[0] ?? null
  const courseCode = compactCode?.toUpperCase().replace(/\s*-\s*/, ' ').replace(/([A-Z])(?=\d)/, '$1 ') ?? null
  const keyDates = extractKeyDates(lines, year)
  const gradingBreakdown = extractGradingBreakdown(cleanedText)
  const datedAssignments = countDatedItems(keyDates, /assignment|homework|project|paper|essay|lab|presentation|report|portfolio/i)
  const datedQuizzes = countDatedItems(keyDates, /quiz/i)
  const datedExams = countDatedItems(keyDates, /exam|midterm|final|test/i)
  const assignments = Math.max(datedAssignments, countNumberedItems(cleanedText, 'assignment'))
  const quizzes = Math.max(datedQuizzes, countNumberedItems(cleanedText, 'quiz'))
  const exams = Math.max(datedExams, countNumberedItems(cleanedText, '(?:exam|midterm|test)'))

  return {
    instructor: findLabeledValue(lines, ['instructor', 'professor', 'prof', 'teacher']),
    courseTitle: extractCourseTitle(lines, courseCode),
    courseCode,
    assignments,
    quizzes,
    exams,
    deadlines: keyDates.length,
    gradingBreakdown,
    keyDates,
    officeHours: findLabeledValue(lines, ['office hours?', 'student hours?']),
    textbook: findLabeledValue(lines, ['required textbook', 'textbook', 'required text', 'course text']),
    summary: `Basic parser found ${keyDates.length} dated item${keyDates.length === 1 ? '' : 's'} and ${gradingBreakdown.length} grading categor${gradingBreakdown.length === 1 ? 'y' : 'ies'}. Review the preview before saving.`,
  }
}
