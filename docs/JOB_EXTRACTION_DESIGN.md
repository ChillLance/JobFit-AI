# JOB_EXTRACTION_DESIGN.md — rawText → structured fields (v1)

> Status: designed 2026-07-14 (Claude, based on an audit of the 26 real
> listings collected that morning). Implements the extraction prerequisite for
> the four-layer decision model in `MEMORIES/product-direction.md` /
> ADR-2026-001. Phase 1 is implementation-ready; later phases need user review.

## 1. Why this exists (evidence, 2026-07-14 audit)

- The extension stores only `title / url / rawText / collectedAt`
  (`extension/popup.js:21-23`). All 26 real jobs in `data/jobfit.sqlite` have
  **no** `company / location / salary / employmentType`. Demo jobs look
  complete only because `data/demo-jobs.json` is handwritten.
- The rawText is rich enough: the three collected sources (Indeed,
  resortbaito.com, resortbaito-dive.com) contain wage, 寮費/光熱費, 食事条件,
  交通費 (incl. 満了時支給 traps), shift patterns (中抜け), holidays,
  requirements (運転免許必須), and site-stated 予想月収 / 月収例.
- `getJobSalaryEstimate` already parses wages out of rawText for all 26 jobs,
  but back-solves monthly income from an assumed 160 h even when the site
  states 予想月収 230,000円 (measured drift ~10% on listing 215509).
- One exact duplicate URL exists in the DB (collect endpoint has no dedup).

Conclusion: the bottleneck for the four-layer model is **extraction, not UI**.

## 2. Scope and non-goals

In scope (Phase 1):
- One LLM call per job: rawText → `JobExtraction` JSON (schema below).
- Code-side validation that demotes ungrounded values to `null`.
- `POST /api/jobs/[id]/extract` storing the result on the job record.
- Upsert-by-URL in the collect endpoint (fixes the duplicate bug).

Non-goals (Phase 1):
- No scoring, no recommendation, no eligibility judgment — extraction only.
  Scoring stays in `localAnalysis` / later analysis steps.
- No translation. Values keep the source language (Japanese); enums are
  English tokens. Rendering/translation is a UI concern (Phase 2).
- No UI changes. No unattended crawling (collection stays extension-driven).
- No "missing info questions" UI yet — but the schema makes them derivable
  deterministically (see §7).

## 3. Design principles

1. **Extract, don't judge.** Cheap models are reliable at grounded extraction
   and unreliable at judgment. Anything requiring judgment stays in code.
2. **Quote-grounded or null.** Every extraction field must carry a verbatim
   evidence quote; the validator checks the quote is a substring of the
   (normalized) rawText. No quote → field forced to `null`.
   Consequence: a hallucination degrades into "missing info" — which the
   product treats as a question to ask, never as a wrong fact.
3. **`null` means "the listing does not state this"** and is a first-class
   value (ADR: missing info is a question, not a score).
4. **Flat schema.** Mostly flat keys; arrays only where the domain demands
   (languages, income examples, red flags). Flat schemas cut cheap-model
   structural errors.
5. **Versioned.** `schemaVersion` + `rawTextHash` so re-extraction is
   idempotent and migration-aware.

## 4. Schema v1 (`src/types/extraction.ts`)

```ts
export type JobExtraction = {
  schemaVersion: 1
  extractedAt: string          // ISO, set by server
  model: string                // e.g. 'gemini-flash'
  rawTextHash: string          // sha256 hex of rawText, set by server

  // ---- identity ----
  workplaceName: string | null     // actual facility (慶雲館), NOT the agency
  agencyName: string | null        // 派遣/紹介会社 (ダイブ, スタッフエージェント…)
  listingId: string | null         // 求人No / お仕事NO on the source site
  roleCategory:                    // classification field (no quote needed)
    | 'front_desk_bell' | 'room_attendant' | 'restaurant_service'
    | 'kitchen' | 'cleaning_backyard' | 'shop_sales' | 'office_reservation'
    | 'general_all' | 'night_front' | 'other' | null
  dutySummary: string | null       // ≤100 chars, source language

  // ---- layer 1: eligibility ----
  employmentType:
    | 'haken' | 'contract' | 'fulltime' | 'parttime_baito'
    | 'shoukai' | 'other' | null   // classification field
  startTiming: string | null       // '10月上旬・中旬' / '即日'
  minDurationMonths: number | null // '2ヶ月以上' → 2
  durationNote: string | null      // '初回契約1ヶ月' etc.
  extensionPossible: boolean | null
  requiredLanguages: { language: 'ja'|'en'|'zh'|'ko'|'other'; note: string }[]
  requiredLicenses: string[]       // '運転免許（AT限定可）'
  requiredExperience: string | null
  foreignerSignals: string[]       // verbatim: '外国人歓迎', '多国籍…'

  // ---- layer 2: financial ----
  wageType: 'hourly' | 'daily' | 'monthly' | null   // classification field
  wageMinJpy: number | null
  wageMaxJpy: number | null
  overtimeNote: string | null      // '時間外25%UP', '22時以降1,438円'
  statedMonthlyIncomeJpy: number | null  // 予想月収 — site-stated ONLY
  incomeExamples: { label: string; minJpy: number; maxJpy: number }[]
                                   // 月収例 19〜23万 / 閑散期 16〜20万
  dormFeeJpy: number | null        // 0 = explicitly free
  dormFeeNote: string | null       // '寮費補助' when amount unstated
  utilitiesFeeJpy: number | null   // 0 = '水道光熱費0円'
  utilitiesFeeNote: string | null
  mealsCostType: 'free' | 'paid' | 'partial' | 'not_provided' | null
  mealsCostNote: string | null     // '1食¥500', '昼夜休日含め無料'
  travelReimbursement: 'full' | 'capped' | 'none' | null
  travelReimbursementCapJpy: number | null
  travelReimbursementCondition: string | null  // '満了時に支給' ← trap field
  payDay: string | null            // '月末締め翌月20日'
  advancePayAvailable: boolean | null   // 前払い/週払い
  completionBonusNote: string | null    // 満了金

  // ---- layer 3: living ----
  housingType: 'private_room' | 'shared_room' | 'none' | null
  housingWifi: boolean | null
  housingNote: string | null       // '共用トイレ・洗濯機' etc, ≤80 chars
  mealsProvidedNote: string | null // '従業員食堂/弁当/ビュッフェ賄い'
  prefecture: string | null        // '山梨県'
  cityArea: string | null          // '南小国町', '銀座'
  areaName: string | null          // '黒川温泉', '定山渓' (resort-area name)
  accessNote: string | null        // '銀座駅徒歩2分', 'コンビニまで車5分', '山奥'
  carAllowed: boolean | null       // 車持ち込み可
  onsenUse: boolean | null         // 温泉利用OK

  // ---- layer 4: work ----
  shiftType: 'through' | 'split' | 'rotating' | null  // 通し/中抜け/シフト制
  hoursNote: string | null         // '8:00〜21:30の中で実働8h'
  nightWork: boolean | null        // ナイトフロント / 22時以降勤務
  overtimeEstimate: string | null  // '日0〜2時間', '残業月20時間以内'
  holidaysPerMonthNote: string | null  // '月6〜8日', '月4日以上' (keep string)
  trainingSupport: boolean | null  // 研修制度あり
  sourceRatingScore: number | null // dive: 総合評価 3.8
  sourceRatingCount: number | null // (7件)

  // ---- cross-cutting ----
  redFlags: string[]               // verbatim unusual conditions
  evidence: Record<string, string> // fieldName → ≤50-char verbatim quote
}
```

Classification fields (enum assignment allowed without a quote):
`roleCategory, employmentType, wageType, mealsCostType, travelReimbursement,
housingType, shiftType`. Every other non-null field **requires** an
`evidence[fieldName]` quote. Array fields: one quote covering the array is
enough (`evidence.requiredLanguages`, etc.); `foreignerSignals` / `redFlags`
are themselves verbatim quotes and need no separate evidence entry.

## 5. Prompt template (`buildExtractionPrompt`)

Instructions in English (cheap models follow English instructions on Japanese
text well); glossary pins the domain terms; output is JSON only, temperature 0.

```
You are a data extraction engine. Extract structured fields from a Japanese
job listing (working-holiday / live-in resort work context). Output ONLY
valid JSON matching the schema. No prose, no markdown fences.

Rules:
1. Extract, do not judge. No scores, no recommendations, no advice.
2. QUOTE-GROUNDED: for every non-null field except the classification fields
   (roleCategory, employmentType, wageType, mealsCostType,
   travelReimbursement, housingType, shiftType), copy a supporting quote
   (≤50 chars, verbatim from BODY) into "evidence" under the field name.
   No supporting text → set the field to null and omit the evidence entry.
3. null means "the listing does not state this". Never guess, never use
   knowledge outside the BODY.
4. Keep text values in the original language. Numbers are JPY integers
   without commas; convert 万 units (23万 → 230000).
5. Listings are often posted by an agency (派遣会社: ダイブ, FREEDEA,
   スタッフエージェント…). workplaceName = the actual facility
   (hotel/ryokan/store). agencyName = the intermediary. Site chrome
   (Indeed, リゾートバイト.com) is neither.
6. redFlags: verbatim quotes of conditions a working-holiday applicant could
   be caught out by (e.g. 交通費は満了時支給, 初回契約1ヶ月, シフト変動).

Glossary: 寮費=dorm fee / 水道光熱費=utilities / 賄い・食事条件=meals /
交通費=transport / 満了=contract completion / 中抜け=split shift /
通し=through shift / 予想月収・月収例=stated monthly income /
前払い=advance pay / 住み込み=live-in / 個室寮=private dorm room.

INPUT
TITLE: {title}
URL: {url}
BODY:
{rawText}

Return JSON with exactly these keys: {schema key list + enum values}
```

`rawText` is passed whole (all 26 samples are 2–9 KB ≈ ≤4k tokens — no
truncation needed; if a future listing exceeds ~20 KB, truncate tail and
record `truncated: true` in evidence… **defer**, YAGNI for v1).

## 6. Code-side validation (`parseExtraction`)

Order of operations, fail-closed to `null` (never reject the whole result
unless JSON itself is unparseable):

1. `JSON.parse` (strip accidental markdown fences first). Unparseable →
   extraction fails with `parse_error` (caller may retry once).
2. Enum whitelist per classification field; unknown token → `null`.
3. Type coercion: numbers must be finite integers ≥ 0; strings trimmed;
   arrays filtered to well-shaped entries.
4. **Evidence gate**: normalize both rawText and each quote with
   NFKC (full→half width) + strip all whitespace and commas. Quote not a
   substring of normalized rawText → set that field to `null`, drop the
   evidence entry, and append the field name to a `demotedFields` list in
   the API response (observability; not stored in the job).
5. Numeric sanity (warn-only, not demote): wageMinJpy ≤ wageMaxJpy;
   hourly wage in [800, 5000]; monthly income in [100_000, 1_000_000].
   Violations go into the API response `warnings`.

## 7. Missing-info questions (deterministic — Phase 2, design only)

No LLM. Critical-field set → question template id, generated in code from
`null`s after extraction:

| field(s) null | question id |
|---|---|
| dormFeeJpy(+Note) | ask_dorm_fee |
| utilitiesFeeJpy(+Note) | ask_utilities |
| mealsCostType | ask_meals |
| housingType | ask_room_type |
| minDurationMonths | ask_duration |
| travelReimbursement | ask_travel |
| holidaysPerMonthNote | ask_holidays |
| overtimeEstimate / nightWork | ask_overtime_nights |
| requiredLanguages empty | ask_japanese_level |

Question strings live in `uiCopy.ts` (3 languages) when Phase 2 lands.

## 8. Provider and cost

- Default provider: **Gemini Flash** via the existing Gemini integration
  (best JP extraction per yen; the app already has the provider). Reuse the
  existing client/env conventions from the analyze routes. Fallback: none in
  v1 — if the key is missing, the route returns a structured error
  (`{ error: { code: 'missing_api_key', provider: 'gemini' } }`, HTTP 503)
  and the UI can surface it later.
- Cost: ~3k tokens in + ~1k out per job → far under ¥1 per listing on Flash;
  the full 26-job backlog is effectively free.
- Temperature 0, JSON output mode if the client supports it.

## 9. Storage and API

- Result stored inside the job's JSON blob: `job.extraction = JobExtraction`.
  Legacy top-level fields (`title/company/…`) untouched; demo jobs unaffected.
- `POST /api/jobs/[id]/extract`:
  - 404 unknown id; 503 missing key; 502 provider/parse failure (with code).
  - Skips the LLM call and returns the stored result when
    `extraction.rawTextHash` matches current rawText and
    `extraction.schemaVersion` is current (idempotent). `?force=true` re-runs.
  - Response: `{ extraction, demotedFields, warnings }`.
- Collect endpoint (existing POST that the extension calls): **upsert by
  URL** for non-demo jobs — same `url` already present → update that record's
  `title/rawText/collectedAt` (and clear stale `extraction` if rawTextHash
  changed) instead of inserting a duplicate.

## 10. Phases

- **P1 (now)**: schema + prompt builder + validator + extract route + collect
  upsert + unit tests (fixtures = short synthetic Japanese snippets modeled on
  the three source formats; never commit real scraped rawText).
- **P2**: UI — card shows extracted fields with provenance styling
  (explicit vs missing), missing-info question chips, salary sort prefers
  `statedMonthlyIncomeJpy` over the 160 h back-solve, batch "extract all"
  button. Needs user review of card layout first (taste decision).
- **P3**: net-savings estimate (wage − dorm − utilities − meals, visible
  assumptions) = the financial-fit layer; consolidate with `salary.ts`
  (known debt in `MEMORIES/index.md`).

## 11. P3 v1 — savings estimate & profile gates (implemented 2026-07-14)

Shipped ahead of P2 at user request ("fix the financial blind spot").

- `src/lib/jobs/savings.ts` — `estimateMonthlySavings(job)`:
  income (`statedMonthlyIncomeJpy` ?? back-solve) − dorm − utilities − meals
  − misc. **Dorm fee null → no estimate** (largest variable; becomes a
  question instead). Assumption constants: utilities unknown → ¥10,000,
  meals paid/partial → ¥20,000, meals unknown → ¥30,000, misc ¥20,000;
  taxes/insurance excluded (flagged in `assumptions`). Dashboard shows a
  savings chip + `savings_desc` sort.
- `JapanCareerProfile.workingHoliday?` (optional, backward-compatible):
  hasDriverLicense / splitShiftTolerance / availableMonths / availableFrom /
  targetMonthlySavingsJpy / privateRoomRequired. AI-import prompt
  (`profilePrompt.ts`, all 3 languages) interviews for these.
- `localAnalysis` extraction-aware rules: dorm 0 → +4, meals free → +4,
  utilities 0 → +2 (combined cap +10); 満了-conditioned transport → risk;
  license required vs hasDriverLicense=false → −15; split shift vs
  avoid/low tolerance → −6; minDurationMonths > availableMonths → −15;
  savings ≥ target → +4 strength. No extraction → behavior unchanged.
- Measured effect on the 26 real listings: fully-covered live-in jobs
  (dorm+meals+utilities free) +10 → into the ≥80 "high match" band;
  Kurokawa-onsen +2 only because its listing never states the dorm fee
  explicitly (honest extraction → honest scoring → dorm fee becomes a
  question). Jobs without extraction: zero score drift.

## 12. Risks / notes

- rawText is already stored by the extension (attended capture); extraction
  adds no new scraping surface. Keep fixtures synthetic to avoid committing
  third-party listing text to the repo.
- Cheap-model failure mode is bounded by design: ungrounded output demotes to
  `null` → becomes a question, not a wrong fact. The residual risk is a
  *correctly quoted but mis-assigned* field (quote exists but under the wrong
  key); spot-check the first batch manually before trusting P3 math.
- Do not add a second salary parser: `statedMonthlyIncomeJpy` +
  `getJobSalaryEstimate` must be consolidated in P3, not forked further.
