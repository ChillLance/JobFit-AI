/**
 * Server-only AI configuration helpers.
 * Import only from API routes or other server-side code — never from Client Components.
 */

export function getAnalyzeMode(): string {
  const mode = process.env.ANALYZE_MODE?.trim()
  return mode || 'local'
}

export function hasGeminiApiKey(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim()
  return Boolean(key)
}

export function getGeminiApiKeyStatus(): {
  configured: boolean
  mode: string
} {
  return {
    configured: hasGeminiApiKey(),
    mode: getAnalyzeMode(),
  }
}
