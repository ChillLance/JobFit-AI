# Memory Index

Short routing index only. Read the relevant linked file; do not inline full
history here.

## Active decisions

- [ADR-2026-001](decisions/ADR-2026-001.md): use a Japan working-holiday
  resort/hospitality decision-and-application copilot as the current validation
  wedge; keep submission human-confirmed.

## Shared product and prompt memory

- [Japan working-holiday product direction](product-direction.md): target user,
  product promise, decision model, job-direction discovery design, validation
  order, and scope guardrails as of 2026-07-14.

## Handoff notes (read first if picking up mid-stream)

- [2026-07-14 extraction pipeline + local scoring handoff](handoff-2026-07-14-extraction-pipeline.md):
  what shipped, current data state (16/26 real jobs extracted, 10 blocked on
  Gemini daily quota), loose ends, and the next planned phase.

## Detailed source documents

- [Product research and design](../docs/PRODUCT_DIRECTION_2026-07.md)
- [Job field extraction design v1 (rawText → structured fields)](../docs/JOB_EXTRACTION_DESIGN.md)
- [Reusable job-direction discovery prompt](../docs/JOB_DIRECTION_DISCOVERY_PROMPT_ZH.md)
- [Current architecture](../docs/ARCHITECTURE.md)
- [Longer-term redesign history](../docs/REDESIGN.md)

## Known technical debt / gotchas

- Salary parsing exists in both the newer salary helper and older local-analysis
  logic. Consolidate it into one canonical parser before using salary values for
  financial-fit or estimated-savings decisions.
- `docs/CURRENT_CONTEXT.md` contains historical storage descriptions. SQLite via
  the repositories named in `AGENTS.md` is the current source of truth.
