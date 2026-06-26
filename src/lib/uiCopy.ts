import type { AppLanguage } from './appLanguage'

export type JobStatusKey =
  | 'not_applied'
  | 'applied'
  | 'interview'
  | 'not_interested'

export type UiCopy = {
  common: {
    language: string
    loading: string
    refresh: string
    refreshing: string
    backToDashboard: string
    backToProfiles: string
    clearFilters: string
    delete: string
    deleting: string
    close: string
    cancel: string
    save: string
    active: string
    unknownTime: string
    unnamedJob: string
  }
  status: Record<JobStatusKey, string> & { all: string }
  home: {
    brand: string
    title: string
    subtitle: (count: number) => string
    manageProfiles: string
    importFromAi: string
    searchLabel: string
    searchPlaceholder: string
    scoreLabel: string
    sortLabel: string
    riskOnly: string
    showingCount: (shown: number, total: number) => string
    searchActive: (query: string) => string
    statusFilter: (label: string) => string
    scoreFilter: (label: string) => string
    emptyTitle: string
    emptyDescription: string
    noMatchTitle: string
    noMatchDescription: string
    viewDetails: string
    originalPage: string
    aiFitScore: string
    pendingAnalysis: string
    sourcePrefix: string
    collectedPrefix: string
    scoreFilters: {
      all: string
      high: string
      medium: string
      low: string
      unanalyzed: string
    }
    scoreFilterShort: {
      all: string
      high: string
      medium: string
      low: string
      unanalyzed: string
    }
    sortOptions: {
      newest: string
      oldest: string
      scoreDesc: string
      scoreAsc: string
      companyAsc: string
      titleAsc: string
    }
  }
  dashboard: {
    totalJobs: string
    totalJobsDesc: string
    recentJobsHint: (count: number) => string
    highMatch: string
    highMatchDesc: string
    applied: string
    appliedDesc: string
    interviewing: string
    interviewingDesc: string
    averageScore: string
    averageScoreDesc: string
    unanalyzedHint: (count: number) => string
    risky: string
    riskyDesc: string
  }
  profiles: {
    title: string
    description: string
    activeProfileLabel: string
    createBlank: string
    duplicateActive: string
    importFromAi: string
    resetDefault: string
    loading: string
    setActive: string
    inUse: string
    duplicate: string
    editJson: string
    exportJson: string
    delete: string
    editModalTitle: string
    lastUpdated: string
    unnamedProfile: string
    fields: {
      desiredRoles: string
      desiredLocations: string
      japaneseLevel: string
      employmentTypes: string
      careerGoal: string
    }
  }
  profileImport: {
    title: string
    description: string
    stepsTitle: string
    steps: string[]
    copyPromptTitle: string
    copyPromptDesc: string
    copyPromptButton: string
    promptFollowsAppLanguage: string
    pasteJsonTitle: string
    pasteJsonDesc: string
    importButton: string
    backToProfiles: string
    importSuccessTitle: string
    goToProfiles: string
    importAnother: string
  }
  jobDetail: {
    backToList: string
    openOriginal: string
    pageLabel: string
    overviewTitle: string
    rawContentTitle: string
    rawContentDesc: string
    noRawContent: string
    collectedAt: string
    charCount: (count: number) => string
    notFoundLabel: string
    notFoundTitle: string
    fields: {
      company: string
      location: string
      employmentType: string
      salary: string
      source: string
      collectedAt: string
      charCount: string
      id: string
    }
    statusSection: {
      title: string
      current: (label: string) => string
      saving: string
    }
    activeProfile: {
      label: string
      loading: string
      desiredRoles: string
      desiredLocations: string
      careerGoal: string
      footnote: string
      manage: string
    }
  }
  analysis: {
    centerTitle: string
    centerSubtitle: string
    overviewLabel: string
    fitScore: string
    recommendation: string
    source: string
    lastAnalyzed: string
    notYetAnalyzed: string
    modelComparison: string
    providers: {
      local: string
      gemini: string
      groq: string
    }
    startLabels: {
      local: string
      gemini: string
      groq: string
    }
    resultHeadings: {
      local: string
      gemini: string
      groq: string
    }
    emptyDescriptions: {
      local: string
      gemini: string
      groq: string
    }
    analyzing: string
    regenerating: string
    regenerate: string
    finalRecommendation: string
    scoresAndConsistency: string
    modelConsistency: string
    averageScore: string
    scoreSpread: (spread: number) => string
    insufficientComparison: string
    comparisonFootnote: string
    commonStrengths: string
    commonRisks: string
    suggestedChecks: string
    commonGaps: string
    modelBreakdown: (count: number) => string
    finalSummary: string
    modelRecommendation: string
    mainReasons: string
    riskFactors: string
    suggestedActions: string
    skillGaps: string
    mainConcerns: string
    notAnalyzed: string
    insufficientData: string
    noCommonRisks: string
    noExtraChecks: string
    noCommonGaps: string
  }
}

const UI_COPY: Record<AppLanguage, UiCopy> = {
  'zh-TW': {
    common: {
      language: '語言',
      loading: '載入中...',
      refresh: '重新整理',
      refreshing: '重新整理中...',
      backToDashboard: '← 回儀表板',
      backToProfiles: '← 回 Profiles',
      clearFilters: '清除篩選',
      delete: '刪除',
      deleting: '刪除中...',
      close: '關閉',
      cancel: '取消',
      save: '儲存',
      active: 'Active',
      unknownTime: '未知時間',
      unnamedJob: '未命名職缺',
    },
    status: {
      all: '全部',
      not_applied: '未投遞',
      applied: '已投遞',
      interview: '面試中',
      not_interested: '不感興趣',
    },
    home: {
      brand: 'JobFit AI',
      title: '職缺採集儀表板',
      subtitle: (count) => `目前已採集 ${count} 筆職缺資料`,
      manageProfiles: 'Manage Profiles',
      importFromAi: 'Import from AI',
      searchLabel: '搜尋',
      searchPlaceholder: '搜尋職稱、公司、地點...',
      scoreLabel: '分數',
      sortLabel: '排序',
      riskOnly: '只看有風險',
      showingCount: (shown, total) => `顯示 ${shown} / ${total} 個職缺`,
      searchActive: (query) => `搜尋：「${query}」`,
      statusFilter: (label) => `狀態：${label}`,
      scoreFilter: (label) => `分數：${label}`,
      emptyTitle: '目前還沒有職缺資料',
      emptyDescription:
        '請先使用 Chrome Extension 採集職缺，採集後回到這裡點「重新整理」。',
      noMatchTitle: '找不到符合條件的職缺',
      noMatchDescription:
        '目前的搜尋與篩選條件沒有對應的職缺，請調整條件或清除篩選。',
      viewDetails: '查看詳情 / 分析中心',
      originalPage: '原始頁面',
      aiFitScore: 'AI 適合度',
      pendingAnalysis: '待分析',
      sourcePrefix: '來源：',
      collectedPrefix: '採集：',
      scoreFilters: {
        all: '全部分數',
        high: '高匹配 (≥80)',
        medium: '中匹配 (60-79)',
        low: '低匹配 (<60)',
        unanalyzed: '未分析',
      },
      scoreFilterShort: {
        all: '全部分數',
        high: '高匹配',
        medium: '中匹配',
        low: '低匹配',
        unanalyzed: '未分析',
      },
      sortOptions: {
        newest: '最新新增',
        oldest: '最舊新增',
        scoreDesc: '分數高到低',
        scoreAsc: '分數低到高',
        companyAsc: '公司 A-Z',
        titleAsc: '職稱 A-Z',
      },
    },
    dashboard: {
      totalJobs: '總職缺',
      totalJobsDesc: '已收集的職缺數',
      recentJobsHint: (count) => `近 7 天新增：${count}`,
      highMatch: '高匹配',
      highMatchDesc: 'AI 分數 ≥ 80',
      applied: '已投遞',
      appliedDesc: '已送出申請',
      interviewing: '面試中',
      interviewingDesc: '進行中的面試流程',
      averageScore: '平均分數',
      averageScoreDesc: '已分析職缺平均匹配度',
      unanalyzedHint: (count) => `未分析：${count}`,
      risky: '有風險',
      riskyDesc: '偵測到需確認條件',
    },
    profiles: {
      title: 'Career Profiles',
      description:
        'Manage multiple Japan career profiles and choose which one should be used for job-fit analysis.',
      activeProfileLabel: '使用中的 Profile (Active)',
      createBlank: 'Create Blank Profile',
      duplicateActive: 'Duplicate Active Profile',
      importFromAi: 'Import from AI',
      resetDefault: 'Reset to Default Profiles',
      loading: '載入 Profile 中...',
      setActive: 'Set Active',
      inUse: '使用中',
      duplicate: 'Duplicate',
      editJson: 'Edit JSON',
      exportJson: 'Export JSON',
      delete: 'Delete',
      editModalTitle: 'Edit Profile JSON',
      lastUpdated: '最後更新：',
      unnamedProfile: '未命名 Profile',
      fields: {
        desiredRoles: 'Desired roles',
        desiredLocations: 'Desired locations',
        japaneseLevel: 'Japanese level',
        employmentTypes: 'Employment types',
        careerGoal: 'Career goal / vision',
      },
    },
    profileImport: {
      title: 'Import Profile from External AI',
      description:
        'JobFit-AI 不需要你的原始履歷。你可以在自己信任的 AI 工具中處理敏感的個人文件，只把整理後、結構化的 Profile JSON 貼回來匯入。你的履歷原文不會經過 JobFit-AI。',
      stepsTitle: '操作步驟',
      steps: [
        '複製下方的提示詞 (Prompt)。',
        '貼到你的 AI 助手（ChatGPT / Gemini / Claude）。',
        '在該 AI 工具中上傳或貼上你的履歷 / 職務經歷書 / 作品集等資料。',
        '複製 AI 產生的 JapanCareerProfile JSON。',
        '貼到下方欄位並點「Import Profile」匯入。',
      ],
      copyPromptTitle: '1. 複製提示詞',
      copyPromptDesc: '貼到 ChatGPT / Gemini / Claude，並附上你的求職資料。',
      copyPromptButton: 'Copy Prompt',
      promptFollowsAppLanguage: '提示詞語言跟隨上方語言選擇器',
      pasteJsonTitle: '2. 貼上並匯入 JSON',
      pasteJsonDesc:
        '把 AI 產生的 JapanCareerProfile JSON 貼到下方，然後點「Import Profile」。',
      importButton: 'Import Profile',
      backToProfiles: '返回 Profiles',
      importSuccessTitle: '匯入成功',
      goToProfiles: '前往 Profiles 查看',
      importAnother: '再匯入一個',
    },
    jobDetail: {
      backToList: '← 回到職缺列表',
      openOriginal: '開啟原始職缺',
      pageLabel: 'JobFit AI 職缺詳情',
      overviewTitle: '職缺概覽',
      rawContentTitle: '完整原始職缺內容',
      rawContentDesc: '這是 Chrome Extension 採集到的原始文字內容，預設收合。',
      noRawContent: '這筆職缺沒有原始內容。',
      collectedAt: '採集時間：',
      charCount: (count) => `${count} 字`,
      notFoundLabel: '找不到職缺',
      notFoundTitle: '這筆職缺不存在或已被刪除',
      fields: {
        company: '公司',
        location: '地點',
        employmentType: '雇用形態',
        salary: '薪資',
        source: '來源',
        collectedAt: '採集時間',
        charCount: '內容字數',
        id: 'ID',
      },
      statusSection: {
        title: '應徵狀態',
        current: (label) => `目前：${label}`,
        saving: '儲存中...',
      },
      activeProfile: {
        label: '分析設定檔',
        loading: '載入中…',
        desiredRoles: '期望職種',
        desiredLocations: '期望地點',
        careerGoal: '職涯目標 / 願景',
        footnote: '所有分析都會以此設定檔作為判斷基準。',
        manage: '管理設定檔',
      },
    },
    analysis: {
      centerTitle: 'AI 分析中心',
      centerSubtitle: '選擇分析來源檢視結果。各分析來源獨立保存，互不覆蓋。',
      overviewLabel: 'AI 分析總覽',
      fitScore: '適合度分數',
      recommendation: '推薦程度',
      source: '分析來源',
      lastAnalyzed: '最後分析時間',
      notYetAnalyzed: '尚未分析',
      modelComparison: '模型比較',
      providers: {
        local: '本地分析',
        gemini: 'Gemini',
        groq: 'Groq 70B',
      },
      startLabels: {
        local: '執行本地分析',
        gemini: '開始 Gemini 分析',
        groq: '開始 Groq Llama 70B 分析',
      },
      resultHeadings: {
        local: '本地分析結果',
        gemini: 'Gemini 分析結果',
        groq: 'Groq Llama 70B 分析結果',
      },
      emptyDescriptions: {
        local: '尚未執行本地分析。本地分析使用關鍵字規則，立即可用、不需 API。',
        gemini:
          '尚未進行 Gemini 深度分析。Gemini 會根據完整職缺內容與你的個人檔案產生深度建議。',
        groq: '尚未進行 Groq Llama 70B 分析。Groq 使用精簡輸入，速度快，可作為另一個分析視角。',
      },
      analyzing: '分析中…',
      regenerating: '重新產生中…',
      regenerate: '↻ 重新產生',
      finalRecommendation: '最終建議',
      scoresAndConsistency: '分數與一致性',
      modelConsistency: '模型一致性',
      averageScore: '平均分數',
      scoreSpread: (spread) => `分數差距：${spread} 分`,
      insufficientComparison: '尚無足夠分析結果。請先執行 Gemini 或 Groq 分析。',
      comparisonFootnote: '綜合現有 Local / Gemini / Groq 分析結果，不額外呼叫 AI。',
      commonStrengths: '主要理由（共同優勢）',
      commonRisks: '風險與顧慮（共同風險）',
      suggestedChecks: '建議行動（投遞前確認事項）',
      commonGaps: '共同能力落差',
      modelBreakdown: (count) => `各模型詳細結果（${count}）`,
      finalSummary: '最終建議摘要',
      modelRecommendation: '模型建議',
      mainReasons: '主要理由',
      riskFactors: '風險因素',
      suggestedActions: '建議行動',
      skillGaps: '能力落差',
      mainConcerns: '主要顧慮',
      notAnalyzed: '未分析',
      insufficientData: '尚無足夠資料',
      noCommonRisks: '未偵測到共同風險',
      noExtraChecks: '目前沒有額外確認事項',
      noCommonGaps: '尚無明顯共同落差',
    },
  },
  en: {
    common: {
      language: 'Language',
      loading: 'Loading...',
      refresh: 'Refresh',
      refreshing: 'Refreshing...',
      backToDashboard: '← Back to dashboard',
      backToProfiles: '← Back to Profiles',
      clearFilters: 'Clear filters',
      delete: 'Delete',
      deleting: 'Deleting...',
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      active: 'Active',
      unknownTime: 'Unknown time',
      unnamedJob: 'Untitled job',
    },
    status: {
      all: 'All',
      not_applied: 'Not applied',
      applied: 'Applied',
      interview: 'Interviewing',
      not_interested: 'Not interested',
    },
    home: {
      brand: 'JobFit AI',
      title: 'Job collection dashboard',
      subtitle: (count) => `${count} job${count === 1 ? '' : 's'} collected so far`,
      manageProfiles: 'Manage Profiles',
      importFromAi: 'Import from AI',
      searchLabel: 'Search',
      searchPlaceholder: 'Search title, company, location...',
      scoreLabel: 'Score',
      sortLabel: 'Sort',
      riskOnly: 'Risk only',
      showingCount: (shown, total) => `Showing ${shown} / ${total} jobs`,
      searchActive: (query) => `Search: "${query}"`,
      statusFilter: (label) => `Status: ${label}`,
      scoreFilter: (label) => `Score: ${label}`,
      emptyTitle: 'No jobs yet',
      emptyDescription:
        'Use the Chrome Extension to collect jobs, then return here and click Refresh.',
      noMatchTitle: 'No jobs match your filters',
      noMatchDescription:
        'Try adjusting search or filters, or clear them to see all jobs.',
      viewDetails: 'View details / Analysis',
      originalPage: 'Original page',
      aiFitScore: 'AI fit score',
      pendingAnalysis: 'Not analyzed',
      sourcePrefix: 'Source: ',
      collectedPrefix: 'Collected: ',
      scoreFilters: {
        all: 'All scores',
        high: 'High match (≥80)',
        medium: 'Medium match (60–79)',
        low: 'Low match (<60)',
        unanalyzed: 'Not analyzed',
      },
      scoreFilterShort: {
        all: 'All scores',
        high: 'High match',
        medium: 'Medium match',
        low: 'Low match',
        unanalyzed: 'Not analyzed',
      },
      sortOptions: {
        newest: 'Newest first',
        oldest: 'Oldest first',
        scoreDesc: 'Score high to low',
        scoreAsc: 'Score low to high',
        companyAsc: 'Company A–Z',
        titleAsc: 'Title A–Z',
      },
    },
    dashboard: {
      totalJobs: 'Total jobs',
      totalJobsDesc: 'Jobs in your collection',
      recentJobsHint: (count) => `Added in last 7 days: ${count}`,
      highMatch: 'High match',
      highMatchDesc: 'AI score ≥ 80',
      applied: 'Applied',
      appliedDesc: 'Applications submitted',
      interviewing: 'Interviewing',
      interviewingDesc: 'Active interview processes',
      averageScore: 'Average score',
      averageScoreDesc: 'Average fit among analyzed jobs',
      unanalyzedHint: (count) => `Not analyzed: ${count}`,
      risky: 'At risk',
      riskyDesc: 'Flags needing confirmation',
    },
    profiles: {
      title: 'Career Profiles',
      description:
        'Manage multiple Japan career profiles and choose which one should be used for job-fit analysis.',
      activeProfileLabel: 'Active profile',
      createBlank: 'Create Blank Profile',
      duplicateActive: 'Duplicate Active Profile',
      importFromAi: 'Import from AI',
      resetDefault: 'Reset to Default Profiles',
      loading: 'Loading profiles...',
      setActive: 'Set Active',
      inUse: 'In use',
      duplicate: 'Duplicate',
      editJson: 'Edit JSON',
      exportJson: 'Export JSON',
      delete: 'Delete',
      editModalTitle: 'Edit Profile JSON',
      lastUpdated: 'Last updated: ',
      unnamedProfile: 'Untitled profile',
      fields: {
        desiredRoles: 'Desired roles',
        desiredLocations: 'Desired locations',
        japaneseLevel: 'Japanese level',
        employmentTypes: 'Employment types',
        careerGoal: 'Career goal / vision',
      },
    },
    profileImport: {
      title: 'Import Profile from External AI',
      description:
        'JobFit-AI never needs your raw resume. Process sensitive documents in your trusted AI tool, then paste the structured Profile JSON here. Your original resume text never passes through JobFit-AI.',
      stepsTitle: 'How it works',
      steps: [
        'Copy the prompt below.',
        'Paste it into your AI assistant (ChatGPT / Gemini / Claude).',
        'Upload or paste your resume, work history, portfolio, etc. in that tool.',
        'Copy the JapanCareerProfile JSON the AI produces.',
        'Paste it below and click Import Profile.',
      ],
      copyPromptTitle: '1. Copy the prompt',
      copyPromptDesc:
        'Paste into ChatGPT / Gemini / Claude along with your career materials.',
      copyPromptButton: 'Copy Prompt',
      promptFollowsAppLanguage: 'Prompt language follows the selector above',
      pasteJsonTitle: '2. Paste and import JSON',
      pasteJsonDesc:
        'Paste the JapanCareerProfile JSON below, then click Import Profile.',
      importButton: 'Import Profile',
      backToProfiles: 'Back to Profiles',
      importSuccessTitle: 'Import successful',
      goToProfiles: 'Go to Profiles',
      importAnother: 'Import another',
    },
    jobDetail: {
      backToList: '← Back to job list',
      openOriginal: 'Open original posting',
      pageLabel: 'JobFit AI — Job detail',
      overviewTitle: 'Job overview',
      rawContentTitle: 'Full original posting',
      rawContentDesc:
        'Raw text collected by the Chrome Extension. Collapsed by default.',
      noRawContent: 'This job has no raw content.',
      collectedAt: 'Collected: ',
      charCount: (count) => `${count} chars`,
      notFoundLabel: 'Job not found',
      notFoundTitle: 'This job does not exist or was deleted',
      fields: {
        company: 'Company',
        location: 'Location',
        employmentType: 'Employment type',
        salary: 'Salary',
        source: 'Source',
        collectedAt: 'Collected at',
        charCount: 'Content length',
        id: 'ID',
      },
      statusSection: {
        title: 'Application status',
        current: (label) => `Current: ${label}`,
        saving: 'Saving...',
      },
      activeProfile: {
        label: 'Analysis profile',
        loading: 'Loading…',
        desiredRoles: 'Desired roles',
        desiredLocations: 'Desired locations',
        careerGoal: 'Career goal / vision',
        footnote: 'All analyses use this profile as the baseline.',
        manage: 'Manage profiles',
      },
    },
    analysis: {
      centerTitle: 'AI analysis center',
      centerSubtitle:
        'Pick a source to view results. Each analysis is saved independently.',
      overviewLabel: 'AI analysis overview',
      fitScore: 'Fit score',
      recommendation: 'Recommendation',
      source: 'Analysis source',
      lastAnalyzed: 'Last analyzed',
      notYetAnalyzed: 'Not analyzed yet',
      modelComparison: 'Model comparison',
      providers: {
        local: 'Local analysis',
        gemini: 'Gemini',
        groq: 'Groq 70B',
      },
      startLabels: {
        local: 'Run local analysis',
        gemini: 'Start Gemini analysis',
        groq: 'Start Groq Llama 70B analysis',
      },
      resultHeadings: {
        local: 'Local analysis result',
        gemini: 'Gemini analysis result',
        groq: 'Groq Llama 70B analysis result',
      },
      emptyDescriptions: {
        local:
          'No local analysis yet. Uses keyword rules — instant, no API required.',
        gemini:
          'No Gemini deep analysis yet. Gemini reviews the full posting and your profile.',
        groq:
          'No Groq Llama 70B analysis yet. Groq uses compact input for a fast second opinion.',
      },
      analyzing: 'Analyzing…',
      regenerating: 'Regenerating…',
      regenerate: '↻ Regenerate',
      finalRecommendation: 'Final recommendation',
      scoresAndConsistency: 'Scores & consistency',
      modelConsistency: 'Model consistency',
      averageScore: 'Average score',
      scoreSpread: (spread) => `Score spread: ${spread} pts`,
      insufficientComparison:
        'Not enough results yet. Run Gemini or Groq analysis first.',
      comparisonFootnote:
        'Combines existing Local / Gemini / Groq results — no extra AI call.',
      commonStrengths: 'Key reasons (shared strengths)',
      commonRisks: 'Risks & concerns (shared)',
      suggestedChecks: 'Suggested checks before applying',
      commonGaps: 'Shared skill gaps',
      modelBreakdown: (count) => `Per-model details (${count})`,
      finalSummary: 'Final recommendation summary',
      modelRecommendation: 'Model recommendation',
      mainReasons: 'Key reasons',
      riskFactors: 'Risk factors',
      suggestedActions: 'Suggested actions',
      skillGaps: 'Skill gaps',
      mainConcerns: 'Main concerns',
      notAnalyzed: 'Not analyzed',
      insufficientData: 'Insufficient data',
      noCommonRisks: 'No shared risks detected',
      noExtraChecks: 'No extra checks needed',
      noCommonGaps: 'No obvious shared gaps',
    },
  },
  ja: {
    common: {
      language: '言語',
      loading: '読み込み中...',
      refresh: '更新',
      refreshing: '更新中...',
      backToDashboard: '← ダッシュボードへ',
      backToProfiles: '← Profiles へ',
      clearFilters: 'フィルターをクリア',
      delete: '削除',
      deleting: '削除中...',
      close: '閉じる',
      cancel: 'キャンセル',
      save: '保存',
      active: '使用中',
      unknownTime: '不明な日時',
      unnamedJob: '無題の求人',
    },
    status: {
      all: 'すべて',
      not_applied: '未応募',
      applied: '応募済み',
      interview: '選考中',
      not_interested: '興味なし',
    },
    home: {
      brand: 'JobFit AI',
      title: '求人収集ダッシュボード',
      subtitle: (count) => `現在 ${count} 件の求人を収集済み`,
      manageProfiles: 'Profiles 管理',
      importFromAi: 'AI からインポート',
      searchLabel: '検索',
      searchPlaceholder: '職種、会社、勤務地で検索...',
      scoreLabel: 'スコア',
      sortLabel: '並び替え',
      riskOnly: 'リスクありのみ',
      showingCount: (shown, total) => `${shown} / ${total} 件を表示`,
      searchActive: (query) => `検索：「${query}」`,
      statusFilter: (label) => `ステータス：${label}`,
      scoreFilter: (label) => `スコア：${label}`,
      emptyTitle: '求人データがありません',
      emptyDescription:
        'Chrome 拡張機能で求人を収集し、ここに戻って「更新」をクリックしてください。',
      noMatchTitle: '条件に一致する求人がありません',
      noMatchDescription:
        '検索・フィルター条件を調整するか、フィルターをクリアしてください。',
      viewDetails: '詳細 / 分析センター',
      originalPage: '元のページ',
      aiFitScore: 'AI 適合度',
      pendingAnalysis: '未分析',
      sourcePrefix: 'ソース：',
      collectedPrefix: '収集：',
      scoreFilters: {
        all: 'すべてのスコア',
        high: '高マッチ (≥80)',
        medium: '中マッチ (60–79)',
        low: '低マッチ (<60)',
        unanalyzed: '未分析',
      },
      scoreFilterShort: {
        all: 'すべてのスコア',
        high: '高マッチ',
        medium: '中マッチ',
        low: '低マッチ',
        unanalyzed: '未分析',
      },
      sortOptions: {
        newest: '新しい順',
        oldest: '古い順',
        scoreDesc: 'スコア高い順',
        scoreAsc: 'スコア低い順',
        companyAsc: '会社 A–Z',
        titleAsc: '職種 A–Z',
      },
    },
    dashboard: {
      totalJobs: '総求人数',
      totalJobsDesc: '収集済みの求人数',
      recentJobsHint: (count) => `直近7日で追加：${count}`,
      highMatch: '高マッチ',
      highMatchDesc: 'AI スコア ≥ 80',
      applied: '応募済み',
      appliedDesc: '応募を送信済み',
      interviewing: '選考中',
      interviewingDesc: '進行中の選考',
      averageScore: '平均スコア',
      averageScoreDesc: '分析済み求人の平均適合度',
      unanalyzedHint: (count) => `未分析：${count}`,
      risky: 'リスクあり',
      riskyDesc: '要確認の条件を検出',
    },
    profiles: {
      title: 'Career Profiles',
      description:
        '複数の Japan キャリア Profile を管理し、求人適合度分析に使う Profile を選択します。',
      activeProfileLabel: '使用中の Profile',
      createBlank: '空白 Profile を作成',
      duplicateActive: '使用中 Profile を複製',
      importFromAi: 'AI からインポート',
      resetDefault: 'デフォルト Profile にリセット',
      loading: 'Profile を読み込み中...',
      setActive: '使用中に設定',
      inUse: '使用中',
      duplicate: '複製',
      editJson: 'JSON を編集',
      exportJson: 'JSON をエクスポート',
      delete: '削除',
      editModalTitle: 'Profile JSON を編集',
      lastUpdated: '最終更新：',
      unnamedProfile: '無題の Profile',
      fields: {
        desiredRoles: '希望職種',
        desiredLocations: '希望勤務地',
        japaneseLevel: '日本語レベル',
        employmentTypes: '雇用形態',
        careerGoal: 'キャリア目標 / ビジョン',
      },
    },
    profileImport: {
      title: '外部 AI から Profile をインポート',
      description:
        'JobFit-AI は履歴書原文を必要としません。信頼できる AI ツールで個人資料を処理し、構造化された Profile JSON だけを貼り付けてください。履歴書原文は JobFit-AI を通りません。',
      stepsTitle: '手順',
      steps: [
        '下のプロンプトをコピーします。',
        'AI アシスタント（ChatGPT / Gemini / Claude）に貼り付けます。',
        'そのツールで履歴書 / 職務経歴書 / ポートフォリオ等をアップロードまたは貼り付けます。',
        'AI が生成した JapanCareerProfile JSON をコピーします。',
        '下の欄に貼り付けて「Import Profile」をクリックします。',
      ],
      copyPromptTitle: '1. プロンプトをコピー',
      copyPromptDesc:
        'ChatGPT / Gemini / Claude に貼り付け、求職資料を添付してください。',
      copyPromptButton: 'プロンプトをコピー',
      promptFollowsAppLanguage: 'プロンプト言語は上部の言語選択に従います',
      pasteJsonTitle: '2. JSON を貼り付けてインポート',
      pasteJsonDesc:
        'AI が生成した JapanCareerProfile JSON を下に貼り付け、「Import Profile」をクリックします。',
      importButton: 'Import Profile',
      backToProfiles: 'Profiles に戻る',
      importSuccessTitle: 'インポート成功',
      goToProfiles: 'Profiles を見る',
      importAnother: 'もう1件インポート',
    },
    jobDetail: {
      backToList: '← 求人一覧へ',
      openOriginal: '元の求人を開く',
      pageLabel: 'JobFit AI 求人詳細',
      overviewTitle: '求人概要',
      rawContentTitle: '元の求人全文',
      rawContentDesc:
        'Chrome 拡張機能で収集した原文です。デフォルトで折りたたみます。',
      noRawContent: 'この求人には原文がありません。',
      collectedAt: '収集日時：',
      charCount: (count) => `${count} 文字`,
      notFoundLabel: '求人が見つかりません',
      notFoundTitle: 'この求人は存在しないか、削除されました',
      fields: {
        company: '会社',
        location: '勤務地',
        employmentType: '雇用形態',
        salary: '給与',
        source: 'ソース',
        collectedAt: '収集日時',
        charCount: '文字数',
        id: 'ID',
      },
      statusSection: {
        title: '応募ステータス',
        current: (label) => `現在：${label}`,
        saving: '保存中...',
      },
      activeProfile: {
        label: '分析 Profile',
        loading: '読み込み中…',
        desiredRoles: '希望職種',
        desiredLocations: '希望勤務地',
        careerGoal: 'キャリア目標 / ビジョン',
        footnote: 'すべての分析はこの Profile を基準に行われます。',
        manage: 'Profile を管理',
      },
    },
    analysis: {
      centerTitle: 'AI 分析センター',
      centerSubtitle:
        '分析ソースを選んで結果を表示。各ソースは独立して保存されます。',
      overviewLabel: 'AI 分析概要',
      fitScore: '適合度スコア',
      recommendation: 'おすすめ度',
      source: '分析ソース',
      lastAnalyzed: '最終分析日時',
      notYetAnalyzed: '未分析',
      modelComparison: 'モデル比較',
      providers: {
        local: 'ローカル分析',
        gemini: 'Gemini',
        groq: 'Groq 70B',
      },
      startLabels: {
        local: 'ローカル分析を実行',
        gemini: 'Gemini 分析を開始',
        groq: 'Groq Llama 70B 分析を開始',
      },
      resultHeadings: {
        local: 'ローカル分析結果',
        gemini: 'Gemini 分析結果',
        groq: 'Groq Llama 70B 分析結果',
      },
      emptyDescriptions: {
        local:
          'ローカル分析は未実行です。キーワードルールで即時実行、API 不要。',
        gemini:
          'Gemini 深層分析は未実行です。求人全文と Profile に基づく詳細分析です。',
        groq:
          'Groq Llama 70B 分析は未実行です。コンパクト入力で高速な第二意見を得られます。',
      },
      analyzing: '分析中…',
      regenerating: '再生成中…',
      regenerate: '↻ 再生成',
      finalRecommendation: '最終おすすめ',
      scoresAndConsistency: 'スコアと一貫性',
      modelConsistency: 'モデル一貫性',
      averageScore: '平均スコア',
      scoreSpread: (spread) => `スコア差：${spread} 点`,
      insufficientComparison:
        '分析結果が不足しています。先に Gemini または Groq 分析を実行してください。',
      comparisonFootnote:
        '既存の Local / Gemini / Groq 結果を統合 — 追加の AI 呼び出しなし。',
      commonStrengths: '主な理由（共通の強み）',
      commonRisks: 'リスクと懸念（共通）',
      suggestedChecks: '応募前の確認事項',
      commonGaps: '共通スキルギャップ',
      modelBreakdown: (count) => `モデル別詳細（${count}）`,
      finalSummary: '最終おすすめサマリー',
      modelRecommendation: 'モデルのおすすめ',
      mainReasons: '主な理由',
      riskFactors: 'リスク要因',
      suggestedActions: '推奨アクション',
      skillGaps: 'スキルギャップ',
      mainConcerns: '主な懸念',
      notAnalyzed: '未分析',
      insufficientData: 'データ不足',
      noCommonRisks: '共通リスクは検出されませんでした',
      noExtraChecks: '追加の確認事項はありません',
      noCommonGaps: '明確な共通ギャップはありません',
    },
  },
}

export function getUiCopy(language: AppLanguage): UiCopy {
  return UI_COPY[language]
}
