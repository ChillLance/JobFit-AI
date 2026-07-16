import type { AppLanguage } from '@/lib/appLanguage'
import type { MissionPriority } from './types'
import type { MissionReason, MissionDecisionStatus } from './evaluateMission'

type MissionCopy = {
  manage: string
  create: string
  title: string
  description: string
  backToDashboard: string
  emptyTitle: string
  emptyDescription: string
  active: string
  useForDecisions: string
  edit: string
  delete: string
  save: string
  cancel: string
  setup: string
  noActive: string
  current: string
  priorities: string
  targetAreas: string
  experienceGoals: string
  growthGoals: string
  keywords: string
  availability: string
  from: string
  until: string
  descriptionLabel: string
  constraints: string
  minMonthlyIncome: string
  maxDormFee: string
  privateRoomRequired: string
  liveInRequired: string
  noSplitShift: string
  noNightWork: string
  maxDuration: string
  tradeoffs: string
  tradeoffsHint: string
  notes: string
  primaryPriority: string
  secondaryPriority: string
  select: string
  discoveryModeLabel: string
  discoveryDescription: string
  discoverySteps: string[]
  discoveryPromptTitle: string
  discoveryPromptDescription: string
  discoveryNextStep: string
  importJson: string
  importJsonHint: string
  importJsonInvalid: string
  priority: Record<MissionPriority, string>
  outcome: Record<MissionDecisionStatus, string>
  route: { agency: string; unknown: string }
  reason: (reason: MissionReason) => string
}

function reasonZh(reason: MissionReason): string {
  const values = reason.values?.join('、') ?? ''
  const pair = reason.values ? `「${reason.values[0]}」可接受，前提是「${reason.values[1]}」` : ''
  const map: Record<MissionReason['code'], string> = {
    region_match: `符合目標地區：${values}`,
    region_tradeoff: '地點不在目前列出的目標地區',
    keyword_match: `符合這次目標：${values}`,
    no_extraction: '尚未擷取工作與生活條件',
    income_unknown: '需要確認月收入', income_below: '月收入低於本次設定的下限', income_meets: '月收入符合本次下限',
    dorm_unknown: '需要確認宿舍費', dorm_above: '宿舍費超過本次上限', dorm_meets: '宿舍費在本次上限內',
    private_room_unknown: '需要確認是否為個室', private_room_missing: '本次要求個室，但職缺不符合', private_room_confirmed: '已確認個室',
    live_in_unknown: '需要確認是否提供住宿', live_in_missing: '本次要求住宿，但職缺不提供', live_in_confirmed: '已確認提供住宿',
    shift_unknown: '需要確認班別', split_shift_blocked: '本次不接受中抜け／split shift',
    night_unknown: '需要確認是否有夜班', night_work_blocked: '本次不接受夜班',
    duration_unknown: '需要確認最低工作期間', duration_too_long: '最低工作期間超出本次可接受範圍',
    tradeoff: pair, not_enough_information: '請先補充這次目標或擷取職缺條件',
  }
  return map[reason.code]
}

function reasonEn(reason: MissionReason): string {
  const values = reason.values?.join(', ') ?? ''
  const pair = reason.values ? `${reason.values[0]} is acceptable when ${reason.values[1]}` : ''
  const map: Record<MissionReason['code'], string> = {
    region_match: `Matches target area: ${values}`, region_tradeoff: 'Outside listed target areas', keyword_match: `Matches this mission: ${values}`,
    no_extraction: 'Work and living conditions are not extracted yet', income_unknown: 'Confirm monthly income', income_below: 'Below this mission’s income minimum', income_meets: 'Meets this mission’s income minimum',
    dorm_unknown: 'Confirm dorm fee', dorm_above: 'Dorm fee exceeds this mission’s maximum', dorm_meets: 'Dorm fee is within this mission’s maximum',
    private_room_unknown: 'Confirm private-room availability', private_room_missing: 'This mission requires a private room', private_room_confirmed: 'Private room confirmed',
    live_in_unknown: 'Confirm live-in housing', live_in_missing: 'This mission requires live-in housing', live_in_confirmed: 'Live-in housing available',
    shift_unknown: 'Confirm shift pattern', split_shift_blocked: 'This mission does not accept split shifts',
    night_unknown: 'Confirm night-work requirement', night_work_blocked: 'This mission does not accept night work',
    duration_unknown: 'Confirm minimum contract term', duration_too_long: 'Minimum term is too long for this mission',
    tradeoff: pair, not_enough_information: 'Add mission conditions or extract this listing first',
  }
  return map[reason.code]
}

function reasonJa(reason: MissionReason): string {
  const values = reason.values?.join('・') ?? ''
  const pair = reason.values ? `「${reason.values[0]}」は「${reason.values[1]}」なら許容` : ''
  const map: Record<MissionReason['code'], string> = {
    region_match: `希望エリアに一致：${values}`, region_tradeoff: '現在の希望エリア外です', keyword_match: `今回の目的に一致：${values}`,
    no_extraction: '勤務・生活条件は未抽出です', income_unknown: '月収の確認が必要です', income_below: '今回の最低月収を下回ります', income_meets: '今回の最低月収を満たします',
    dorm_unknown: '寮費の確認が必要です', dorm_above: '寮費が今回の上限を超えます', dorm_meets: '寮費は今回の上限内です',
    private_room_unknown: '個室かどうかの確認が必要です', private_room_missing: '今回の目的では個室が必要です', private_room_confirmed: '個室を確認済みです',
    live_in_unknown: '住み込み可否の確認が必要です', live_in_missing: '今回の目的では住み込みが必要です', live_in_confirmed: '住み込み可です',
    shift_unknown: 'シフト形態の確認が必要です', split_shift_blocked: '今回の目的では中抜けシフトは不可です',
    night_unknown: '夜勤有無の確認が必要です', night_work_blocked: '今回の目的では夜勤は不可です',
    duration_unknown: '最低勤務期間の確認が必要です', duration_too_long: '最低勤務期間が今回の許容範囲を超えます',
    tradeoff: pair, not_enough_information: '今回の目的を追加するか、求人条件を抽出してください',
  }
  return map[reason.code]
}

const COPY: Record<AppLanguage, MissionCopy> = {
  'zh-TW': {
    manage: '管理這次找工作', create: '建立 Mission', title: '這次找工作的目的', description: '把不會改變的個人資料留在 Profile；把季節、生活體驗、成長目標與可交換條件放在這裡。',
    backToDashboard: '← 回到職缺列表', emptyTitle: '還沒有 Search Mission', emptyDescription: '先設定這次最想體驗什麼、想獲得什麼，以及哪些條件不能接受。', active: '使用中', useForDecisions: '用來評估職缺', edit: '編輯', delete: '刪除', save: '儲存 Mission', cancel: '取消', setup: '建立這次目標', noActive: '尚未設定這次找工作的目的', current: '目前評估目的', priorities: '優先順序',
    targetAreas: '目標地區', experienceGoals: '想體驗的生活', growthGoals: '想獲得的成長', keywords: '職缺比對關鍵字', availability: '可工作期間', from: '開始', until: '結束', descriptionLabel: '一句話描述', constraints: '明確限制', minMonthlyIncome: '最低月收入（JPY）', maxDormFee: '最高宿舍費／月（JPY）', privateRoomRequired: '必須個室', liveInRequired: '必須提供住宿', noSplitShift: '不接受中抜け／split shift', noNightWork: '不接受夜班', maxDuration: '最多可接受工作月數', tradeoffs: '可交換條件', tradeoffsHint: '每行：不理想條件 | 什麼補償下可接受', notes: '其他備註', primaryPriority: '第一優先', secondaryPriority: '第二優先', select: '請選擇',
    priority: { experience: '生活體驗', growth: '日文／職涯成長', savings: '存錢', stability: '工作穩定' }, outcome: { apply: '值得投', confirm: '確認後再投', not_recommended: '不建議投' }, route: { agency: '偵測為仲介／派遣職缺', unknown: '應徵關係待確認' }, reason: reasonZh,
    discoveryModeLabel: '找這次工作的目的',
    discoveryDescription: '先釐清這一段想要的生活、體驗與成長；長期不變的資料仍放在 Profile。',
    discoverySteps: ['把提示交給 AI，回答最多三個必要問題', '確認一到三個這次可選的 Search Mission', '到 Mission 頁建立或調整條件，再回職缺列表看取捨'],
    discoveryPromptTitle: '探索這次的 Search Mission',
    discoveryPromptDescription: '不預設你要走哪條職涯路線；先讓你定義這一段。',
    discoveryNextStep: '把確認後的 Mission 建立在 JobFit，才會開始影響職缺判斷。',
    importJson: '貼上 AI Mission JSON',
    importJsonHint: '只會匯入 Mission 條件；識別碼與時間會由 JobFit 重新建立。',
    importJsonInvalid: '請貼上含有 Mission 名稱的有效 JSON。',
  },
  en: {
    manage: 'Manage this search', create: 'Create Mission', title: 'This search mission', description: 'Keep stable personal facts in your Profile. Put this season’s experience, growth goals, and tradeoffs here.',
    backToDashboard: '← Back to job list', emptyTitle: 'No Search Mission yet', emptyDescription: 'Set what you want to experience, gain, and avoid in this search.', active: 'Active', useForDecisions: 'Use for job decisions', edit: 'Edit', delete: 'Delete', save: 'Save Mission', cancel: 'Cancel', setup: 'Set up this search', noActive: 'Set a purpose for this search first', current: 'Current decision purpose', priorities: 'Priorities',
    targetAreas: 'Target areas', experienceGoals: 'Experiences to seek', growthGoals: 'Growth to seek', keywords: 'Listing match keywords', availability: 'Availability', from: 'From', until: 'Until', descriptionLabel: 'One-line description', constraints: 'Explicit constraints', minMonthlyIncome: 'Minimum monthly income (JPY)', maxDormFee: 'Maximum dorm fee / month (JPY)', privateRoomRequired: 'Private room required', liveInRequired: 'Live-in housing required', noSplitShift: 'Do not accept split shifts', noNightWork: 'Do not accept night work', maxDuration: 'Maximum acceptable months', tradeoffs: 'Acceptable tradeoffs', tradeoffsHint: 'One per line: less-ideal condition | acceptable compensation', notes: 'Other notes', primaryPriority: 'Primary priority', secondaryPriority: 'Secondary priority', select: 'Select',
    priority: { experience: 'Life experience', growth: 'Japanese / career growth', savings: 'Savings', stability: 'Work stability' }, outcome: { apply: 'Worth applying', confirm: 'Confirm before applying', not_recommended: 'Not recommended' }, route: { agency: 'Agency / staffing listing detected', unknown: 'Application relationship needs confirmation' }, reason: reasonEn,
    discoveryModeLabel: 'Find this search purpose',
    discoveryDescription: 'Clarify the life experience, growth, and tradeoffs for this search. Stable facts still belong in your Profile.',
    discoverySteps: ['Give the prompt to AI and answer up to three necessary questions', 'Confirm one to three possible Search Missions for this period', 'Create or adjust the Mission, then return to the job list to see the tradeoffs'],
    discoveryPromptTitle: 'Explore this Search Mission',
    discoveryPromptDescription: 'Start with what this period is for, not an assumed career path.',
    discoveryNextStep: 'Create the confirmed Mission in JobFit before it affects job decisions.',
    importJson: 'Paste AI Mission JSON',
    importJsonHint: 'Only Mission conditions are imported. JobFit creates the local ID and timestamps.',
    importJsonInvalid: 'Paste valid JSON with a Mission name.',
  },
  ja: {
    manage: '今回の目的を管理', create: 'Mission を作成', title: '今回の仕事探しの目的', description: '変わりにくい個人情報は Profile に、季節・生活体験・成長目標・交換条件はここに保存します。',
    backToDashboard: '← 求人一覧へ', emptyTitle: 'Search Mission がありません', emptyDescription: '今回得たい体験・成長と、受け入れられない条件を設定してください。', active: '使用中', useForDecisions: '求人判断に使う', edit: '編集', delete: '削除', save: 'Mission を保存', cancel: 'キャンセル', setup: '今回の目的を作成', noActive: '今回の仕事探しの目的を先に設定してください', current: '現在の判断目的', priorities: '優先順位',
    targetAreas: '希望エリア', experienceGoals: '得たい生活体験', growthGoals: '得たい成長', keywords: '求人照合キーワード', availability: '勤務可能期間', from: '開始', until: '終了', descriptionLabel: '一言の説明', constraints: '明確な条件', minMonthlyIncome: '最低月収（JPY）', maxDormFee: '最大寮費／月（JPY）', privateRoomRequired: '個室必須', liveInRequired: '住み込み必須', noSplitShift: '中抜け不可', noNightWork: '夜勤不可', maxDuration: '許容できる最長勤務月数', tradeoffs: '交換可能な条件', tradeoffsHint: '1行ごと：理想でない条件 | 許容できる補償', notes: 'その他メモ', primaryPriority: '第一優先', secondaryPriority: '第二優先', select: '選択してください',
    priority: { experience: '生活体験', growth: '日本語／キャリア成長', savings: '貯金', stability: '仕事の安定' }, outcome: { apply: '応募候補', confirm: '確認後に応募', not_recommended: '非推奨' }, route: { agency: '派遣・紹介求人を検出', unknown: '応募形態は要確認' }, reason: reasonJa,
    discoveryModeLabel: '今回の目的を探す',
    discoveryDescription: 'この期間に得たい体験・成長・許容できる条件を先に整理します。変わりにくい情報は Profile に残します。',
    discoverySteps: ['AI にプロンプトを渡し、必要な質問だけに答える', 'この期間の Search Mission を一から三件に絞る', 'Mission を JobFit に作成してから、求人一覧で条件を確認する'],
    discoveryPromptTitle: '今回の Search Mission を探す',
    discoveryPromptDescription: '決め打ちのキャリア路線からではなく、この期間の目的から始めます。',
    discoveryNextStep: '確認した Mission を JobFit に作成すると、求人判断に使われます。',
    importJson: 'AI Mission JSON を貼り付け',
    importJsonHint: 'Mission の条件だけを取り込みます。ID と日時は JobFit が作成します。',
    importJsonInvalid: 'Mission 名を含む有効な JSON を貼り付けてください。',
  },
}

export function getMissionCopy(language: AppLanguage): MissionCopy {
  return COPY[language]
}
