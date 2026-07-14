// Prompt builder for rawText → structured field extraction (LLM-assisted).
//
// Pure module: no fs, no network, no env reads. Builds the single prompt
// string sent to the LLM; the caller (the extract API route) owns the
// network call. See docs/JOB_EXTRACTION_DESIGN.md §5 for the design.
//
// Instructions are in English (cheap models follow English instructions on
// Japanese text well); the glossary pins domain terms so the model does not
// need outside knowledge of the 住み込み/リゾートバイト domain.

export type ExtractionPromptInput = {
  title: string
  url: string
  rawText: string
}

// The output schema, written out explicitly so the model has an exact key
// list + enum tokens to fill in. Keep in sync with `JobExtraction` in
// src/types/extraction.ts (this list intentionally excludes the four
// server-set fields: schemaVersion, extractedAt, model, rawTextHash).
const OUTPUT_SCHEMA = `{
  "workplaceName": string|null,
  "agencyName": string|null,
  "listingId": string|null,
  "roleCategory": "front_desk_bell"|"room_attendant"|"restaurant_service"|"kitchen"|"cleaning_backyard"|"shop_sales"|"office_reservation"|"general_all"|"night_front"|"other"|null,
  "dutySummary": string|null,
  "employmentType": "haken"|"contract"|"fulltime"|"parttime_baito"|"shoukai"|"other"|null,
  "startTiming": string|null,
  "minDurationMonths": number|null,
  "durationNote": string|null,
  "extensionPossible": boolean|null,
  "requiredLanguages": [{"language": "ja"|"en"|"zh"|"ko"|"other", "note": string}],
  "requiredLicenses": string[],
  "requiredExperience": string|null,
  "foreignerSignals": string[],
  "wageType": "hourly"|"daily"|"monthly"|null,
  "wageMinJpy": number|null,
  "wageMaxJpy": number|null,
  "overtimeNote": string|null,
  "statedMonthlyIncomeJpy": number|null,
  "incomeExamples": [{"label": string, "minJpy": number, "maxJpy": number}],
  "dormFeeJpy": number|null,
  "dormFeeNote": string|null,
  "utilitiesFeeJpy": number|null,
  "utilitiesFeeNote": string|null,
  "mealsCostType": "free"|"paid"|"partial"|"not_provided"|null,
  "mealsCostNote": string|null,
  "travelReimbursement": "full"|"capped"|"none"|null,
  "travelReimbursementCapJpy": number|null,
  "travelReimbursementCondition": string|null,
  "payDay": string|null,
  "advancePayAvailable": boolean|null,
  "completionBonusNote": string|null,
  "housingType": "private_room"|"shared_room"|"none"|null,
  "housingWifi": boolean|null,
  "housingNote": string|null,
  "mealsProvidedNote": string|null,
  "prefecture": string|null,
  "cityArea": string|null,
  "areaName": string|null,
  "accessNote": string|null,
  "carAllowed": boolean|null,
  "onsenUse": boolean|null,
  "shiftType": "through"|"split"|"rotating"|null,
  "hoursNote": string|null,
  "nightWork": boolean|null,
  "overtimeEstimate": string|null,
  "holidaysPerMonthNote": string|null,
  "trainingSupport": boolean|null,
  "sourceRatingScore": number|null,
  "sourceRatingCount": number|null,
  "redFlags": string[],
  "evidence": { "<fieldName>": "<verbatim quote, up to 50 chars>", "...": "..." }
}`

/**
 * Build the extraction prompt for one job listing. Pure string building —
 * no truncation logic (design doc §5: all observed samples are ≤9 KB /
 * ~4k tokens; truncation is explicitly deferred as YAGNI for v1).
 */
export function buildExtractionPrompt(input: ExtractionPromptInput): string {
  const { title, url, rawText } = input

  return `You are a data extraction engine. Extract structured fields from a Japanese
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
TITLE: ${title}
URL: ${url}
BODY:
${rawText}

Return JSON with exactly these keys:
${OUTPUT_SCHEMA}`
}
