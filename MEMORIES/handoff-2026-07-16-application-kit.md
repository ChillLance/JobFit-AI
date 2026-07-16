# 2026-07-16 direct-application kit handoff

## Owner-authorized scope

The owner explicitly requested that the next slice be completed after Search
Mission: direct-application support for Japanese working-holiday listings.
This implements the narrow, human-reviewed Application Kit named in
ADR-2026-002. It does not create a resume file, auto-submit an application,
send email, or call a new AI provider.

## What shipped

- `src/lib/applicationKit/buildApplicationKit.ts`: pure, tested generator for
  a per-listing kit. Inputs are only the active structured Profile, optional
  active Search Mission, and structured listing extraction.
- `src/app/jobs/[id]/ApplicationKit.tsx`: a job-detail panel containing:
  - Japanese `志望動機` draft;
  - Japanese `本人希望欄` draft;
  - resume-focus guidance (what to emphasize, not a generated resume file);
  - a short Japanese question list for missing terms;
  - estimated monthly savings with itemized assumptions, kept out of the
    application text;
  - an inspectable fact pack and a constrained copy-ready prompt for optional
    external AI polishing.
- `src/app/jobs/[id]/page.tsx`: renders the panel after the active-Profile
  banner and before analysis actions.

## Guardrails implemented in code

- No raw resume is read or stored. The kit consumes only existing structured
  Profile fields.
- The deterministic Japanese draft uses neutral wording such as `強み` rather
  than claiming unverified work achievements.
- Missing facts remain omitted or become a confirm-before-submission warning.
- The optional polish prompt explicitly forbids adding experience, licences,
  visa information, dates, pay, or housing terms not present in the fact pack.
- Agency/staffing detection comes from structured extraction / listing text;
  for those listings, questions are labelled for the coordinator-match stage,
  not the first contact.
- Clipboard actions copy drafts only; no external request or submission exists.

## Verification on 2026-07-16

- `npm test -- --run`: 20 files, 115 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm run build -- --webpack`: passed.
- Added `src/lib/applicationKit/buildApplicationKit.test.ts` for missing-data,
  private-room, savings-null, fact-pack, and agency-stage behavior.

## Product follow-up, deliberately not built

1. Let a user edit and version a particular draft before copying it.
2. Add a permitted configured-provider action only after deciding which local
   profile facts may leave the device and how draft versions are retained.
3. Add real-user validation for whether the drafts save time and whether the
   question timing feels right for agency versus direct applications.
