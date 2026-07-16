# 2026-07-16 Search Mission handoff

## Why this narrow slice was built

The owner explicitly approved a correction to the old profile-direction flow:
the first question must be what this job-search period is for, rather than a
fixed career-direction label. This is a bounded onboarding and decision-view
slice, not a reversal of the validation-first product plan in ADR-2026-002.

User #0 input behind the shape:

- Stable profile facts are normally entered once with Yagish/JIS-style resume
  material; per-listing tailoring belongs to a later application-kit slice.
- A search period can be life-experience led first, Japanese/career growth
  second, and several possible directions may coexist.
- Seasonal and regional experiences matter (for example winter skiing), so
  they cannot be safely collapsed into a permanent profile preference.
- Job source does not identify the relationship: Indeed can contain agencies.
  The product should infer agency/staffing only from structured listing
  evidence and otherwise show it as unknown.

## What shipped

- `src/lib/missions/`: local-only `SearchMission` schema/store, safe AI JSON
  normalization, human-readable rules, localized copy, and unit tests.
- `/missions`: create, edit, activate, delete, and paste AI-produced Mission
  JSON. JSON only opens an editable draft; nothing changes decisions until the
  owner saves it.
- `/profiles/import`: Explore mode now uses `SEARCH_MISSION_DISCOVERY_PROMPTS`.
  The prompt distinguishes stable Profile facts from a time-bound Mission,
  asks only the needed questions, supports 1-3 concurrent missions, and gives
  a constrained JSON shape only after explicit confirmation.
- `/` and `/jobs/[id]`: show a transparent Mission outcome beside the existing
  Fit Score. Outcomes are `Worth applying`, `Confirm before applying`, or
  `Not recommended`; free text is never silently converted into a score.
- Agency detection uses extracted agency/employment evidence or explicit raw
  listing language. It does not classify based on source site.

## Decision-rule guardrails

- A missing hard condition is `Confirm`, not a negative guess.
- Explicit blockers are limited to structured constraints: income, dorm fee,
  private room, live-in housing, shift/night-work acceptance, and maximum
  duration.
- Region and user-confirmed listing keywords provide visible positive context;
  they do not outweigh an explicit blocker.
- Existing Fit Score is preserved and never recalculated by Mission logic.

## Verification on 2026-07-16

- `npm test -- --run`: 19 files, 113 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm run build -- --webpack`: passed.
- Browser smoke test: Traditional Chinese Mission page rendered; create/save
  created an active Mission with the expected priorities. A temporary local
  verification record was then removed.

## Next suggested slice (not started)

Build the human-reviewed application kit only for direct/Indeed-style
applications first: listing-specific motivation and preferred-conditions
drafts, evidence-limited to confirmed Profile facts. Keep agency interview
questions stage-aware; do not surface them at initial discovery.
