import Groq, { APIError } from 'groq-sdk'
import type { ChatCompletionCreateParamsNonStreaming, ChatCompletion } from 'groq-sdk/resources/chat/completions'

export { type ChatCompletionCreateParamsNonStreaming as GroqChatParams }
export type { ChatCompletion }

export const GROQ_MODEL = 'qwen/qwen3.8-27b'

const MAX_RETRY_WAIT_MS = 35_000
const MAX_ATTEMPTS = 4

let _client: Groq | null = null
function rawClient(): Groq {
  if (!_client) {
    _client = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0, timeout: 120_000 })
  }
  return _client
}

function retryWaitMs(err: APIError, attempt: number): number {
  const header = (err as unknown as { headers?: Record<string, string> }).headers?.['retry-after']
  if (header) return parseFloat(header) * 1000
  return Math.min(3_000 * 3 ** attempt, MAX_RETRY_WAIT_MS)
}

/**
 * Calls Groq chat completions with automatic rate-limit retry (up to ~35 s wait).
 * On long rate limits throws an Error with code='RATE_LIMITED' and retryAfter (seconds).
 */
export async function groqChat(params: ChatCompletionCreateParamsNonStreaming): Promise<ChatCompletion> {
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await rawClient().chat.completions.create({ ...params, stream: false })
    } catch (err) {
      lastError = err
      if (!(err instanceof APIError) || err.status !== 429) throw err

      const waitMs = retryWaitMs(err, attempt)
      if (waitMs > MAX_RETRY_WAIT_MS || attempt === MAX_ATTEMPTS - 1) {
        const retryAfter = Math.ceil(waitMs / 1000)
        throw Object.assign(
          new Error(`Groq rate limit reached — please wait ${retryAfter}s and try again.`),
          { code: 'RATE_LIMITED', retryAfter }
        )
      }
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }

  throw lastError
}
