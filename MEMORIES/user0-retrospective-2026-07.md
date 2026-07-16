# Validation evidence #1 — user #0 retrospective (Hokkaido job search)

- Date: 2026-07-16, interviewed in-session (structured questions, verbatim
  answers preserved below in Chinese where quoted)
- Subject: the project owner — a Taiwanese working-holiday participant who
  completed a full job search ending in an accepted live-in hospitality job
  in Hokkaido (seasonal-leaning contract), i.e. exactly the ADR-2026-001
  target persona. This is the first and so far only complete real user
  journey through the product's problem space.
- Overall self-assessment of JobFit's role: **"用了但非關鍵"** (used it, but
  it was not decisive — the final decision ran mainly through other channels).

## The actual journey

1. **Discovery** — initially the hardest step ("找到值得投的職缺"), but
   solved *outside* JobFit: "後來用 Claude+Indeed 解決了". The extension then
   captured listings from multiple sites, but **cannot capture social-platform
   postings** (FB/LINE community job posts) — a real listing source in this
   market that the pipeline misses entirely.
2. **Condition judgment** — worked well: "判斷條件…profile有做好基本上沒問題".
   The profile-driven fit assessment did its job for this user.
3. **Application** — the biggest time sink: "要一直手動改履歷投遞這個比較好時間"
   (manually re-tailoring the resume/application per listing, repeatedly).
4. **Offer decision** — second major pain: "好幾個面試面完公布錄取時間卡在一起
   有點難覺得要去哪個工作" (multiple interview results announced on
   overlapping timelines; deciding between offers under deadline collision).
5. **Close** — the job was landed through a **staffing-agency counseling
   flow** (派遣仲介流程), not through a listing page.

## Why JobFit was not decisive (user's own selection, both confirmed)

- **關鍵資訊不在職缺頁上** — what actually mattered (dorm reality, workplace
  atmosphere, real schedules) is only learnable from the agency or on site.
  The tool analyzes listing text; the decision ran on information the listing
  never contains.
- **時機對不上** — on seeing a good listing, the user acted immediately;
  going home to capture → dashboard → analyze is a flow break that loses to
  "just apply now".

## What the user says would have been *decisive* help (ranked by emphasis)

1. **Application acceleration** (stated twice, unprompted): "加速履歷投遞…
   希望可以自動化依照各職缺條件後修改投遞" — auto-tailor the
   resume/application message per listing's conditions. Note this collides
   with ADR-2026-001's desk-research stance ("resume tailoring is a
   supporting feature, not the product position") — see ADR-2026-002.
2. **社群徵才po文海巡** — monitoring community job posts (new capture
   capability; guardrail-sensitive: collection must stay attended).
3. **仲介/雇主的評價情報** — agency/employer reputation intel (external data;
   hard; directly addresses "關鍵資訊不在職缺頁上").
4. **該問對方什麼問題** — a checklist of what to confirm before/at the
   interview. This independently validates the missing-info questions design
   (JOB_EXTRACTION_DESIGN.md §7) that was frozen pending evidence — it now
   has evidence.
5. **可信的存錢比較** — the savings comparison exists; "可信" (trustworthy)
   is the gap: visible assumptions and complete extraction coverage matter
   more than new math.

## Implications recorded

- The four-layer *judgment* piece is validated for this user; the product's
  weakness is being **outside the action flow** (apply now, ask the agency,
  decide between offers). Decision support without action support was
  "useful but not key".
- Discovery is not currently a winnable step for JobFit (user solved it with
  a general chat AI + Indeed; agencies own inventory anyway). The winnable
  steps per this evidence: pre-application (tailored application + questions
  to ask) and offer-time comparison.
- Single-user evidence. Slice 2 (3–5 external users) should test whether
  these pains generalize before any large build; but the application-
  acceleration pain is strong enough from user #0 to schedule as the next
  feature slice after the portfolio track (see ADR-2026-002).
