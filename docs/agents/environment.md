# 環境盤點（Environment Inventory）

```yaml
版本: 1.0
日期: 2026-07-04
撰寫者: Claude Fable 5（本檔是後續所有 docs/agents/ 檔案的事實依據）
本檔假設:
  - 主對話模型陣容: Agent tool 的 model 參數 enum 為 "sonnet" / "opus" / "haiku" / "fable"（英文字串，不得翻譯）
  - 專案路徑: C:\Users\user\Desktop\JobFit-AI（Windows 11, PowerShell 5.1 為主 shell）
失效條件:
  - Agent tool 的 model enum 出現本檔未列的值，或 "fable" 從 enum 消失 → 本檔過時，走 maintenance.md 的更新流程
  - CLAUDE.md 路由指到的任何檔案不存在 → 先修路由再做任務
```

以下每一項都標明【實測】（本 session 用工具驗證過）或【推測】（查不到，僅為合理假設）。

## 1. 每 session 自動載入的內容【實測 2026-07-04】

| 檔案 | 大小 | 載入方式 |
|---|---|---|
| CLAUDE.md | 改寫前 47 行 / 1,752 字元 | 每 session 自動載入 |
| AGENTS.md | 98 行 / 3,487 字元 | 經 CLAUDE.md 的 `@AGENTS.md` 一併載入 |
| memory/MEMORY.md | 索引（每則記憶一行） | 每 session 自動載入索引；記憶內容按需讀取 |

## 2. docs/ 現狀【實測 2026-07-04】

| 檔案 | 大小 | 狀態 |
|---|---|---|
| docs/CURRENT_CONTEXT.md | 89 行 / 6,156 字元 | **過時**：第 18、25 行仍說 `jobs_temp.json` 是儲存層，實際已是 SQLite（Phase 2） |
| docs/TASKS.md | 161 行 / 9,581 字元 | 歷史任務清單 |
| docs/REDESIGN.md | 264 行 / 15,475 字元 | 現行 roadmap（Phase 1+2 完成） |
| docs/ARCHITECTURE.md | 398 行 / 11,755 字元 | — |
| docs/QA.md | 386 行 / 11,313 字元 | — |
| docs/DEPLOYMENT.md | 243 行 / 7,497 字元 | — |
| DESIGN.md（根目錄） | 103 行 / 5,334 字元 | 設計 token |
| README.md | 627 行 / 19,160 字元 | 公開說明 |

合計約 86KB。**不可全載**：CLAUDE.md 的路由表規定每個檔案的載入時機。

## 3. Subagent 機制（Agent tool）【實測 2026-07-04】

- 參數：`subagent_type`、`model`、`prompt`、`description`、`isolation`（"worktree"/"remote"）、`run_in_background`。
- `model` 可用值（英文字串，不得翻譯）：`"sonnet"`、`"opus"`、`"haiku"`、`"fable"`。
- **沒有 effort / thinking 參數**——派工方無法指定 subagent 的思考深度，只能在 prompt 裡寫「先列步驟再執行」之類的指令來要求。
- `subagent_type` 可用值：
  - `general-purpose`：全工具，可寫檔。派工預設。
  - `Explore`：唯讀（無 Write/Edit），適合搜尋、read-back 驗證。
  - `Plan`：唯讀，出實作計畫。
  - `claude`、`claude-code-guide`（查 Claude Code 官方文件）、`statusline-setup`（特殊用途）。
- 續派：Agent 回覆後可用 `SendMessage` 帶同一 agent 續談（保留它的 context）；重新呼叫 Agent 則是全新 context。
- 禁忌：Agent 啟動訊息會給一個 output_file 路徑（subagent 的完整 JSONL transcript）——**禁止直接 Read 該檔**，會灌爆 context。
- **實測紀錄（haiku 校準數據）**：2026-07-04 派 `model:"haiku"` 讀 47 行的 CLAUDE.md 並數 `## ` 開頭行數。結果：spawn 成功、5.7 秒、27,986 tokens、格式遵循完美——但**數數答 4，正確是 5**。結論寫進 model-dispatch.md：haiku 的自報數字不可作為驗收依據。

## 4. 模型字串【實測（harness 環境區塊）2026-07-04】

- Agent tool 用短名：`sonnet` / `opus` / `haiku` / `fable`。
- API model ID（寫程式呼叫 API 時用）：`claude-sonnet-5`、`claude-opus-4-8`、`claude-haiku-4-5-20251001`、`claude-fable-5`。
- `fable` = Claude Fable 5，本 session 之後**預期不再可用**（使用者聲明）。未來 session 的最強可用模型視當時 enum 而定；以「當下 enum 裡最強者」代入所有規則中的「最強模型」。

## 5. 記憶機制【實測 2026-07-04】

- 位置：`C:\Users\user\.claude\projects\C--Users-user-Desktop-JobFit-AI\memory\`
- `MEMORY.md` 是索引（每 session 自動載入）；每則記憶一個 .md 檔，frontmatter 含 name/description/type。
- 現有 3 則：`redesign-direction`（專案方向史）、`data-safety-lesson`（2026-07-02 真實資料遺失教訓）、`skill-triggering-preference`（skill 觸發偏好）。
- 歷史 transcript 在同目錄的 `*.jsonl`（2026-07-04 有 4 份，最大 11MB）。可用 Grep 挖，禁止整檔讀。

## 6. MCP 與工具【實測 2026-07-04】

- 直接可用：`Claude_Preview`（preview_* 系列——UI 驗證首選，搭配 .claude/launch.json 的 dev server 設定，port 3000）、`ccd_session`（spawn_task / mark_chapter）、`visualize`。
- Deferred（需先 `ToolSearch` 以 `select:工具名` 載入 schema 才能呼叫）：WebFetch、WebSearch、Windows-MCP、claude-in-chrome、computer-use、Notion、Gmail、Google Calendar、pdf-viewer、`ccd_session_mgmt`（含 search_session_transcripts）、職缺 MCP（search_jobs / get_resume / get_job_details / get_company_data）等。
- 需 OAuth 而未授權（本機非互動 session 無法補授權）：engineering 與 product-management plugin 系列（github、linear、slack、figma 等）。
- 無 hooks 設定：專案 `.claude/settings.local.json` 只有 permissions.allow（28 條，含數條一次性殘留）；使用者層 `~/.claude/settings.json` 只有 autoUpdatesChannel。

## 7. Context 上限【推測】

- harness 不提供查詢指令，未能實測。假設 200k tokens（Claude 4/5 系標準值）。
- 長對話時 harness 會自動摘要（context compaction）並延續工作——不需要為此提前收尾，但**摘要後細節會遺失，重要結論要及早落檔**。

## 8. Skills【實測 2026-07-04】

- 專案級 `.claude/skills/`：17 個（shadcn-ui、next-best-practices、react-best-practices、webapp-testing、GSAP×8、design-md、impeccable-design-polish 等）。
- 全域＋plugin skills 大量（conventional-commits、code-explainer、smart-test-generator、code-review、verify、debug 等）。
- 觸發原則見記憶 `skill-triggering-preference`：明確匹配就靜默觸發；可有可無就一行建議；真分叉才開選單。
