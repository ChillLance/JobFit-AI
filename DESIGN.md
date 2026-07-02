# DESIGN.md — JobFit AI

> Single source of truth for visual direction, tokens, and rules
> (managed with the `design-md` skill). Change this file first, then the code.

## Direction

**"Night-shift command center."** A focused, dark intelligence dashboard for a
job hunter comparing AI verdicts late at night. Calm slate surfaces, one
confident violet accent, data that lines up. Refined-minimal — precision over
decoration. Not a marketing site: no hero images, no purple-on-white gradients.

## Tokens

### Color

| Role | Value | Tailwind |
| --- | --- | --- |
| Page background | `#020617` | `slate-950` |
| Card surface | — | `slate-900` (+ `border-slate-800`) |
| Inset surface | — | `slate-950/60` |
| Text primary / secondary / muted | — | `slate-100` / `slate-300` / `slate-400` |
| **Accent (brand, primary actions, active tabs)** | `#7c3aed` | `violet-600` (hover `violet-500`) |
| Info action (refresh, links) | — | `blue-600` |
| Danger | — | `rose`/`red` families |

**Semantic score scale (never repurpose):**
`excellent ≥85` emerald · `good ≥70` amber · `fair ≥50` sky · `poor <50` rose ·
`unknown` slate. Status badges: applied blue · interview amber ·
not_interested slate · not_applied slate.

### Typography

- **Display** (`--font-display`, Bricolage Grotesque 500/700/800): brand
  wordmark + Latin page titles. CJK glyphs intentionally fall back to system.
- **Body** (`--font-geist-sans`, Geist): everything else, with
  `Microsoft JhengHei / Yu Gothic UI / Noto Sans TC` CJK fallbacks.
- **Numerals:** `font-variant-numeric: tabular-nums` is set globally — scores
  and stats must align vertically.

### Shape & depth

- Cards `rounded-2xl`, inner elements `rounded-xl`, chips `rounded-full`.
- Elevation via borders first, shadows second (`shadow-lg` cards).
- Atmosphere: fixed violet aurora glow at the top of every page
  (see `globals.css body::before`) — subtle; if you notice it, it's too strong.

## Motion

- Micro-interactions only: `transition-all duration-200`; cards lift
  `-translate-y-0.5` with a violet-tinted border/shadow on hover.
- No scroll-jacking, no entrance animation on data lists (content shifts as
  jobs load — keep it stable).
- GSAP skills are installed for future high-impact moments (score reveal,
  comparison chart) — adding the `gsap` dependency requires an explicit
  decision first.

## Rules

1. One accent: violet owns "brand + primary action + active state". Don't
   introduce a second accent hue; the semantic score colors are not accents.
2. Every interactive element keeps a visible `:focus-visible` ring (global).
3. Empty states use dashed `border-slate-700` boxes with one action button.
4. Language switch (zh-TW/en/ja) must never reflow layout — copy lives in
   `src/lib/uiCopy.ts`, sized for the longest language.
5. Dark only. No light theme until a real token pass (Phase 2 shadcn work).
