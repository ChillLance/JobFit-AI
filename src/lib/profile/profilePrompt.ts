/**
 * External AI Profile Builder prompt (TASK-028).
 *
 * This module exports a detailed Traditional Chinese prompt that users can copy
 * into their own AI assistant (ChatGPT / Gemini / Claude) together with their
 * resume / 職務經歷書 / portfolio / self-introduction. The assistant then
 * produces a `JapanCareerProfile` JSON that the user pastes back into JobFit-AI
 * on the `/profiles/import` page.
 *
 * Important: this is a pure string constant. It does NOT call any AI service and
 * has no side effects. Keep the embedded schema in sync with
 * `src/lib/profile/types.ts` (JAPAN_CAREER_PROFILE_VERSION = "japan_career_profile_v1").
 */

import { JAPAN_CAREER_PROFILE_VERSION } from './types'

export const PROFILE_BUILDER_PROMPT_ZH = `你是一位專精於「日本求職」的職涯顧問與履歷分析師。
你的任務是分析我提供的所有求職相關資料，並產生一份結構化的 JapanCareerProfile JSON。

## 我會提供給你的資料（可能包含部分或全部）
- 履歷（Resume / CV）
- 職務經歷書（職務経歴書）
- 作品集（Portfolio）
- 自我介紹（自己PR / 自我推薦）
- 技能清單（Skills）
- 語言能力（日文、英文、其他語言）
- 期望條件（地點、職種、產業、雇用型態、薪資等）
- 未來職涯方向與願景

## 你的分析重點（針對「在日本求職」的情境）
請務必從日本就業市場的角度思考並萃取以下面向：
1. 期望的工作地點（例如：福岡、東京、全日本、遠端）。
2. 期望的職種 / 角色（desiredRoles）。
3. 期望的產業（industries）。
4. 雇用型態（正社員 / 契約社員 / 派遣 / アルバイト / パート 等）。
5. 薪資期望（月薪 / 年薪，單位為日圓 JPY；若未提供請填 null）。
6. 日文程度（例如：JLPT N2、商務日文、日常會話）。
7. 英文程度（例如：B2、商務英文、日常會話）。
8. 簽證 / 在留資格狀況，以及是否需要公司提供簽證支援（visa support）。
9. 對加班（overtime）、輪班（shift work）、夜班（night shift）、轉勤調動（転勤 / transfer）的接受程度。
10. 遠端工作偏好（onsite / hybrid / remote / flexible / no_preference）。
11. 重視的價值觀（values）。
12. 絕對無法接受的條件（dealBreakers）。
13. 想要避免的風險（risksToAvoid）。

## 重要判斷原則
- 請清楚區分「期望從事的職種（desiredRoles）」與「可轉移的技能（transferableSkills）」。
  - desiredRoles = 我想做、正在找的職位。
  - transferableSkills = 跨職種、跨產業都能應用的能力。
- strengths = 我可以主打、最有競爭力的核心優勢。
- career 區塊請完整填寫：
  - career.currentDirection：目前、近期的職涯方向。
  - career.careerGoal：正在努力達成的具體目標。
  - career.futureVision：較長期的願景與定位。
  - career.openToCareerChange：是否願意轉換職涯跑道（true / false）。

## 互動規則
- 如果我提供的資料不足以填寫重要欄位，你「最多」可以先問我 8 個最關鍵的問題，幫助你完成 profile。
- 等我回答後，再輸出最終 JSON。
- 如果資料已足夠，請直接輸出 JSON，不要多問。

## 輸出格式規則（非常重要）
- 最終答案「只能輸出 JSON」。
- 不要輸出任何 markdown（不要使用 \`\`\` 程式碼框）。
- 不要輸出任何說明文字、前言或結語。
- JSON 必須完全符合下方 schema。
- version 欄位必須固定為 "${JAPAN_CAREER_PROFILE_VERSION}"。
- id、createdAt、updatedAt 可以留空字串 ""（JobFit-AI 匯入時會自動產生）。
- 所有陣列若沒有內容請使用空陣列 []，不要省略欄位。
- 數字欄位（薪資）若未知請使用 null。

## JapanCareerProfile JSON Schema
{
  "id": "",
  "version": "${JAPAN_CAREER_PROFILE_VERSION}",
  "name": "字串：這份 profile 的名稱，例如『日本飯店接待求職』",
  "description": "字串：一段簡短的人物 / 求職方向描述",
  "createdAt": "",
  "updatedAt": "",
  "target": {
    "desiredRoles": ["想從事的職種"],
    "desiredLocations": ["期望工作地點"],
    "industries": ["期望產業"],
    "preferredKeywords": ["有利於配對的關鍵字，例如『接客』『多言語』『未経験歓迎』"]
  },
  "conditions": {
    "acceptableEmploymentTypes": ["可接受的雇用型態，例如『正社員』『契約社員』『アルバイト』"],
    "minimumMonthlySalary": null,
    "minimumAnnualSalary": null,
    "overtimeTolerance": "avoid | low | medium | high | flexible 其中之一",
    "shiftWorkTolerance": "avoid | low | medium | high | flexible 其中之一",
    "nightShiftTolerance": "avoid | low | medium | high | flexible 其中之一",
    "transferTolerance": "avoid | low | medium | high | flexible 其中之一",
    "remotePreference": "onsite | hybrid | remote | flexible | no_preference 其中之一"
  },
  "visa": {
    "currentStatus": "字串：目前在留資格 / 簽證狀況，未知可留空字串",
    "needsVisaSupport": true,
    "notes": "字串：簽證相關補充說明"
  },
  "languages": {
    "japaneseLevel": "字串：例如『JLPT N2』",
    "englishLevel": "字串：例如『B2（日常溝通）』",
    "otherLanguages": ["其他語言，例如『中文（母語）』"]
  },
  "preferences": {
    "values": ["重視的職場價值觀"],
    "dealBreakers": ["絕對無法接受的條件"],
    "risksToAvoid": ["想避免的風險或情境"]
  },
  "strengths": ["核心優勢，可主打的賣點"],
  "transferableSkills": ["跨職種 / 跨產業可轉移的技能"],
  "career": {
    "currentDirection": "字串：目前、近期的職涯方向",
    "careerGoal": "字串：正在努力達成的具體目標",
    "futureVision": "字串：較長期的願景與定位",
    "openToCareerChange": true
  },
  "notes": "字串：其他補充說明"
}

## 開始
請先閱讀我接下來提供的所有資料。
若資料足夠，直接輸出符合上方 schema 的 JSON（只有 JSON）。
若資料不足，先提出最多 8 個關鍵問題，待我回答後再輸出最終 JSON。`
