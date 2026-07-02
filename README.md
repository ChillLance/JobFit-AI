# JobFit-AI

**JobFit-AI** is a profile-driven AI job-fit analysis tool for job seekers targeting the Japanese job market.

It helps users evaluate whether a Japanese job posting fits their actual career profile, work preferences, visa needs, language level, lifestyle constraints, and long-term direction.

The core idea is simple:

> JobFit-AI does not only ask: **"Can I do this job?"**  
> It also asks: **"Should I apply for this job based on my profile?"**

---

## Overview

Japanese job postings often contain important details hidden in long descriptions, such as:

- Employment type
- Salary range
- Japanese language requirements
- Visa support
- Overtime expectations
- Shift work
- Night shifts
- Job transfers
- Location constraints
- Work style
- Career growth risks

For job seekers, especially foreign job seekers in Japan, these conditions can significantly affect whether a job is truly a good fit.

JobFit-AI analyzes job postings against an active **Japan Career Profile** and provides:

- Fit score
- Final recommendation (model comparison consensus when multiple analyses exist)
- Key reasons, strengths, and gaps
- Risks and concerns
- Suggested checks and actions
- Model comparison across local and AI-based analysis

---

## Why I Built This

Many job-search tools focus on matching keywords between resumes and job descriptions.

However, real job decisions are more complex.

A role may match someone's past experience but still be a poor choice because of:

- Unwanted night shifts
- Required relocation
- Lack of visa support
- Low salary floor
- Misalignment with future career goals
- A job type the user can do but no longer wants to pursue

JobFit-AI is designed to support a more realistic decision-making process.

It separates:

```text
Can I do this job?
```

from:

```text
Should I apply for this job?
```

This makes the tool especially useful for career transition, foreign job seekers in Japan, and people comparing different future directions.

---

## Key Features

### Profile-driven Job Analysis

JobFit-AI uses an active `JapanCareerProfile` as the decision baseline for analysis.

A profile can include:

- Desired roles
- Desired locations
- Preferred industries
- Employment type preferences
- Minimum salary expectations
- Japanese and English level
- Visa support needs
- Overtime tolerance
- Shift work tolerance
- Night shift tolerance
- Transfer tolerance
- Remote/hybrid preference
- Values
- Deal breakers
- Risks to avoid
- Strengths
- Transferable skills
- Career goals and future vision

---

### Multiple Career Profiles

Users can manage multiple career profiles for different job-search scenarios.

Example profiles:

- Fukuoka hospitality direction
- Tokyo IT support direction
- Remote bilingual operations direction
- Career-change profile
- Short-term survival job profile
- Long-term career-growth profile

This allows the same job posting to be evaluated differently depending on the selected active profile.

Profiles are stored in the browser via `localStorage` (`/profiles`). A reference seed file `user_profile.json` exists at the project root for development defaults.

---

### External AI Profile Import

JobFit-AI does not require users to upload raw resumes directly into the app.

Instead, it provides a structured external AI prompt (`PROFILE_BUILDER_PROMPT_ZH` on `/profiles/import`). Users can copy the prompt into their own AI assistant, such as:

- ChatGPT
- Gemini
- Claude
- Other LLM tools

Then they can provide their resume, 職務経歴書, portfolio, self-introduction, desired conditions, and future goals to that AI tool.

The AI generates a structured `JapanCareerProfile` JSON, which can then be imported into JobFit-AI.

This workflow is:

- Privacy-friendly
- Model-agnostic
- Easy to customize
- Suitable for sensitive career documents
- Focused on decision support rather than resume storage

---

### Local and AI-based Analysis

JobFit-AI supports multiple analysis paths:

- **Local** rule-based analysis — `POST /api/jobs/[id]/analyze` (no API key; uses active profile from request body)
- **Gemini** deep analysis — `POST /api/jobs/[id]/analyze/deep` (requires `GEMINI_API_KEY`)
- **Groq** deep analysis — `POST /api/jobs/[id]/analyze/groq` (requires `GROQ_API_KEY`)
- **Model comparison** — read-only consolidation of stored results (no extra AI calls)
- **Final recommendation summary** — consensus view in the 「模型比較」 tab

The local analyzer provides deterministic matching based on the active profile and job posting.

AI-based analyzers provide reasoning over longer job descriptions and nuanced career risks, using a shared compact digest input pipeline.

---

### Dashboard and Job Tracking

The home page (`/`) provides a portfolio-style view of collected job postings:

- Dashboard stats cards (totals, high match, applied, interviewing, average score, risky jobs)
- Job list with search (title, company, location, source, URL, raw text)
- Status filter tabs (未投遞 / 已投遞 / 面試中 / 不感興趣)
- Score and risk filters, plus sort options
- Fit score and level display on cards
- Application status badges
- Source and collected date

Jobs are loaded from `GET /api/jobs` and persisted in `jobs_temp.json` on the server.

---

### Conclusion-first Job Detail Page

The job detail page (`/jobs/[id]`) prioritizes decision-making.

Layout order:

1. Job title header and application status
2. Active profile banner
3. **Analyze Fit panel** — final recommendation, scores, reasons, risks, per-provider tabs, and model comparison
4. Status selector
5. Job overview (structured fields when present)
6. **Original job posting** — collapsed by default (`<details>`)

Long original postings and per-provider debug details are de-emphasized relative to the analysis summary.

---

## Core Workflow

```text
1. Create or import a Japan Career Profile (/profiles, /profiles/import)
2. Set it as the active profile
3. Add a job posting (POST /api/collect — e.g. via Chrome Extension or any HTTP client)
4. Open the job on the detail page and run job-fit analysis (local / Gemini / Groq)
5. Review score, recommendation, reasons, risks, and suggested actions
6. Update application status; use the dashboard to search, filter, and compare jobs
7. Switch profiles and re-analyze if needed
```

---

## Profile-driven Architecture

The active profile is the core decision baseline.

```text
Active JapanCareerProfile
        ↓
Japanese Job Posting
        ↓
Local / Gemini / Groq Analysis
        ↓
Model Comparison (stored results only)
        ↓
Final Recommendation (consensus)
```

The purpose of this architecture is to avoid hard-coded assumptions about the user.

Instead of analyzing jobs generically, JobFit-AI evaluates each job against the user's current profile:

```text
Profile + Job Posting = Context-aware Fit Decision
```

---

## External AI Profile Import Workflow

JobFit-AI uses an external AI workflow for profile creation.

```text
1. Open /profiles/import
2. Copy the Profile Builder Prompt (Traditional Chinese)
3. Paste it into an external AI assistant
4. Provide resume / 職務経歴書 / portfolio / goals to that AI
5. Ask the AI to generate JapanCareerProfile JSON (version: japan_career_profile_v1)
6. Paste the JSON back into JobFit-AI
7. Import it as a new profile
8. Set it as the active profile on /profiles
```

This avoids requiring JobFit-AI to store raw resume data while still enabling deep profile generation.

---

## Multi-model Analysis

JobFit-AI can compare different analysis sources after they have been run and saved on the job record.

### Local Analysis

The local analyzer uses structured matching rules such as:

- Location match
- Role match
- Keyword match
- Employment type match
- Salary expectation
- Japanese level
- Visa support
- Night shift risk
- Shift work risk
- Transfer risk
- Deal breaker detection

### Gemini / Groq Analysis

AI-based analysis is used for deeper reasoning, such as:

- Interpreting long job descriptions
- Detecting hidden risks
- Explaining trade-offs
- Summarizing recommendation reasoning
- Distinguishing ability fit from career-direction fit

### Fit levels and final recommendation

**Per-provider fit levels** (from normalized scores): `excellent`, `good`, `fair`, `poor`, `unknown`.

**Model-comparison consensus** (when enough stored analyses exist): `strong_apply`, `apply_with_checks`, `consider`, `not_priority`, `insufficient`.

The UI presents these with Traditional Chinese labels in `AnalyzeFitPanel`.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript |
| Job storage | `jobs_temp.json` (server-side `fs`) |
| Profile storage | Browser `localStorage` |
| Optional AI | Gemini API, Groq API (server routes only) |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Add keys for the providers you plan to use:

```env
# From .env.example
GEMINI_API_KEY=
ANALYZE_MODE=local

# Required for Groq route (add to .env.local; not in .env.example yet)
GROQ_API_KEY=

# Optional Groq model override (defaults to llama-3.3-70b-versatile)
GROQ_MODEL=
```

| Variable | Required for | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | Gemini deep analysis | Server-side only. |
| `GROQ_API_KEY` | Groq analysis | Server-side only. |
| `GROQ_MODEL` | Groq (optional) | Overrides default model. |
| `ANALYZE_MODE` | — | Defined in `.env.example`; read by `src/lib/aiConfig.ts` but providers are selected explicitly in the UI today. |

Local analysis works without any API keys.

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Primary UI copy is Traditional Chinese.

### 4. Run TypeScript check

```bash
npx tsc --noEmit
```

### 5. Lint

```bash
npm run lint
```

(`lint` runs `eslint` per `package.json`.)

### Other npm scripts

| Script | Command |
| --- | --- |
| `build` | `next build` |
| `start` | `next start` (after build) |

---

## Collecting Jobs

Jobs are created when a client sends:

```http
POST /api/collect
Content-Type: application/json

{ "title": "...", "url": "...", "rawText": "..." }
```

The companion **Chrome Extension (JobFlow Collector)** lives in [`extension/`](extension/): open any job posting page, click the toolbar button, and it POSTs the page title / URL / text to the local app. Load it via `chrome://extensions` → Developer mode → "Load unpacked" → select the `extension/` folder. Any HTTP client with the same payload also works.

Refresh the home page after collecting to load jobs via `GET /api/jobs`.

---

## API Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/collect` | Append job to `jobs_temp.json` |
| `GET` | `/api/jobs` | List jobs (home page) |
| `DELETE` | `/api/jobs/[id]` | Delete job |
| `PATCH` | `/api/jobs/[id]/status` | Update application status |
| `POST` | `/api/jobs/[id]/analyze` | Local profile-driven analysis (writes `localAnalysis`) |
| `POST` | `/api/jobs/[id]/analyze/deep` | Gemini analysis (writes `deepAnalysis`) |
| `POST` | `/api/jobs/[id]/analyze/groq` | Groq analysis (writes `groqAnalysis`) |
| `POST` | `/api/jobs/[id]/analyze/openrouter` | OpenRouter analysis — any model via one gateway (writes `openrouterAnalysis`; needs `OPENROUTER_API_KEY`) |

All routes go through `src/lib/jobs/jobsRepository.ts`; job detail reads it on
the server (no `GET /api/jobs/[id]`). The legacy `POST /api/jobs/[id]/score`
mock route and its `ScorePanel` were removed (the detail UI uses the Analyze
Fit panel); old `aiScore` data is still read as a back-compat fallback.

---

## Project Structure

```text
JobFit-AI/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CURRENT_CONTEXT.md
│   ├── DEPLOYMENT.md
│   ├── QA.md
│   └── TASKS.md
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── collect/route.ts
│   │   │   └── jobs/…              # list, delete, status, score, analyze/*
│   │   ├── jobs/[id]/              # Detail page, AnalyzeFitPanel, StatusSelect, …
│   │   ├── profiles/               # Profile management
│   │   ├── profiles/import/        # External AI profile import
│   │   ├── page.tsx                # Home dashboard
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/jobs/            # e.g. DashboardStatsCards
│   ├── lib/
│   │   ├── profile/
│   │   │   ├── types.ts
│   │   │   ├── defaultProfile.ts
│   │   │   ├── profileStore.ts
│   │   │   ├── profilePrompt.ts
│   │   │   ├── profileContext.ts
│   │   │   └── index.ts
│   │   ├── analysis/               # Local analysis, digest, compareAnalysis
│   │   ├── jobs/                   # Filters, display score, dashboard stats
│   │   └── aiConfig.ts
│   └── types/analysis.ts
├── jobs_temp.json                  # Job store (gitignored)
├── user_profile.json               # Reference profile seed
├── .env.example
└── package.json
```

Important areas:

- `src/app/profiles` — Profile management and external AI profile import.
- `src/lib/profile` — Profile schema, defaults, `localStorage` store, builder prompt, analysis context.
- `src/app/api` — Collect, job CRUD/status, and analysis routes.
- `src/app/jobs/[id]` — Conclusion-first job detail experience.

---

## Current Status

### Implemented (MVP)

- `JapanCareerProfile` schema and validation
- Profile store with `localStorage` persistence; multiple profiles and active profile selection
- External AI Profile Builder Prompt import (`/profiles/import`, Chinese prompt)
- Profile-driven local analysis; Gemini/Groq analysis when API keys are configured
- Model comparison and consensus recommendation (`buildAnalysisComparison`)
- Home dashboard: stats cards, search, status/score/risk filters, sorting
- Application status tracking (`PATCH /api/jobs/[id]/status`)
- Job detail: active profile banner, Analyze Fit panel, collapsed raw posting
- Job persistence via `jobs_temp.json` and `POST /api/collect`

### In progress / near-term (see Roadmap)

- Portfolio UI polish with shadcn-style components (TASK-025)

### Skipped or deferred

- Built-in demo data
- Login and cloud sync
- Resume upload into the app
- Built-in questionnaire
- Full multilingual UI (Profile Builder Prompt is Chinese only today)
- `ANALYZE_MODE` as a single global provider switch
- AI provider fallback orchestration

---

## Roadmap

### Near-term improvements

- Portfolio UI polish (shadcn-style components)
- Architecture diagram in docs
- Multilingual Profile Builder Prompt (Traditional Chinese, English, Japanese)
- Export analysis report as Markdown or JSON
- Demo data / sample job scenarios
- Deployment polish
- Screenshots and usage examples

### Future ideas

- Built-in Japan career questionnaire
- Resume / 職務経歴書 upload
- AI resume extraction
- AI provider fallback layer
- Login and cloud sync
- Job alert email parser
- Semi-automated job search assistant
- Advanced career exploration prompt pack
- Full multilingual UI
- Database migration

---

## Notes and Limitations

This is a portfolio MVP, not a production job-search platform.

Current limitations include:

- Profile data is stored locally in the browser (`localStorage`).
- Jobs are stored in a local JSON file on the machine running Next.js.
- AI analysis quality depends on configured providers, prompts, and profile quality.
- Local analysis uses practical rule-based matching and may not capture every nuance in job descriptions.
- Job ingestion depends on `POST /api/collect` (extension or manual client), not an in-app job editor.
- No cloud account system.
- No automatic resume upload/extraction in the app.
- No guarantee that AI recommendations are correct or legally reliable.

Users should treat the analysis as decision support, not as a final authority.

---

## Design Principles

JobFit-AI is built around several design principles:

### 1. Profile-first

The user's career profile is the source of truth.

### 2. Decision support, not automation

The tool helps users think clearly. It does not replace human judgment.

### 3. Privacy-aware workflow

Raw resumes do not need to be uploaded into JobFit-AI.

### 4. Explainability

Recommendations should include reasons, risks, and suggested next actions.

### 5. Career direction matters

A job can be technically possible but strategically wrong.

---

## Example Use Cases

### Case 1: Same job, different profiles

A Tokyo IT support job may be a strong fit for an IT transition profile, but a weak fit for a Fukuoka hospitality profile.

### Case 2: Deal breaker detection

A job with night shifts may be automatically flagged as risky if the active profile lists night work as a deal breaker.

### Case 3: Visa-aware job screening

A job that does not mention visa support can be flagged as a risk when the active profile requires visa support.

### Case 4: Career transition

A user may have past hospitality experience but want to move toward operations or IT support. JobFit-AI can distinguish transferable skills from target roles.

---

## Portfolio Focus

This project demonstrates:

- Product thinking for Japan-focused job search
- Profile-driven architecture and TypeScript data modeling
- AI prompt design and a shared compact digest pipeline
- Multi-model analysis and read-only model comparison
- Next.js App Router API routes with server-only secrets
- File-based and `localStorage` MVP persistence
- Privacy-aware profile import without in-app resume storage

---

## Maintainer Docs

For architecture overview, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

For manual QA and demo validation, see [docs/QA.md](docs/QA.md).

For local/production run and deployment notes, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

For task backlog and agent context, see `docs/TASKS.md` and `docs/CURRENT_CONTEXT.md`.
