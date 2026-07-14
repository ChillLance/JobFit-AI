# 交接信（Handover）——Fable 5 → 未來的每一個 session

```yaml
版本: 1.1（2026-07-04 二次更新：制度全域化，見八）
日期: 2026-07-04
撰寫者: Claude Fable 5（一、二、三、四、五、六節）＋ Claude Sonnet 5（八節，同日稍後）
本檔假設: 見 environment.md；八節之後，通用規則的現行版本在全域 ~/.claude/rules/，本檔一～六節
  提及的 docs/agents/model-dispatch.md 等路徑已是歷史快照，讀路由要看 CLAUDE.md 最新版
失效條件: 本檔是歷史文件，不會過時，但「未竟事項」做完後應在該條目標記完成
```

## 讀者須知

這封信的讀者是未來在這個環境工作的模型（Sonnet / Opus / Haiku 等）與使用者本人。
制度檔案的入口是 CLAUDE.md 的路由表；這封信記錄制度背後的假設與尚未做完的事。

## 一、本 session 做過的假設（隨做隨補）

1. 【假設】context 上限 200k tokens——harness 無法查詢，未實測。若實際更小，diagnosis.md 裡關於「docs 全載」的浪費估算只會更嚴重，結論不變。
2. 【假設】制度檔案放在 repo 內的 `docs/agents/`（而非私有的 memory 目錄）。理由：git 版本控制＝免費備份與歷史、CLAUDE.md 可用相對路徑引用、內容無機密。代價：repo 在 GitHub 是 public，commit 後這些檔案會公開。**使用者若不想公開，把 `docs/agents/` 加進 .gitignore 即可，制度照常運作（檔案在磁碟上就有效）。**
3. 【假設】未來 session 的模型陣容是 sonnet / opus / haiku（fable 不再出現）。所有調度規則以此寫成；若陣容變動，走 maintenance.md 更新流程。
4. 【假設】使用者工作語言為台灣繁體中文，制度檔案以繁中為主、工具名/模型字串/指令保留英文。
5. 【假設】haiku 校準數據（47 行檔案數標題 5 數成 4）只測了一次。單一樣本不足以定量，但方向明確（低階模型自報數字不可信），規則按「不信任但廉價」設計，即使 haiku 實際更強也不會出錯，只會略保守。

## 二、未解問題（隨做隨補）

1. subagent 無法指定 effort/thinking 深度——只能靠 prompt 內指令間接影響。這是 harness 極限，寫進了 model-dispatch.md。
2. `docs/CURRENT_CONTEXT.md`、`docs/TASKS.md` 內容已過時（MVP 0.2/0.3 時代），但它們是歷史紀錄，本 session 不改內容、只在路由降級其地位。是否要重寫或歸檔，由使用者決定。
3. （待補）

## 三、未完成事項（隨做隨補）

- [x] 0 環境盤點 → environment.md
- [x] 0b 本檔骨架
- [x] A 診斷 → diagnosis.md（8 條，D8 含 transcript 實證）
- [x] B CLAUDE.md 改寫（備份於 docs/agents/backup/CLAUDE.md.2026-07-04.bak）
- [x] C 調度守則 → model-dispatch.md
- [x] D 判斷力外化 → judgment.md
- [x] E 派工模板 → prompt-templates.md（T1 已用 haiku 實測通過）
- [x] F 維護協議 → maintenance.md
- [x] G 本檔定稿（四、五節）
- [x] 收尾 1 對抗審查（haiku 模擬執行 C/D/E）——五個情境題全對；4 個措辭問題已於第一輪修正，未需第二輪
- [x] 收尾 2 read-back 驗證——15 個路由路徑、7 份制度檔 metadata／結尾／內部引用、備份檔，全數 PASS（fresh haiku agent，2026-07-04）
- [x] 收尾 3 一頁總結（見 session 最終回覆；三個開場指令範例也抄錄於本檔末）
- [x] 八 制度全域化（Sonnet 5，同日稍後）——搬遷＋瘦身＋凍結橫幅皆完成
- [ ] 八的驗證缺口：全域 6 檔＋專案異動尚未經對抗審查／read-back（見八之 6）

## 七、開場指令範例（可直接貼給下一個 session；2026-07-04 全域化後已更新路徑）

1. 日常任務：「先照 CLAUDE.md 路由表載入需要的檔案，然後：<你的任務>。做完按 ~/.claude/rules/judgment.md §2 的完成定義回報。」
2. 大範圍工作：「這個任務會動很多檔案。先讀 ~/.claude/rules/model-dispatch.md，列出你的派工計畫（誰做什麼、什麼 model、驗收條件）給我看，再開工。」
3. 制度維護：「我要改 <某規則>。先讀 ~/.claude/rules/maintenance.md，告訴我這屬於哪個權限等級，然後照 §4 流程走。」

（這三句在任何專案都成立，不限本專案——這正是全域化的目的。）

## 四、三件你沒問、但我認為對這個環境最重要的事

### 1. 使用者資料的備份缺口，制度只補了一半

`data/jobfit.sqlite` 是唯一儲存，且被 .gitignore 排除（正確——個人資料不進公開 repo），代價是 **git 對它零保護**。CLAUDE.md 硬規則只擋得住「模型執行的破壞性操作」，擋不住磁碟故障、使用者手滑、或非 Claude 流程的覆寫。2026-07-02 已經真實遺失過一次。**建議使用者自己做一件事**：給 `data\` 目錄設 OS 級備份（Windows 檔案歷程記錄，或行事曆提醒手動複製到雲端）。這是任何模型都替你維護不了的。另外我發現並修正了一個隱患：原訂備份檔名不符合 .gitignore 樣式，照做會讓個人資料變成可 commit 的 untracked 檔案——已改為 `jobfit.sqlite-backup-*` 樣式（CLAUDE.md 硬規則 1）。

### 2. AGENTS.md 是規則單一來源，也是最大單點故障

整套路由假設 AGENTS.md 描述的專案事實是對的。這個 repo 有系統性的「文件跟不上程式」傾向（證據：diagnosis.md D1——CURRENT_CONTEXT.md、TASKS.md、README.md 都曾過時）。**未來任何架構級變動（尤其 Phase 3 換 Postgres），第一個要改的檔案是 AGENTS.md**，否則每個 session 都在載入錯誤事實，路由做得再好也只是高效地傳播錯誤。

### 3. 這個專案的北極星不是把 app 打磨完美

memory `redesign-direction` 記錄了完整脈絡：使用者在日本打工度假，真正目標是**求職 pipeline**——雙軌找「遠端技術職」與「住み込みリゾートバイト」，策略含 Class A/B/C 三類職缺來源與 build-in-public。排任務優先序時，先問「這個改動離『幫使用者找到工作』多近」，再問技術美感。另外環境裡有已授權的職缺 MCP（`search_jobs`、`get_resume`、`get_job_details`、`get_company_data`）——做求職相關任務時記得它們存在（見 environment.md §6）。

## 五、這套制度最可能的退化方式與預防

按發生機率排序：

1. **弱模型「讀了但不照做」派工紀律**（最可能先破）。自己動手永遠比讀懂調度守則省事，而且沒有 hook 強制。預防：門檻全是數字（≥10 檔、>3 檔、2 輪）不留裁量空間；CLAUDE.md 路由表第一行就是派工情況。**使用者側的矯正口令**：看到主對話在長篇讀檔或原地重試，說一句「照 model-dispatch.md 辦」即可。
2. **路由腐化**——檔案改名、新檔案沒進路由表，路由開始指向不存在的路。預防：maintenance.md §5 觸發式健檢（發現一個死路徑就驗整張表）＋改動流程強制 Glob 驗路徑。
3. **規則膨脹**——每踩一個坑加一條，三個月後 CLAUDE.md 變回 86KB 問題本身。預防：maintenance.md §3 的數字門檻（>60 行就精簡、陷阱 >6 條就合併），且「新增自由、刪改過使用者」的不對稱設計讓膨脹可控、防線不失。
4. **同一教訓在制度檔與 memory 各存一版且互相矛盾**。預防：maintenance.md §2 的寫回對照表規定每類教訓唯一寫回處。
5. **驗證流於形式**——read-back agent 回「都很好」了事。預防：模板驗收條件一律要求「逐條比對＋回報差異」，零差異也要列出比對過哪幾條；judgment.md §5(4) 把「敘述與 diff 一致」設為底線。

## 六、收尾階段的殘餘問題

對抗審查（2026-07-04，由 haiku——未來實際執行這些檔案的最低階模型——照字面模擬執行 C/D/E）：
- **情境模擬 5/5 全對**（批次改檔派工、haiku 錯一次升級、配色給多方向、測試兩輪紅停手換路、2 檔小搜尋不派工）——制度在最低階模型上可照字面執行。
- 它抓到的 4 個措辭問題（haiku 選型欄語意、「同型檔案」未定義、預判升級 vs 事後升級的關係、「實跑」算不算自驗）已全數修正於 model-dispatch.md / judgment.md / prompt-templates.md。
- **殘餘（非阻斷）**：①haiku 校準數據仍是單一樣本（見假設 5）；②「弱模型讀了但不照做派工紀律」沒有機制強制，只有數字門檻＋使用者口令（見五、1）；③context 上限 200k 仍是推測值。

## 八、制度全域化（2026-07-04，Sonnet 5，同日稍後）

使用者在本 session 尾聲要求：「這套規則不是這個專案用而已，而是每個新開的專案都會套用」。執行
內容：

1. **先查證機制**：派 `claude-code-guide` agent 確認 Claude Code 官方文件——`~/.claude/CLAUDE.md`
   確實對每個專案自動載入、與專案 CLAUDE.md 是**疊加**（不是覆蓋，專案措辭優先）、官方慣例目錄
   是 `~/.claude/rules/`。這是整個搬遷的地基，先查證過才動手，沒有憑印象猜。
2. **通用化搬遷**：`model-dispatch.md`、`judgment.md`、`prompt-templates.md`、`maintenance.md`
   四份（原本假設單一專案結構）通用化後搬到 `C:\Users\user\.claude\rules\`，內容做了三處調整：
   (a) 把引用「diagnosis.md D8b」這類專案內部路徑的「為什麼」改寫成自足敘述；(b) judgment.md 的
   JobFit-AI 具體案例保留（具體案例比抽象範例好教），但標「案例：JobFit-AI」避免誤讀成當前專案
   有同名檔案；(c) maintenance.md 大幅重寫，新增「全域層 vs 專案層」的兩層架構說明、教訓該寫回哪
   一層的判斷測試、以及「什麼情況才值得幫新專案建一套專案級 docs/agents/」的門檻（避免對小專案過
   度工程）。
3. **environment.md 也分家**：harness/機器層級的事實（Agent tool 參數、模型字串、記憶機制、MCP
   清單、全域 skills）搬到 `~/.claude/rules/environment.md`；JobFit-AI 專屬的文件庫存清單留在專
   案自己的 environment.md，未搬動。
4. **本機陷阱升級為全域硬規則**：PowerShell/Windows 的 4 條坑（本來記在專案 CLAUDE.md）本質上是
   「這台機器」的屬性、不是「這個專案」的屬性，全部移到全域 CLAUDE.md，專案 CLAUDE.md 不再重
   複——並把這個去重原則本身也寫成一條全域硬規則（硬規則 5），防止未來又長出重複。
5. **JobFit-AI 的 CLAUDE.md 瘦身**：拿掉已經全域化的路由行與陷阱清單，只留專案專屬路由、專案專
   屬硬規則實例（SQLite 備份指令）、與一段「制度沿革備註」說明現行版本在哪。原本 4 份專案內檔案
   （docs/agents/{model-dispatch,judgment,prompt-templates,maintenance}.md）**凍結為歷史快照**
   （檔頭加橫幅），不刪除——留作可追溯的原始設計記錄。
6. **驗證**：改動前對即將變動的 5 個專案檔案做了第二次備份（`*.20260704-2.bak`）。全域 6 個新檔
   與專案異動尚未經過對抗審查／read-back（見「未完成事項」）——這是本節唯一遺留的驗證缺口。

**假設**：使用者的其他專案（若有）目前沒有自己的 `docs/agents/` 制度，全域規則對它們是「從無到
有」而非「疊加衝突」。若之後某個專案也有一套自己的派工/判斷規則且與全域版矛盾，依全域
maintenance.md §0 的疊加規則，專案措辭優先——但那份專案文件的作者應該知道全域版存在，避免兩邊
各自演化出更多矛盾。

## 九、凍結記錄（2026-07-11）

上一個 session 因額度上限中斷。使用者已拍板 2026-07-21～09-21 赴北海道星野度假村工作，本專案與
其他副線專案一併收尾凍結，凍結至 2026-09 下旬。解凍時請先讀完本檔前文（一～八節）再接手，本節
只是時間戳記，不重複前面的制度內容。
