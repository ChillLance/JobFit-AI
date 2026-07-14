# Shared Product Direction Memory

## 2026-07-14 — Japan working-holiday validation wedge

### Status

Current working direction for validation, not proof of product-market fit. Test
with real users and real listings before expanding infrastructure or treating
the positioning as final.

### Product position

JobFit-AI should not lead as a generic resume generator, cover-letter generator,
job board, or mass auto-apply tool. Those categories already have strong open
source and commercial coverage.

The recommended initial wedge is a Traditional-Chinese job decision and
application copilot for Taiwanese and Hong Kong working-holiday participants
comparing live-in resort and hospitality work in Japan.

Core promise: turn a Japanese listing into practical answers about eligibility,
realistic savings, daily living conditions, missing or risky facts, and the next
application step.

Tech/remote work is a later, separate search mode. It must not share the first
MVP's eligibility rules, sources, decision criteria, or application workflow by
default.

### Product model

Evaluate a job in four explicit layers instead of hiding everything in one Fit
Score:

1. Eligibility: status, expiry, dates, and hard requirements.
2. Financial fit: earnings and estimated savings with visible assumptions.
3. Living fit: dormitory, meals, utilities, transport, privacy, location, and
   connectivity.
4. Work fit: role, Japanese demands, schedule, strengths, risks, and growth.

Show hard blockers first. Treat missing information as a question, not as a
positive or negative score. Preserve the listing's source text, extraction
confidence, and whether each field is explicit, inferred, or missing.

### Finding work the user actually wants

The existing profile builder structures known facts; it should not be asked to
discover a career direction and export JSON in the same step.

Use a two-stage flow:

1. Direction discovery: interview from concrete experiences, energy, near-term
   needs, long-term aims, constraints, contradictions, and small experiments.
   Produce at most three hypotheses: Base (acceptable stability), Bridge
   (current strengths plus forward movement), and Target (longer-term direction
   that still needs evidence).
2. Profile export: only after the user confirms or revises a hypothesis, create
   one or more `JapanCareerProfile` objects. Do not combine conflicting search
   lanes into one profile or convert untested hypotheses into strengths.

The reusable interview is in
`docs/JOB_DIRECTION_DISCOVERY_PROMPT_ZH.md`. A future product implementation
should store the reasoning and experiments as a versioned `SearchIntent`, while
the profile stores the currently chosen search criteria.

### Automation guardrails

- Generate, pre-fill, compare, and create drafts where permitted.
- Require human review before sending or submitting anything.
- Every generated claim must trace to a verified experience fact.
- Do not mass auto-apply, scrape sites unattended, infer legal permission, or
  auto-send email/LINE messages.
- Explain visa/status uncertainty with official sources and use `eligible`,
  `needs confirmation`, or `not suitable`; do not present legal advice.

### Validation order

1. Capture 20–30 real listings from at least three sources and manually label
   resort-specific fields.
2. Run the direction-discovery interview with at least five target users.
3. Observe which missing facts block comparison or application.
4. Validate the working-holiday profile, structured extraction, and
   eligibility/savings comparison before auth, cloud sync, universal crawling,
   resume generation, or unattended sending.

### Detailed evidence

See `docs/PRODUCT_DIRECTION_2026-07.md` for market research, source links,
competitive examples, domain fields, build order, and mapping to the current
codebase.
