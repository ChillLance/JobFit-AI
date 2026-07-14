# JobFit-AI Product Direction — Japan Working Holiday Job Copilot

> Research and product decision record, 2026-07-14.  
> Read together with `docs/JOB_DIRECTION_DISCOVERY_PROMPT_ZH.md` and
> `docs/REDESIGN.md`.

## 1. Executive decision

JobFit-AI should not compete as another generic AI resume builder, cover-letter
generator, job-board aggregator, or mass auto-apply tool.

The recommended initial wedge is:

> **A Traditional-Chinese working-holiday job decision and application copilot
> for live-in resort and hospitality work in Japan.**

Its core promise is:

> Turn any Japanese job listing into five practical answers: **Can I legally
> and realistically do it? How much can I actually save? What will daily life
> be like? What is missing or risky? How should I apply?**

Initial persona:

- Taiwanese or Hong Kong working-holiday participant.
- Japanese around JLPT N3–N5 or equivalent practical ability.
- Already in Japan or arriving within roughly 60 days.
- Looking for a 1–3 month live-in role, initially in resort/hospitality work.
- Comparing destinations such as Hokkaido, Nagano, Okinawa, and hot-spring areas.
- Cares about dormitory, meals, transport, start date, and savings—not only wage.

Tech/remote work remains a second search mode. It should not be mixed into the
first resort-baito MVP because the eligibility, sources, decision criteria, and
application workflow are different.

## 2. Market findings

### 2.1 Demand and timing

- Japan reported 2.571 million foreign workers in October 2025, up 11.7% year
  over year. The `Designated Activities` category, which includes working
  holiday and other statuses, grew 29.6%.
  [MHLW](https://www.mhlw.go.jp/stf/newpage_68794.html)
- Japan received 42.68 million international visitors in 2025, while the Japan
  Tourism Agency continues to describe accommodation-industry labour shortages
  as severe.
  [JNTO](https://www.jnto.go.jp/news/press/20260121_monthly.html),
  [Japan Tourism Agency](https://www.mlit.go.jp/kankocho/page06_00015.html)
- From February 2026, Taiwanese participants may use the Japan working-holiday
  programme up to twice, subject to the programme requirements.
  [Japan–Taiwan Exchange Association](https://www.koryu.or.jp/tw/visa/taipei/working/guide2026/)

These signals support a focused working-holiday product, but they do not prove
willingness to pay. The first milestone remains user validation, not a large
platform build.

### 2.2 Observed pain points

Japan's 2024 survey of employers using foreign workers reported these common
issues:

- Japanese communication: 43.9%.
- Visa/residence-status administration: 24.7%.
- Residence-period constraints: 21.5%.
- Cultural and lifestyle differences: 20.9%.

Among foreign workers who experienced employment difficulty, respondents also
reported expensive introduction fees, not knowing where to seek help, and the
actual Japanese requirement being higher than advertised.
[MHLW survey](https://www.mhlw.go.jp/stf/newpage_61317.html)

The resort-baito application process is also more complicated than a single
Apply button. Agencies may require registration, a resume/hearing sheet, a
phone or Zoom consultation, job and dormitory explanation, facility selection,
and travel/onboarding coordination. Some agencies disclose important details
only after registration.
[Dive flow](https://resortbaito-dive.com/columns/helpful-informations/details/to-start-resortbaito-flow),
[Goodman flow](https://www.resortbaito.com/flow/),
[Goodman FAQ](https://www.resortbaito.com/faq/)

### 2.3 What is already crowded

#### Generic resume tailoring and cover letters

Representative open-source projects already provide master-resume tailoring,
ATS/keyword matching, cover letters, PDF generation, job tracking, and local or
cloud LLM support:

- [career-ops](https://github.com/santifer/career-ops)
- [Resume Matcher](https://github.com/srbhr/resume-matcher)
- [Reactive Resume](https://github.com/amruthpillai/reactive-resume)
- [CoverLetterGPT](https://github.com/vincanger/coverlettergpt)

Commercial and Japan-focused services also cover large parts of this space:

- [YOLO JAPAN](https://www.yolo-japan.com/en/service/c/) offers a foreigner job
  board, automatic resume creation, applications, interview scheduling, and
  multilingual support.
- [履歴書AI](https://www.rirekisho.ai/features) generates motivation text,
  checks Japanese, imports information, exports PDF, and supports email delivery.
- [Yagish](https://rirekisho.yagish.jp/) and
  [Nihon Resume](https://nihonresume.com/ja) cover Japanese resume formats and
  AI-assisted writing.
- [Jobs in Japan](https://jobsinjapan.com/) includes resume and AI cover-letter
  functionality.

Conclusion: **resume generation is a feature, not a defensible product position.**

#### Foreigner-friendly job discovery

- [YOLO JAPAN](https://www.yolo-japan.com/en/service/c/) supports language,
  income, location, and foreigner-friendly job criteria.
- [Guidable Jobs](https://jobs.guidable.co/en) exposes `Designated Activities
  (Working Holiday)` as a first-class visa filter and supports low-Japanese jobs.
- [GaijinPot Jobs](https://jobs.gaijinpot.com/?lang=en) covers foreigner-oriented
  job search and resume creation.
- [TokyoDev](https://www.tokyodev.com/jobs),
  [Japan Dev](https://japan-dev.com/), and
  [G Talent](https://www.gtalent.jp/en/) serve foreign tech professionals.

Conclusion: JobFit-AI should not rebuild a generic job board.

#### Resort dispatch and live-in jobs

Agencies such as [Dive](https://resortbaito-dive.com/),
[Goodman](https://www.resortbaito.com/), and
[Alpha Resort](https://www.a-resort.jp/foreign-job) already have inventory,
coordinators, dormitory/meal information, and onboarding support.

Their weakness from a candidate perspective is fragmentation: each agency owns
its own inventory and process. Important conditions are difficult to compare
across services.

### 2.4 The open product space

No reviewed product was found that clearly combines this complete workflow:

1. Working-holiday status, expiry, and permitted-activity guardrails.
2. Cross-source job capture and normalization.
3. Dormitory, meals, utilities, transport, schedule, and contract comparison.
4. Estimated monthly take-home and savings.
5. Japanese application documents and contact messages.
6. Agency consultation, selection, interview, and response tracking.
7. Interview Japanese and arrival/onboarding preparation.

The defensible data model is therefore not just `resume + job description`. It
is:

> **Working-holiday rules + candidate availability + resort living conditions +
> application history + verified career facts.**

## 3. Product design

### 3.1 Core workflow

```text
Discover what kind of work fits this season of life
  → Create a working-holiday search profile
  → Capture any listing with the extension or paste
  → Normalize job, housing, food, schedule, and contract details
  → Apply hard eligibility gates
  → Compare estimated savings and living fit
  → Select a job
  → Generate a verified application package
  → Human review
  → Copy/send through the appropriate channel
  → Track consultation, interview, response, and arrival
```

### 3.2 Working-holiday profile

The current `JapanCareerProfile` is strong for general career matching but needs
a dedicated working-holiday/search-intent layer.

Recommended fields:

- `workStyle`: `resort-baito | local-baito | remote-tech | japan-career`.
- Visa/status type and user-confirmed designated activities.
- Visa expiry date.
- Earliest start date and latest end date.
- Current city and willingness/ability to relocate.
- Japanese level by task, not only JLPT: phone, customer service, reading rules,
  complaint handling, and interview.
- Target locations and seasons.
- Savings target.
- Dorm required, private/shared-room tolerance, Wi-Fi requirement.
- Meal requirements and dietary restrictions.
- Split-shift, night-shift, overtime, and weekly-hours tolerance.
- Preferred role families: front desk, hall, cleaning, kitchen support, lift,
  activity staff, etc.

The app must not infer legal permission from free text. It should ask the user to
confirm the status and designated-document facts, cite official sources, and
label results `eligible`, `needs confirmation`, or `not suitable`. It is a
guardrail and education tool, not legal advice.
[MOFA Working Holiday](https://www.mofa.go.jp/mofaj/toko/visa/working_h.html)

### 3.3 Resort job normalization

Extract and retain the source text plus structured fields:

- Wage, estimated working hours, days per week, and overtime.
- Contract start/end dates and minimum term.
- Dormitory availability, fee, utilities, room type, distance, Wi-Fi, bath,
  laundry, and deposit.
- Meals included, number per working/non-working day, and meal deductions.
- Transport reimbursement, cap, timing, and minimum-contract condition.
- Social insurance and other deductions.
- Pay closing date and payment date.
- Work pattern, including split shift (`中抜け`), early/late/night shift.
- Required Japanese level and actual customer-contact intensity.
- Agency, dispatch employer, worksite, and selection constraints.
- Missing facts and questions that must be confirmed.

Every extracted field should preserve:

- Source quote/location.
- Confidence.
- Whether it is explicit, inferred, or missing.

### 3.4 Decision model

Replace a single opaque Fit Score with four layers:

1. **Eligibility** — status, expiry, dates, and hard requirements.
2. **Financial fit** — estimated monthly earnings and savings with visible
   assumptions.
3. **Living fit** — dorm, meals, transport, location, privacy, and connectivity.
4. **Work fit** — role, language, schedule, strengths, risks, and growth.

Hard blockers appear before the numeric score. Missing information is not treated
as a positive or negative; it becomes a question.

Example output:

- Job A pays more per hour but has dorm and meal deductions.
- Job B pays less but provides a free private room, three meals, and transport,
  resulting in higher estimated savings.
- Job C cannot yet be compared because the split-shift schedule and transport
  reimbursement conditions are missing.

### 3.5 Application package

Maintain one factual experience bank and generate job-specific artifacts from it:

- Motivation (`志望動機`).
- Self-PR (`自己PR`).
- Working-holiday status and availability statement.
- Japanese email.
- Short LINE message.
- Phone opening script.
- Resume/hearing-sheet field mapping.
- Attachment checklist.
- Questions for the agency/employer.
- Interview practice questions.

Every generated claim should link back to a verified fact. The user should see a
diff and approve changes before export.

### 3.6 Automation policy

Recommended:

- Generate drafts.
- Pre-fill where permitted.
- Create a Gmail draft or copy-ready LINE message.
- Require human confirmation before submission or sending.
- Track which document/message version was used.
- Suggest follow-up after a configurable delay.
- Interpret replies and recommend the next action, without sending automatically.

Avoid:

- Mass auto-apply.
- Automatic LinkedIn outreach or scraping.
- Unattended scraping of resort-agency sites.
- Automatic legal conclusions.
- Sending claims not present in the factual experience bank.

The archived [AIHawk](https://github.com/feder-cr/jobs_applier_ai_agent_aihawk)
and other browser-automation projects illustrate the maintenance, CAPTCHA,
account, and wrong-answer risks of full auto-submit.

## 4. Finding work the user actually wants

The existing Profile Builder Prompt is a **structuring prompt**, not a discovery
prompt. It works when the user already knows their desired roles and preferences.
It is weak when the real question is: “What kind of work do I want now?”

Current limitations:

- It begins from resume/job-title data, so it anchors on past experience.
- It asks what the user wants instead of helping them discover it.
- It mixes survival needs, near-term bridge work, and long-term career goals.
- It does not test contradictions or force trade-offs.
- It can infer missing preferences, which creates false certainty.
- It outputs JSON immediately, before the user confirms the direction.
- It treats one profile as one answer even when two search lanes are appropriate.

The improved design uses two stages.

### Stage A — Direction discovery

Claude conducts a short interview based on evidence from real experiences. It
separates:

- What the user can do.
- What gives/takes energy.
- What the user needs during the next 1–3 months.
- What the user wants to become over 1–3 years.
- Non-negotiable constraints.
- Preferences that are still hypotheses.

It then proposes up to three job-direction hypotheses:

1. **Base lane** — quickest acceptable income/stability.
2. **Bridge lane** — uses present strengths while moving toward the future.
3. **Target lane** — longer-term role requiring evidence or skill building.

Each hypothesis includes example roles, reasons, risks, disqualifiers, Japanese
search keywords, and a low-cost experiment.

### Stage B — Profile export

Only after the user chooses or revises the hypotheses should Claude produce one
or more `JapanCareerProfile` objects.

The reusable discovery prompt is stored at:

`docs/JOB_DIRECTION_DISCOVERY_PROMPT_ZH.md`

## 5. Build order

### Validation before more infrastructure

1. Capture 20–30 real listings from at least three resort agencies/platforms.
2. Manually label the resort fields listed in §3.3.
3. Run the direction-discovery prompt with at least five target users.
4. Observe which facts are missing before they can choose or apply.
5. Test whether the comparison and application package materially reduce effort.

Suggested success evidence:

- Users can reject unsuitable jobs for an explicit reason rather than vague fit.
- Users can compare three listings in under ten minutes.
- Key extracted facts are correct or clearly marked uncertain.
- Users substantially edit fewer than half of the generated application claims.
- At least three users return to track a second job/application.

### Product slices

1. Working-holiday profile and availability.
2. Resort-job structured extraction.
3. Eligibility, estimated savings, and compare view.
4. Missing-information questions and Japanese contact drafts.
5. Verified experience bank and application package.
6. Human-confirmed Gmail/LINE/form assistance.
7. Reply/follow-up tracking and interview preparation.

Do not build auth, Supabase, a universal crawler, or unattended auto-send before
the first three slices are validated.

## 6. How this maps to the current codebase

Already reusable:

- Chrome Extension and manual capture.
- SQLite job/profile repositories.
- Multi-profile store.
- Local and provider analysis.
- Salary parsing and sorting.
- Application status tracking.
- Traditional Chinese, English, and Japanese UI copy.

Next domain changes:

- Add explicit search/work mode.
- Add availability and visa-expiry facts.
- Add structured resort-job fields.
- Add estimated savings with disclosed assumptions.
- Add hard-blocker and missing-fact results separate from Fit Score.
- Add versioned application artifacts and contact history.

Implementation note: salary parsing now exists in both the newer salary helper and
older local-analysis logic. Consolidate it into one canonical parser before using
salary for financial-fit decisions.

## 7. Later expansion

After the resort-baito wedge is validated, add a separate `remote-tech` or
`japan-career` mode for working-holiday participants who have development,
design, support, marketing, or operations experience.

That second mode can focus on:

- TokyoDev/Japan Dev/G Talent roles.
- Portfolio evidence and skill gaps.
- Japanese/English career documents.
- Sponsorship likelihood and timing.
- A transition plan from short-term income work to a sustainable Japan career.

The two modes can share the factual experience bank and application tracker, but
must retain different matching criteria and source strategies.
