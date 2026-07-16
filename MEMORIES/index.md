# Memory Index

Short routing index only. Read the relevant linked file; do not inline full
history here.

## Active decisions

- [ADR-2026-001](decisions/ADR-2026-001.md): use a Japan working-holiday
  resort/hospitality decision-and-application copilot as the current validation
  wedge; keep submission human-confirmed.
- [ADR-2026-002](decisions/ADR-2026-002.md): 2026-07-16 first-principles
  review — feature freeze until real-user validation; work order = portfolio
  demo → 3-5-user validation; next feature slice = per-listing "application
  kit" (amends the resume-tailoring clause of ADR-2026-001 based on user #0
  evidence).
- [ADR-2026-003](decisions/ADR-2026-003.md): 2026-07-16 replaces the fixed
  Base/Bridge/Target direction-discovery flow with a time-bound Search
  Mission (`src/lib/missions/`); supersedes `docs/JOB_DIRECTION_DISCOVERY_PROMPT_ZH.md`
  and the now-removed `SearchIntent` type / `DIRECTION_DISCOVERY_PROMPTS`.

## Validation evidence

- [User #0 retrospective — Hokkaido search, 2026-07](user0-retrospective-2026-07.md):
  the only complete real user journey so far. JobFit was "used but not
  decisive"; why, and what would have been decisive (application tailoring,
  questions-to-ask, reputation intel).

## Shared product and prompt memory

- [Japan working-holiday product direction](product-direction.md): target user,
  product promise, decision model, job-direction discovery design, validation
  order, and scope guardrails as of 2026-07-14.

## Handoff notes (read first if picking up mid-stream)

- [2026-07-14 extraction pipeline + local scoring handoff](handoff-2026-07-14-extraction-pipeline.md):
  what shipped, current data state (16/26 real jobs extracted, 10 blocked on
  Gemini daily quota), loose ends, and the next planned phase.
- [2026-07-14 profile direction + decision UI handoff](handoff-2026-07-14-profile-direction-and-decision-ui.md):
  the implemented two-stage profile flow, decision-first job UI, verification,
  remaining product gaps, and the recommended next slice.
- [2026-07-16 Search Mission handoff](handoff-2026-07-16-search-mission.md):
  the owner-approved time-bound search-purpose correction, Mission data/UI,
  transparent decision rules, verification, and the next constrained slice.
- [2026-07-16 direct-application kit handoff](handoff-2026-07-16-application-kit.md):
  the owner-authorized Japanese direct-application drafts, fact guardrails,
  verification, and intentionally deferred follow-up work.

## Detailed source documents

- [Product research and design](../docs/PRODUCT_DIRECTION_2026-07.md)
- [Job field extraction design v1 (rawText → structured fields)](../docs/JOB_EXTRACTION_DESIGN.md)
- [Reusable job-direction discovery prompt](../docs/JOB_DIRECTION_DISCOVERY_PROMPT_ZH.md)
  — **superseded 2026-07-16 by ADR-2026-003** (Search Mission); kept for
  history only, do not implement or hand to a user from this file.
- [Current architecture](../docs/ARCHITECTURE.md)
- [Longer-term redesign history](../docs/REDESIGN.md)

## Known technical debt / gotchas

- Salary parsing exists in both the newer salary helper and older local-analysis
  logic. Consolidate it into one canonical parser before using salary values for
  financial-fit or estimated-savings decisions.
- `docs/CURRENT_CONTEXT.md` contains historical storage descriptions. SQLite via
  the repositories named in `AGENTS.md` is the current source of truth.
