# Handoff — extraction pipeline + local scoring (2026-07-14)

> For whichever agent (Codex or otherwise) picks up the next step. Written by
> Claude at the end of a session that shipped the P1 extraction pipeline and
> a P3-v1 slice ahead of P2. Read `docs/JOB_EXTRACTION_DESIGN.md` first — this
> file is "what changed and what's next", not the spec.

## What shipped today

1. **Extraction pipeline (P1 of the design doc)**: `src/types/extraction.ts`,
   `src/lib/extraction/{buildExtractionPrompt,parseExtraction}.ts`,
   `POST /api/jobs/[id]/extract`. Quote-grounded — ungrounded fields demote to
   `null` rather than being trusted. Gemini Flash, `temperature: 0`,
   `responseMimeType: 'application/json'`.
2. **Collect-endpoint upsert + URL normalization**: `src/app/api/collect/route.ts`
   upserts by `normalizeJobUrl()` (`src/lib/jobs/normalizeJobUrl.ts`) instead of
   raw string match — Indeed URLs carry per-visit tracking params (`tk`,
   `adid`, `xkcb`...) that defeated plain equality; normalization keeps only
   the stable `jk` param for Indeed and strips `utm_*`/`fbclid`/`gclid`
   elsewhere.
3. **One-click local analysis**: `POST /api/jobs/analyze-local-all` +
   dashboard button. Free (rule-based, no LLM), meant to run before spending
   Gemini quota — sort by score, send only the high scorers to real AI
   analysis.
4. **Savings estimate (pulled forward from P3)**: `src/lib/jobs/savings.ts`.
   Prefers the listing's own stated monthly income over a wage back-solve;
   **returns `null` whenever dorm fee is unknown** rather than guessing — the
   product principle (missing info → question, not a score) applies here too.
   Dashboard chip + `savings_desc` sort.
5. **`localAnalysis.ts` is now extraction-aware** (still fully backward
   compatible — no `extraction` on a job → identical behavior to before):
   dorm/meals/utilities-free → bonus (capped +10); 満了-conditioned transport
   reimbursement → flagged as a risk, not scored; license-required vs
   `workingHoliday.hasDriverLicense=false` → −15; split-shift vs low/avoid
   tolerance → −6; `minDurationMonths > availableMonths` → −15; meeting
   `targetMonthlySavingsJpy` → +4.
6. **`JapanCareerProfile.workingHoliday?`** (optional, additive — old
   profiles keep validating): `hasDriverLicense`, `splitShiftTolerance`,
   `availableMonths`, `availableFrom`, `targetMonthlySavingsJpy`,
   `privateRoomRequired`. The AI-import prompt (`profilePrompt.ts`, all 3
   languages) now interviews for these. **Check the active profile's
   `workingHoliday` block for the user's current real values** — don't
   hardcode assumptions about them here, they're user data and may change.

## Data state (as of 2026-07-14, ~16:00 JST)

- 26 real jobs collected (Indeed jp/com ×12, resortbaito.com ×9,
  resortbaito-dive.com ×5), 3+ sources per the ADR-2026-001 validation order.
- 16/26 have `extraction` populated. The other 10 are blocked on Gemini's
  **free-tier daily quota (20 requests/day)** — not a bug. Rerun
  `bash _tmp_batch.sh` from the project root once the quota resets
  (~16:00 JST / midnight Pacific) to finish them, then
  `POST /api/jobs/analyze-local-all` again to refresh scores with the newly
  extracted fields.
- One exact-duplicate job row still exists in the DB (predates the
  URL-normalization fix; the fix prevents new duplicates, it does not
  retroactively merge the old one). User declined to have it deleted
  programmatically — leave it alone unless the user asks again.
- `data/jobfit.sqlite.backup-*` — several timestamped backups exist from this
  session's batch-write operations. Normal; no action needed unless disk
  space becomes a concern.

## Loose ends / cleanup

- `_tmp_batch.sh` and `_tmp_stats.mjs` sit at the project root, untracked.
  `_tmp_batch.sh` still has a job to finish (see above) — don't delete it
  yet. Once the last 10 extractions are done, either delete both or, if
  they're worth keeping as dev tools, move them into `scripts/` and drop the
  `_tmp` prefix (they were named as session scratch files, not intended to
  be permanent).
- The plain `salary_desc`/`salary_asc` dashboard sort (`filterJobs.ts`) still
  goes through `getJobSalaryEstimate` only (wage back-solve), while
  `savings.ts` already prefers the site's own `statedMonthlyIncomeJpy` when
  present. These two are inconsistent on purpose (savings needed the more
  accurate figure; the plain salary sort was left alone to keep that change
  scoped) — worth deciding whether the salary sort should also prefer stated
  income, or whether "salary" and "savings" are meant to answer different
  questions and should stay as-is.
- Gemini gotcha, already fixed in two places (`extract/route.ts`,
  `analyze/deep/route.ts`): `gemini-3.5-flash` is a thinking model — thinking
  tokens count against `maxOutputTokens`, so `4096` truncates the JSON output
  before it finishes (`finishReason: 'MAX_TOKENS'`). Both fixed sites use
  `32768` and throw on `MAX_TOKENS`. **Apply the same fix to any new Gemini
  call site.**

## Next planned phase (P2, per design doc §10 — needs user review first, it's a taste decision)

- Job card redesign to surface extraction fields with provenance styling
  (explicit vs inferred vs missing — not just present/absent).
- Missing-info question chips — the field→question-id table is already
  designed in `docs/JOB_EXTRACTION_DESIGN.md` §7, not yet implemented.
- Batch "extract all" button (parallel to the one-click local-analysis
  button already shipped).
- `dutySummary`/`workplaceName` vs raw scraped `<title>` — the dashboard
  card heading still renders the raw scraped page `<title>` for real jobs
  (noisy: site name, listing ID, pipe separators). Now that `workplaceName`
  and `dutySummary` exist in `extraction`, the heading should prefer those
  when present, falling back to the raw title when extraction is missing.

## Where the rest of the context lives

- `docs/JOB_EXTRACTION_DESIGN.md` — full technical spec (schema, prompt,
  validation, phases).
- `MEMORIES/product-direction.md` / `MEMORIES/decisions/ADR-2026-001.md` —
  product wedge decision, four-layer model, validation order.
- `MEMORIES/index.md` — routing index, known tech debt.
