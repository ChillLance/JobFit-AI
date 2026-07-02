# DESIGN.md — JobFit AI

> Single source of truth for visual direction, tokens, and rules
> (managed with the `design-md` skill). Change this file first, then the code.

## Direction

**"Washi field notes"(和紙手帳).** A working-holiday job hunter's travel
journal: warm unbleached-paper (生成り kinari) surfaces, sumi-ink text, one
confident **vermilion (朱, hanko/torii red)** accent, indigo (藍) reserved for
the "applied" state. Light, calm, printed-matter feel — the opposite of both
AI-product clichés (purple accents AND black dashboards). Reference hues from
Japan's traditional color canon: shu #D72631, ai #004B97, kinari off-white,
sumi #1C1C1C. Refined-minimal: precision over decoration.

## Tokens

### Color

| Role | Value | Tailwind |
| --- | --- | --- |
| Page background — washi 生成り | `#f8f4ea` | custom `washi` |
| Card surface — paper | `#fffcf6` | custom `paper` (+ `border-stone-200`) |
| Inset surface | — | `stone-100/60` on paper |
| Text — sumi ink / secondary / muted | `#26221c` | custom `ink` / `stone-600` / `stone-500` |
| Neutral family | — | `stone` (warm gray; never cool `slate`/`gray`) |
| **Accent — vermilion 朱 (brand, primary actions, active tabs, focus)** | `#ea580c` | `orange-600` (hover `orange-500`; text `orange-600/700`) |
| Danger (destructive only, always outline style) | — | `red-300` border + `red-700` text |

Single accent: vermilion owns every CTA. Indigo/blue appears **only** in the
semantic `applied` status badge. On this light theme, semantic hues render as
`-700/-800` text on `-50` washes with `-200/-300` borders (dark `-300 on -950`
shades are forbidden).

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
- Elevation is quiet on paper: `shadow-sm`/`shadow-md` only — heavy dark
  shadows break the printed-matter feel.
- Atmosphere: faint vermilion + indigo paper washes at the top of every page
  (see `globals.css body::before`) — subtle; if you notice it, it's too strong.

## Motion

- Micro-interactions only: `transition-all duration-200`; cards lift
  `-translate-y-0.5` with a vermilion-tinted border/shadow on hover.
- No scroll-jacking, no entrance animation on data lists (content shifts as
  jobs load — keep it stable).
- GSAP skills are installed for future high-impact moments (score reveal,
  comparison chart) — adding the `gsap` dependency requires an explicit
  decision first.

## Rules

1. One accent: vermilion owns "brand + primary action + active state". Don't
   introduce a second accent hue; the semantic score colors are not accents.
   Never reintroduce violet/purple — it is the definitive AI-product cliché.
   Destructive actions stay outline-red so solid vermilion never reads as
   danger.
2. Every interactive element keeps a visible `:focus-visible` ring (global).
3. Empty states use dashed `border-stone-300` boxes with one action button.
4. Language switch (zh-TW/en/ja) must never reflow layout — copy lives in
   `src/lib/uiCopy.ts`, sized for the longest language.
5. Light washi theme only. A dark mode, if ever added, must be designed as
   its own washi-derived palette — never revert to the slate-950 "AI
   dashboard" look.
