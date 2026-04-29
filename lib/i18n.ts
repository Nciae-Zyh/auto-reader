export type Locale = "zh" | "en";

const translations = {
  zh: {
    // Header
    appName: "Auto Reader",
    appDesc: "AI 语音朗读",
    navHome: "首页",
    navSettings: "设置",
    navHistory: "历史记录",

    // Home page
    homeTitle: "文章朗读",
    homeDesc: "粘贴文章，AI 自动分析角色并生成语音朗读",
    apiKeyWarning: "请先配置 MiMo API Key 后再使用。",
    configureLink: "配置",

    // Reading mode
    readingMode: "朗读模式",
    aiMode: "AI 智能模式",
    aiModeDesc: "自动分配不同角色音色",
    personalMode: "个人朗读模式",
    personalModeDesc: "使用您的声音朗读全文",
    voiceReady: "声音已就绪",
    reRecord: "重新录制",
    recordVoice: "录制声音",
    uploadVoice: "上传音频",
    personalBadge: "个人朗读",

    // Article input
    articleLabel: "粘贴文章内容",
    articlePlaceholder:
      "在此粘贴您想要朗读的文章内容...\n\n支持包含多角色对话的小说、故事、新闻等文本。系统会自动识别角色并分配合适的音色。",
    charCount: "{count} 字",
    startAnalyze: "开始分析",
    startGenerate: "开始生成",
    analyzing: "分析中...",
    processing: "处理中...",

    // Controls
    generateAll: "全部生成",
    generating: "生成中...",
    allDone: "全部完成",
    downloadAudio: "下载完整音频",
    merging: "合并中...",
    remaining: "还剩 {count} 个未生成",

    // Progress
    generateProgress: "生成进度",

    // Segment
    narration: "旁白",
    dialogue: "对话",
    voiceDesign: "音色设计",
    voiceClone: "音色克隆",
    voiceLabel: "音色：",
    styleLabel: "风格：",
    generateVoice: "生成语音",
    generatingVoice: "生成中...",
    completed: "完成",

    // Voice recorder
    startRecord: "开始录音",
    recording: "录音中 {time}",
    recordHint: "建议录制 5-10 秒的清晰语音，用于克隆您的音色",
    micError: "无法访问麦克风，请检查浏览器权限设置",

    // Voice uploader
    uploadFile: "上传音频文件",
    uploadHint: "支持 WAV、MP3、WebM 格式，最大 10MB",
    uploadErrorType: "仅支持 WAV、MP3、WebM 格式的音频文件",
    uploadErrorSize: "音频文件不能超过 10MB",
    uploadErrorRead: "读取文件失败，请重试",

    // Settings
    settingsTitle: "设置",
    settingsDesc: "配置您的 MiMo API Key 和语音合成模型",
    apiKeyLabel: "MiMo API Key",
    apiKeyPlaceholder: "请输入您的 MiMo API Key",
    apiKeyGetFrom: "从 Xiaomi MiMo 开放平台获取 API Key",
    baseUrlLabel: "API Base URL",
    baseUrlDefault: "默认",
    baseUrlHint: "如使用代理或自部署可修改",
    ttsModel: "TTS 模型",
    ttsDesign: "音色设计 (推荐)",
    ttsDesignDesc: "根据语义自动生成最适合的音色",
    ttsPreset: "预置音色",
    ttsPresetDesc: "使用内置精品音色（冰糖/茉莉/苏打/白桦等）",
    ttsClone: "音色克隆",
    ttsCloneDesc: "基于音频样本复刻任意音色",
    saveSettings: "保存设置",
    saved: "已保存",
    serverMode: "服务器模式：API Key 和 Base URL 已通过环境变量配置，无需在前端设置。",

    // Settings guide
    usageGuide: "使用说明",
    guideStep1: "前往 Xiaomi MiMo 开放平台注册账号并获取 API Key",
    guideStep2: "将 API Key 粘贴到上方输入框",
    guideStep3: "配置 API Base URL",
    guideStep4: '选择 TTS 模型（推荐使用"音色设计"，系统会根据语义自动生成最适合的音色）',
    guideStep5: "保存设置后，返回首页开始使用",

    // Environment variables
    envConfig: "环境变量配置（服务器部署）",
    envHint: "设置环境变量后，前端将无法修改这些配置，确保安全性。",

    // Errors
    errorApiKey: "请先在设置页面配置 MiMo API Key",
    errorPersonalMode: "个人朗读模式下，请先录制或上传您的声音",
    errorAnalyze: "分析失败",
    errorTts: "语音合成失败",
    errorMerge: "合并音频失败",
  },
  en: {
    // Header
    appName: "Auto Reader",
    appDesc: "AI Voice Reading",
    navHome: "Home",
    navSettings: "Settings",
    navHistory: "History",

    // Home page
    homeTitle: "Article Reading",
    homeDesc: "Paste an article, AI analyzes characters and generates voice reading",
    apiKeyWarning: "Please configure MiMo API Key first.",
    configureLink: "Configure",

    // Reading mode
    readingMode: "Reading Mode",
    aiMode: "AI Smart Mode",
    aiModeDesc: "Auto-assign different character voices",
    personalMode: "Personal Reading Mode",
    personalModeDesc: "Read the entire article with your voice",
    voiceReady: "Voice Ready",
    reRecord: "Re-record",
    recordVoice: "Record Voice",
    uploadVoice: "Upload Audio",
    personalBadge: "Personal Reading",

    // Article input
    articleLabel: "Paste Article Content",
    articlePlaceholder:
      "Paste the article you want to read aloud here...\n\nSupports novels, stories, news with multi-character dialogues. The system will automatically identify characters and assign appropriate voices.",
    charCount: "{count} chars",
    startAnalyze: "Analyze",
    startGenerate: "Generate",
    analyzing: "Analyzing...",
    processing: "Processing...",

    // Controls
    generateAll: "Generate All",
    generating: "Generating...",
    allDone: "All Done",
    downloadAudio: "Download Audio",
    merging: "Merging...",
    remaining: "{count} remaining",

    // Progress
    generateProgress: "Generation Progress",

    // Segment
    narration: "Narration",
    dialogue: "Dialogue",
    voiceDesign: "Voice Design",
    voiceClone: "Voice Clone",
    voiceLabel: "Voice: ",
    styleLabel: "Style: ",
    generateVoice: "Generate Voice",
    generatingVoice: "Generating...",
    completed: "Done",

    // Voice recorder
    startRecord: "Start Recording",
    recording: "Recording {time}",
    recordHint: "Record 5-10 seconds of clear speech for voice cloning",
    micError: "Cannot access microphone, please check browser permissions",

    // Voice uploader
    uploadFile: "Upload Audio File",
    uploadHint: "Supports WAV, MP3, WebM format, max 10MB",
    uploadErrorType: "Only WAV, MP3, WebM audio files are supported",
    uploadErrorSize: "Audio file cannot exceed 10MB",
    uploadErrorRead: "Failed to read file, please try again",

    // Settings
    settingsTitle: "Settings",
    settingsDesc: "Configure your MiMo API Key and TTS model",
    apiKeyLabel: "MiMo API Key",
    apiKeyPlaceholder: "Enter your MiMo API Key",
    apiKeyGetFrom: "Get API Key from Xiaomi MiMo Platform",
    baseUrlLabel: "API Base URL",
    baseUrlDefault: "Default",
    baseUrlHint: "Modify if using proxy or self-deployment",
    ttsModel: "TTS Model",
    ttsDesign: "Voice Design (Recommended)",
    ttsDesignDesc: "Auto-generate the most suitable voice based on semantics",
    ttsPreset: "Preset Voices",
    ttsPresetDesc: "Use built-in premium voices (Bingtang/Jasmine/Soda/Birch etc.)",
    ttsClone: "Voice Clone",
    ttsCloneDesc: "Clone any voice from audio samples",
    saveSettings: "Save Settings",
    saved: "Saved",
    serverMode: "Server Mode: API Key and Base URL are configured via environment variables.",

    // Settings guide
    usageGuide: "Usage Guide",
    guideStep1: "Register at Xiaomi MiMo Platform and get API Key",
    guideStep2: "Paste the API Key into the input field above",
    guideStep3: "Configure API Base URL",
    guideStep4: 'Select TTS model (recommend "Voice Design" for auto-generated voices)',
    guideStep5: "Save settings, then return to home to start using",

    // Environment variables
    envConfig: "Environment Variables (Server Deployment)",
    envHint: "After setting environment variables, frontend cannot modify these configs.",

    // Errors
    errorApiKey: "Please configure MiMo API Key in settings first",
    errorPersonalMode: "In personal mode, please record or upload your voice first",
    errorAnalyze: "Analysis failed",
    errorTts: "Voice synthesis failed",
    errorMerge: "Audio merge failed",
  },
} as const;

export type TranslationKey = keyof typeof translations.zh;

export function t(locale: Locale, key: TranslationKey, params?: Record<string, string | number>): string {
  let text: string = translations[locale]?.[key] || translations.zh[key];
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}
