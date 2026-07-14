@AGENTS.md
# CLAUDE.md - JobFit-AI

## Claude-specific shared-memory note

- Follow the shared workflow in `AGENTS.md` and begin each task at
  `MEMORIES/index.md`.
- Treat Claude's automatic session memory (`~/.claude/projects/*/memory/`) as a
  private notebook, not as a project fact. Facts that Codex must also know belong
  in `AGENTS.md` or `MEMORIES/` after user approval.

## Current product direction (2026-07-14)

Before changing product scope, career-profile prompts, job discovery, resort-baito
matching, resume tailoring, or application automation, read:

- `docs/PRODUCT_DIRECTION_2026-07.md`
- `docs/JOB_DIRECTION_DISCOVERY_PROMPT_ZH.md`

These documents record the latest market research, the working-holiday/resort-baito
wedge, the human-in-the-loop automation policy, and the two-stage direction-discovery
prompt. They supersede generic “AI resume” or mass auto-apply ideas where they conflict.

專案規則的單一來源是 AGENTS.md（上一行已自動載入，**不要再讀一次**）。
通用的派工／判斷／派工模板／維護規則已於 2026-07-04 搬到全域 `~/.claude/CLAUDE.md` ＋
`~/.claude/rules/`（每個 session 自動載入，**不必也不要**在這裡重複——同一條規則兩處維護會漂
移出不同措辭）。本檔只放 Claude 專屬提醒、指令、本專案路由表與本專案專屬硬規則。

## Commands

```bash
npm run dev       # dev server (http://localhost:3000)
npm run build     # production build
npm run lint      # eslint
npm test          # vitest
npx tsc --noEmit  # typecheck
```

## 路由表——本專案的檔案，什麼情況載入哪份

| 情況 | 讀這份 |
|---|---|
| 要驗證 UI 行為 | webapp-testing skill（dev server port 3000 + Playwright） |
| 規劃新功能、討論 roadmap／Phase 3 | docs/REDESIGN.md |
| 要動 src/lib 或 API 路由的結構 | docs/ARCHITECTURE.md |
| 要動 UI 樣式、配色、字體 | DESIGN.md |
| 使用者提到 TASK-0xx 編號 | docs/TASKS.md ＋ docs/CURRENT_CONTEXT.md（⚠ 歷史檔：其儲存層描述已過時，一律以 AGENTS.md 為準） |
| 被問部署相關 | docs/DEPLOYMENT.md |
| 被問測試策略／QA | docs/QA.md |
| 新模型第一次接手本專案；想知道本專案曾有過的制度成因與證據 | docs/agents/handover.md、docs/agents/diagnosis.md（歷史記錄，見下方「制度沿革備註」） |
| （README.md 是對外文件，日常任務不需要讀） | — |

## 硬規則（跨專案通用硬規則見全域 CLAUDE.md，不在此重複；這條是本專案的具體實作）

1. 破壞性操作先備份（原則見全域 CLAUDE.md 硬規則 1）。本專案的具體指令：
   `Copy-Item data\jobfit.sqlite ("data\jobfit.sqlite-backup-{0}" -f (Get-Date -Format yyyyMMdd-HHmmss))`
   備份檔名必須以 `jobfit.sqlite-` 開頭——這樣才會命中 .gitignore:49 的 `data/jobfit.sqlite-*`，
   個人資料不會被誤 commit 到公開 repo。
   為什麼：2026-07-02 使用者數月收集的真實資料，因同 session 第二次 reseed 前略過備份而**永久遺
   失**（詳見 memory: data-safety-lesson）。

## 制度沿革備註（2026-07-04）

本專案曾有一套完整的 `docs/agents/` 制度（model-dispatch.md / judgment.md / prompt-templates.md
/ maintenance.md），2026-07-04 當天由 Sonnet 5 通用化並搬到全域 `~/.claude/`，現在對每個新專案
都自動生效，不只本專案。這 4 份專案內的舊檔**已凍結為歷史快照**（檔頭有橫幅註明現行版本位
置），不再更新；`docs/agents/environment.md`、`diagnosis.md`、`handover.md` 仍是本專案專屬的活
文件，繼續維護。
