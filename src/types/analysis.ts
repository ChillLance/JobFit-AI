// Unified analysis schema shared across local / Gemini / Groq providers (TASK-020).
// UI should read these standardized fields instead of provider-specific raw shapes.

export type AnalysisProvider = 'local' | 'gemini' | 'groq' | 'openrouter'

export type FitLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'

// Compact input-coverage summary surfaced to the UI (TASK-021.2). The full
// report (lengths, per-keyword/section flags) lives in the stored metadata.
export type InputCoverageSummary = {
  warningLevel: 'ok' | 'partial' | 'risky'
  warnings: string[]
}

// Compact digest stats surfaced to the UI (TASK-021.3). Counts only — the full
// digest / evidence / fallback content stays in the stored metadata.inputStats.
export type DigestStatsSummary = {
  inputStrategy?: string
  extractedItemCount?: number
  boilerplateRemovedLineCount?: number
  boilerplateRemovedPhraseCount?: number
  evidenceSnippetCount?: number
  tailEvidenceSnippetCount?: number
  fallbackItemCount?: number
}

export type AnalysisMetadata = {
  provider: AnalysisProvider
  model: string
  createdAt: string
  profileVersion?: string
  cacheExpiresAt?: string
  inputMode?: 'rules' | 'full' | 'compact' | 'digest'
  tokenStrategy?: string
  source?: 'cache' | 'fresh'
  inputCoverage?: InputCoverageSummary
  digestStats?: DigestStatsSummary
  // Active JapanCareerProfile used as the analysis baseline (TASK-029).
  analyzedProfileId?: string
  analyzedProfileName?: string
  analyzedAt?: string
}

export type AnalysisResult = {
  fitScore: number | null
  fitLevel: FitLevel
  recommendation: string
  summary: string
  strengths: string[]
  gaps: string[]
  risks: string[]
  suggestedActions: string[]
  metadata: AnalysisMetadata
}

// A raw analysis object as produced by any provider/API or read from jobs_temp.json.
// Field names are intentionally loose; normalizeAnalysisResult maps them to AnalysisResult.
export type RawAnalysis = Record<string, unknown> | null | undefined

// Minimal job shape that getPrimaryAnalysis needs to pick the best available
// analysis. The local result may live under `localAnalysis` (canonical),
// `analysis` (deprecated write key), or `aiScore` (legacy mock).
export type AnalysisJobInput = {
  deepAnalysis?: unknown
  groqAnalysis?: unknown
  openrouterAnalysis?: unknown
  localAnalysis?: unknown
  analysis?: unknown
  aiScore?: unknown
}
