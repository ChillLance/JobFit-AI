# Harness 診斷報告（Diagnosis）

```yaml
版本: 1.0
日期: 2026-07-04
撰寫者: Claude Fable 5
本檔假設: 證據取自 2026-07-04 的檔案現狀與 4 份歷史 transcript；之後的 session 若已按修法改善，該條目即失效
失效條件: 某條目的「修法」已實施且驗證 → 在該條目開頭標【已修】；全部已修 → 本檔轉為歷史文件
用途: 一次性診斷。B–F 各檔的設計決策都引用本檔條目編號（D1、D2…）
```

每條格式：問題 → 證據 → 後果 → 修法。引不出證據的標【推測】。

## D1. 每個任務被強制載入「已過時」的檔案

- **證據**：改寫前 CLAUDE.md「Task workflow」第 1 條要求每個任務先讀 `docs/CURRENT_CONTEXT.md` 與 `docs/TASKS.md`。但 CURRENT_CONTEXT.md:18 寫「Chrome Extension collects job postings into `jobs_temp.json`」、:25 寫「All `jobs_temp.json` access goes through jobsRepository」——與 CLAUDE.md 自己宣告的 SQLite 儲存層（Phase 2, 2026-07-02 完成）直接矛盾。
- **後果**：弱模型每任務多燒 ~4k tokens 讀兩份舊檔，且可能照舊檔行動（例如往 `jobs_temp.json` 寫資料，違反「read-only legacy」鐵律）。兩份矛盾的事實並存時，弱模型沒有能力判斷哪份新。
- **修法**：CLAUDE.md 改為路由表，這兩檔降級為「歷史紀錄，僅在使用者提到 TASK-0xx 編號時查閱」，並在路由行標明「部分內容已過時」。【已修 2026-07-04：CLAUDE.md 改寫時實施】

## D2. CLAUDE.md 與 AGENTS.md 重複約四成

- **證據**：CLAUDE.md「What this is」＝AGENTS.md「Project Overview」（儲存層、repository、jobs_temp.json 各講一遍）；CLAUDE.md「Hard rules」4 條全部在 AGENTS.md「Rules for AI Agents」9 條與「Next.js Rules」中出現過（jobs_temp.json 不刪、不加第二儲存層、不加依賴、'use client' 禁令）。
- **後果**：每 session 白付重複 tokens；更糟的是兩處措辭略異（如 CLAUDE.md 說「don't add a second storage backend」、AGENTS.md 說「without discussing it first」），弱模型會挑較寬鬆的那句解讀。
- **修法**：規則單一來源＝AGENTS.md；CLAUDE.md 只放路由、指令、與 AGENTS.md 沒有的本機事項。【已修 2026-07-04】

## D3. docs/ 共 86KB，沒有任何載入指引

- **證據**：environment.md §2 實測——8 份文件 86KB（含 627 行的 README.md、398 行的 ARCHITECTURE.md），改寫前 CLAUDE.md 對「什麼情況讀哪份」零說明。
- **後果**：弱模型兩種失敗模式都會發生：全讀（一次 ~25k tokens，佔假設 context 上限的 12%）或全不讀（缺脈絡、重新發明已有決策——例如不知道 REDESIGN.md 已明定 Phase 3 邊界）。
- **修法**：CLAUDE.md 路由表逐檔標「載入時機」（見 CLAUDE.md）。【已修 2026-07-04】

## D4. 資料安全教訓沒有機制化，只存在記憶裡

- **證據**：memory `data-safety-lesson.md`——2026-07-02 使用者數月收集的 17 筆真實職缺資料，因同一 session 內第二次 `npm run demo -- --force` 前沒有重新備份而**永久遺失**。專案 `.claude/settings.local.json` 與 `~/.claude/settings.json` 均無 hooks（實測見 environment.md §6），也就是說這條教訓的執行完全依賴「模型記得去讀記憶」。
- **後果**：memory 每 session 只自動載入一行索引；一個趕工的弱模型完全可能不點開內文就跑破壞性指令，歷史重演。
- **修法**：升格為 CLAUDE.md 硬規則（含可直接複製的備份指令），因為 CLAUDE.md 是唯一保證被讀的檔案。判斷細則放 judgment.md。可選強化：PreToolUse hook 攔 `--force`，但 hooks 增加維護面，本次不配置，留給使用者決定。【已修 2026-07-04：規則已進 CLAUDE.md】

## D5. permissions allowlist 累積一次性殘留

- **證據**：`.claude/settings.local.json` 第 22–26 行有搬移「打工度假日記.docx」、pandoc 轉檔、office unpack 等一次性指令的 allow 條目——與本專案任務無關，是某次臨時作業的殘留。
- **後果**：直接危害小（多幾條沒用的白名單），但顯示 allowlist 沒有清理機制，長期會膨脹到看不出哪些是刻意授權。
- **修法**：maintenance.md 訂具體門檻（allow 條目 >40 條時清理一次），清理時只刪「非本專案路徑／一次性檔名」的條目。

## D6. Windows / PowerShell 5.1 語法坑重複踩

- **證據**：①本 session（2026-07-04）Fable 5 自己踩了 `"$f:"` 解析錯誤（PowerShell 變數後接冒號需寫 `${f}:`），一次工具呼叫報廢；②memory `redesign-direction.md` 記錄的既有教訓「Bash 工具的 cd 會改 PowerShell 的 cwd（共享狀態）」。harness 系統提示裡其實有完整說明，但實戰中連最強模型都會踩——說明長篇說明文件擋不住，要靠短清單放在必讀位置。
- **後果**：每踩一次浪費一輪工具呼叫＋一段 context；弱模型可能連錯數次。
- **修法**：CLAUDE.md 放「本機三大坑」（≤5 行），只放實際踩過的。新坑踩到就按 maintenance.md 流程補一行、超過 5 條就淘汰最少踩的。【已修 2026-07-04】

## D7. 主對話親自做大量機械工作，撐爆 context【推測→部分證實，見 D8】

- **證據**：改寫前 CLAUDE.md / AGENTS.md 完全沒有「何時派 subagent」的指引；Agent tool 明明支援 model 參數（可派便宜模型）卻無使用規範。
- **後果**：主對話把 repo 掃描、大檔讀取、批次修改全部自己做，context 被工具回傳灌滿後觸發摘要，摘要又遺失細節——這是長 session 失焦的主因。
- **修法**：model-dispatch.md（本次交付 C）＋CLAUDE.md 路由行「要派工先讀它」。

## D8. Transcript 實證（由 subagent 於 2026-07-04 挖掘；ff903c7c＝2026-07-02～04 的 11MB 主力 session）

### D8a. 單次工具回傳灌爆 context（證實 D7）

- **證據**：ff903c7c 有 22 行單行 >50,000 字元的 tool_result；最大一筆在 line 2367——用 `Read` 讀 `check-home.png`，一次灌入 **1,020,891 字元**（截圖被當文字讀）。8676af68 也有 4 行，最大 398,848 字元。
- **後果**：一次錯誤的 Read 就吃掉約 25 萬 tokens 等級的 context，直接觸發摘要、遺失前文。
- **修法**：①CLAUDE.md 三大坑加一條「圖片驗證用 preview_screenshot / snapshot，禁止用 Read 讀 .png」；②大量讀取一律派 Explore subagent（model-dispatch.md），主對話只收結論。

### D8b. 同一錯誤重試 10 次不換策略

- **證據**：ff903c7c line 1191–2357 之間，「preview_screenshot timed out after 30s」同一錯誤出現 **10 次**，橫跨多個時段；8676af68 line 510–513「error getting job details」同一 MCP 錯誤**連續 4 次**原地重試。
- **後果**：每次重試燒一輪工具呼叫，且 10 次都沒解決——重試本身不是策略。
- **修法**：model-dispatch.md 鐵律「同一件事同一做法最多 2 次，第 2 次失敗必須換路（換工具、換方法、或升級模型），並把失敗軌跡寫下來」。

### D8c. 機械性流程錯誤重複發生

- **證據**：ff903c7c「File has not been read yet. Read it first」出現 4 次（line 797–833）；「File has been modified since read」3 次（line 1243–1259）；三份 transcript 合計 46 次 `"is_error":true`。
- **後果**：每次 ~1 輪浪費；多數是可預防的流程錯（Edit 前沒 Read、寫檔與 linter 賽跑）。
- **修法**：prompt-templates.md 的實作模板內建「Edit 前先 Read 目標段落」步驟，讓派出去的弱模型照抄即可。

### D8d. 使用者糾正集中在「品味」而非「正確性」

- **證據**：三份 transcript 以糾正詞彙檢索，唯一明確糾正是 ff903c7c line 1047：「配色幫我改掉 我不要這個一堆AI做出來的產品都在用的顏色」。
- **後果**：功能正確性靠測試擋得住，**設計品味擋不住**——這是 checklist 補不了的類別。
- **修法**：judgment.md 明文：涉及視覺風格／文案語氣的產出，第一版就給 2–3 個方向讓使用者挑，不要單方案賭品味。這也是誠實條款的實例：品味判斷是 harness 極限，弱模型（與強模型）都該直接問。
