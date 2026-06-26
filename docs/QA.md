# JobFit-AI QA Checklist

This document provides a manual QA checklist for validating JobFit-AI before demo, portfolio review, or deployment.

JobFit-AI is a profile-driven AI job-fit analysis tool for the Japanese job market. The most important behavior to verify is that job analysis changes based on the active `JapanCareerProfile`.

---

## 1. Basic App Smoke Test

### Goal

Confirm that the app starts and core pages load.

### Checklist

- [ ] `npm install` completes successfully
- [ ] `npm run dev` starts the development server
- [ ] Home page (`/`) loads without runtime errors (dashboard and job list)
- [ ] Job detail page (`/jobs/[id]`) loads for an existing job
- [ ] Profiles page (`/profiles`) loads
- [ ] Profile import page (`/profiles/import`) loads
- [ ] Browser console has no critical errors

---

## 2. TypeScript and Build Checks

Run:

```bash
npx tsc --noEmit
```

Expected result:

- [ ] No TypeScript errors

If lint is configured, run:

```bash
npm run lint
```

Expected result:

- [ ] No lint errors or only acceptable warnings

(`lint` runs `eslint` per `package.json`.)

If production build is configured, run:

```bash
npm run build
```

Expected result:

- [ ] Build completes successfully

Optional production server smoke test:

```bash
npm run start
```

---

## 3. Profile Management QA

### Goal

Verify that users can create, view, switch, and persist career profiles.

### Checklist

- [ ] Profiles page displays existing profiles
- [ ] Default profile exists or app handles empty profile state gracefully
- [ ] User can create or import a new profile
- [ ] User can set a profile as active
- [ ] Active profile indicator updates correctly
- [ ] Active profile persists after page refresh (`localStorage`)
- [ ] Multiple profiles can exist at the same time
- [ ] Deleting or editing a profile does not break the active profile state
- [ ] App handles missing active profile gracefully

---

## 4. External AI Profile Import QA

### Goal

Verify the external AI profile import workflow.

### Checklist

- [ ] Profile import page shows the Profile Builder Prompt (`PROFILE_BUILDER_PROMPT_ZH`)
- [ ] Copy prompt button works
- [ ] Prompt asks the external AI to return valid profile JSON
- [ ] User can paste a valid `JapanCareerProfile` JSON
- [ ] Valid JSON imports successfully
- [ ] Imported profile appears in the profile list
- [ ] Imported profile can be set as active
- [ ] Invalid JSON shows a clear error
- [ ] JSON with missing required fields is rejected or handled safely
- [ ] Import does not overwrite unrelated existing profiles unexpectedly

---

## 5. Job Collection / Job Input QA

### Goal

Verify that job postings can be added or collected.

### Checklist

- [ ] User can add or collect a job posting through the current supported workflow (`POST /api/collect` — e.g. Chrome Extension or manual HTTP client)
- [ ] Job title is stored correctly
- [ ] Company name is stored correctly if available
- [ ] Location is stored correctly if available
- [ ] Employment type is stored correctly if available
- [ ] Salary information is stored correctly if available
- [ ] Original job description is preserved (`rawText` / structured fields when present)
- [ ] Source URL is stored if supported
- [ ] Job appears on the home dashboard (`/`)
- [ ] Job can be opened on the detail page (`/jobs/[id]`)
- [ ] App handles incomplete job data gracefully

---

## 6. Profile-driven Analysis QA

### Goal

Verify that analysis uses the active profile.

This is the most important QA area.

### Checklist

- [ ] Select Profile A as active
- [ ] Open a job detail page
- [ ] Run or view analysis (local and/or AI providers as configured)
- [ ] Confirm result references Profile A's conditions
- [ ] Switch active profile to Profile B
- [ ] Re-run analysis for the same job (profile is sent with analyze requests; refresh alone may show stored results from the previous run)
- [ ] Confirm result changes based on Profile B
- [ ] Fit score or recommendation changes when profile conditions differ significantly
- [ ] Deal breakers from active profile affect the result
- [ ] Desired locations from active profile affect the result
- [ ] Desired roles from active profile affect the result
- [ ] Visa support need affects the result if relevant
- [ ] Work style preferences affect the result if relevant

---

## 7. Local Analysis QA

### Goal

Verify local rule-based analysis behavior.

### Checklist

- [ ] Local analysis runs without API keys (`POST /api/jobs/[id]/analyze`)
- [ ] Location matching works
- [ ] Role matching works
- [ ] Employment type matching works
- [ ] Salary expectation check works if implemented
- [ ] Japanese level check works if implemented
- [ ] Visa support risk is detected if implemented
- [ ] Night shift risk is detected
- [ ] Transfer risk is detected
- [ ] Deal breakers reduce the recommendation appropriately
- [ ] Local result is displayed in the job detail UI (Analyze Fit panel)

---

## 8. Gemini / Groq Analysis QA

### Goal

Verify AI provider integrations if API keys are configured.

### Checklist

- [ ] Environment variables are set correctly in `.env.local` (see [DEPLOYMENT.md](./DEPLOYMENT.md))
- [ ] Gemini API route works if configured (`POST /api/jobs/[id]/analyze/deep`, `GEMINI_API_KEY`)
- [ ] Groq API route works if configured (`POST /api/jobs/[id]/analyze/groq`, `GROQ_API_KEY`, optional `GROQ_MODEL`)
- [ ] API errors are handled gracefully
- [ ] Missing API keys do not crash the app
- [ ] Provider timeout or failure does not break the entire detail page
- [ ] AI analysis includes active profile context
- [ ] AI result is displayed in a readable format
- [ ] Raw/debug output is hidden or collapsed if appropriate

---

## 9. Model Comparison QA

### Goal

Verify that multiple analysis outputs are compared clearly.

### Checklist

- [ ] Local result appears if available
- [ ] Gemini result appears if available
- [ ] Groq result appears if available
- [ ] Consensus or comparison summary appears (模型比較 tab / `buildAnalysisComparison`)
- [ ] Disagreement between models is understandable
- [ ] Final recommendation is easy to find
- [ ] Risk summary is easy to understand
- [ ] Missing provider results are handled gracefully

---

## 10. Dashboard QA

### Goal

Verify that the home dashboard supports job comparison and tracking.

### Checklist

- [ ] Home page (`/`) loads without errors
- [ ] Job cards or rows display clearly
- [ ] Job status is visible (badges; filter tabs: 未投遞 / 已投遞 / 面試中 / 不感興趣)
- [ ] Fit score or recommendation is visible if available
- [ ] Search works (title, company, location, source, URL, raw text)
- [ ] Filters work (status, score, risk)
- [ ] Sorting works
- [ ] Stats cards show reasonable numbers (`DashboardStatsCards`)
- [ ] Empty state is clear
- [ ] Clicking a job opens the detail page

---

## 11. Job Detail Page QA

### Goal

Verify the conclusion-first layout.

### Checklist

- [ ] Job title is visible
- [ ] Company and location are visible if available
- [ ] Active profile context is visible (`ActiveProfileBanner`)
- [ ] Final recommendation is easy to find (Analyze Fit panel)
- [ ] Fit score is visible if available
- [ ] Key reasons are visible
- [ ] Risks or concerns are visible
- [ ] Suggested actions are visible if implemented
- [ ] Model comparison is visible if implemented
- [ ] Job overview is readable
- [ ] Original job posting is preserved (collapsed `<details>` by default)
- [ ] Long raw text is collapsed or visually de-emphasized
- [ ] Page works on smaller screen sizes

---

## 12. Persistence QA

### Goal

Verify local persistence behavior.

### Checklist

- [ ] Profiles persist after page refresh (`localStorage`)
- [ ] Active profile persists after page refresh
- [ ] Jobs persist after page refresh when the same Next.js server process and `jobs_temp.json` file are used
- [ ] Analysis results persist on the job record in `jobs_temp.json` after successful analyze API calls
- [ ] Clearing browser storage resets profile data as expected
- [ ] App handles empty `localStorage` gracefully
- [ ] App handles malformed `localStorage` gracefully if possible

---

## 13. Error Handling QA

### Checklist

- [ ] Invalid profile JSON shows a clear error
- [ ] Missing API keys show a clear error or fallback
- [ ] Failed AI request does not crash the page
- [ ] Empty job description is handled gracefully
- [ ] Missing active profile is handled gracefully
- [ ] Malformed job data does not crash the dashboard
- [ ] Network failure is handled gracefully

---

## 14. Manual Demo Script

Use this script when presenting the project.

### Demo Flow

1. Open the home dashboard (`/`)
2. Show existing job postings or add a new Japanese job posting via `POST /api/collect`
3. Open the profiles page (`/profiles`)
4. Show multiple career profiles
5. Set one profile as active
6. Open a job detail page (`/jobs/[id]`)
7. Show the fit result and recommendation
8. Return to profiles and switch active profile
9. Re-run analysis for the same job
10. Explain how the result changes based on the profile
11. Show external AI profile import workflow (`/profiles/import`)
12. Explain privacy-friendly profile generation
13. Show architecture diagram in [ARCHITECTURE.md](./ARCHITECTURE.md) or README

### Key Talking Points

- The app is profile-driven, not just keyword-driven.
- It distinguishes "Can I do this job?" from "Should I apply?"
- The active career profile is the decision baseline.
- The app is useful for foreign job seekers navigating Japanese job postings.
- External AI import avoids storing raw resumes inside the app.
- The architecture can grow into a more production-ready system later.

---

## 15. Pre-commit Checklist

Before committing:

```bash
git status
npx tsc --noEmit
npm run lint
```

If build is configured:

```bash
npm run build
```

Checklist:

- [ ] Only intended files changed
- [ ] README/docs are accurate
- [ ] TypeScript passes
- [ ] Lint passes or warnings are acceptable
- [ ] App runs locally
- [ ] No secret keys committed
- [ ] `.env.local` is not committed
- [ ] Screenshots or generated files are intentional

---

## 16. Known Limitations to Mention

For portfolio honesty, mention:

- This is an MVP, not a production job platform.
- Profiles are stored in the browser (`localStorage`); jobs and analysis outputs are stored in `jobs_temp.json` on the server running Next.js.
- AI recommendations are decision support, not final truth.
- API provider output can vary.
- No login/cloud sync unless explicitly implemented.
- No built-in resume upload unless explicitly implemented.
- Chrome Extension source is not in this repository (only the collect API contract).
- Demo data may be deferred.

---

## 17. Final Acceptance Criteria

The project is ready for portfolio review when:

- [ ] README is complete
- [ ] Architecture documentation exists ([ARCHITECTURE.md](./ARCHITECTURE.md))
- [ ] QA checklist exists (this document)
- [ ] Deployment notes exist ([DEPLOYMENT.md](./DEPLOYMENT.md))
- [ ] App runs locally
- [ ] TypeScript check passes
- [ ] At least one job can be analyzed
- [ ] At least two profiles can be used
- [ ] Switching active profile affects analysis behavior
- [ ] External AI profile import workflow is demonstrable
- [ ] No obvious runtime errors during demo
