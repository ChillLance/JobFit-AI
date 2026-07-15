# Handoff — profile direction and decision UI (2026-07-14)

> Read `MEMORIES/product-direction.md` and
> `docs/JOB_EXTRACTION_DESIGN.md` first. This note records the implementation
> state after the product-direction and interface slice.

## What shipped in this working tree

1. **Two-stage profile entry.** `src/app/profiles/import/page.tsx` now starts
   in **Explore direction** mode, with a separate **Quick Profile** mode for a
   user who has already chosen a lane. Exploration only copies a discovery
   prompt; it deliberately does not offer JSON import until the user moves to
   Quick Profile.
2. **Direction-discovery prompts.** `src/lib/profile/profilePrompt.ts` adds
   Chinese, English, and Japanese prompts that interview from concrete
   experience, energy, constraints, near-term needs, and experiments. They
   produce up to three hypotheses: Base, Bridge, and Target. They do not export
   a profile JSON.
3. **Safer quick-profile prompts.** The existing JSON profile prompts now say
   not to infer facts, separate fact/statement/hypothesis, ask at most three
   questions per turn, and wait for an explicit confirmation before JSON-only
   output. The working-holiday schema also captures availability end/visa dates,
   accommodation, Wi-Fi, meals, seasons, Japanese task readiness, and chosen
   work-search mode.
4. **Profile type groundwork.** `src/lib/profile/types.ts` includes an
   optional `SearchIntent` shape (confirmed lane plus hypotheses,
   constraints, experiments, and version). Normal JSON profile import can
   preserve it if supplied. The direction prompt does not yet generate an
   importable `SearchIntent`; that is intentionally the next persistence slice.
5. **Decision-first job list.** `src/app/page.tsx` now excludes demo listings
   when real listings exist, prefers extracted workplace/role information over
   noisy scraped titles, and shows salary, housing, meals, shift, duration,
   estimated savings, missing-condition count, and a first red flag where
   available. Search and filter controls now have readable dark text on the
   washi background.
6. **Decision detail section.** `src/app/jobs/[id]/JobDetailUi.tsx` shows the
   extracted work/living fields and a localized "confirm before applying" list.
   It also clarifies that the active profile is not necessarily the historical
   profile used by an already-saved analysis.
7. **UI copy and prompt tests.** `src/lib/uiCopy.ts` has the new three-language
   copy. `src/lib/profile/profilePrompt.test.ts` protects the direction and
   confirmation rules.

## Verification completed

- `npm test` — 91 tests passed.
- `npm run lint` — passed.
- TypeScript no-emit check — passed.
- Browser check — confirmed the two profile modes, readable filter inputs,
  real-listing-only count, and an extracted job card with decision facts.

## Important current limits

- This is a **prompt-led** direction discovery flow, not an in-app guided
  interview. The user still copies the prompt to an external AI conversation
  and later pastes confirmed profile JSON back.
- `SearchIntent` is a typed data model, but there is no dedicated versioned UI,
  repository table, or direction-report importer yet. Do not describe it as
  fully implemented persistence.
- Only 16 of 26 real listings currently have structured extraction; the other
  10 wait for the Gemini free-tier quota. Unextracted cards intentionally show
  less information rather than fabricating it.
- Savings remain conservative: unknown housing cost produces no savings figure.
- The page now hides demos when real jobs exist, but it does not delete the
  pre-existing demo rows from SQLite.

## Recommended next slice

1. Finish the remaining ten extractions after quota reset, then rerun local
   analysis.
2. Implement one small, persistent **Search Intent** record per confirmed lane:
   direction report, hard constraints, open questions, experiment, version,
   timestamp, and profile link. Do not merge Base/Bridge/Target into one search
   profile.
3. Add field-specific missing-information questions from
   `docs/JOB_EXTRACTION_DESIGN.md` to the job detail page, with an answer box or
   application-note draft. Missing conditions should drive action, not lower a
   hidden score.
4. Store a profile snapshot/version with each analysis so historical results do
   not appear to have used today's active profile.
5. Validate with five Taiwan/Hong Kong working-holiday users before adding
   automatic outreach, bulk application, or a generic tech-job mode.

## Scope guardrails

- Keep job submission, email, and LINE messages human-confirmed.
- Do not treat missing data as a positive fit signal.
- Preserve Japanese listing text and distinguish explicit facts from unknowns.
- Keep resort/hospitality working holiday separate from later tech/remote modes.
