export type TTSModel = "mimo-v2.5-tts" | "mimo-v2.5-tts-voicedesign" | "mimo-v2.5-tts-voiceclone";

export type ReadingMode = "ai" | "personal";

export type SegmentType = "narration" | "dialogue";

export interface ArticleSegment {
  id: string;
  type: SegmentType;
  character: string;
  characterId: string;
  text: string;
  voiceDescription: string;
  styleInstruction: string;
  audioBase64?: string;
  isFirstOfCharacter?: boolean;
}

export interface AnalysisResult {
  title: string;
  summary: string;
  narratorVoice: string;
  characters: Record<string, { name: string; voiceDescription: string }>;
  segments: ArticleSegment[];
}

export interface AnalyzeRequest {
  article: string;
  apiKey: string;
}

export interface TTSRequest {
  segment: ArticleSegment;
  model: TTSModel;
  apiKey: string;
}

export interface Settings {
  apiKey: string;
  baseUrl: string;
  ttsModel: TTSModel;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  baseUrl: "",
  ttsModel: "mimo-v2.5-tts-voicedesign",
};

export const TTS_MODEL_OPTIONS: { value: TTSModel; label: string; description: string }[] = [
  {
    value: "mimo-v2.5-tts-voicedesign",
    label: "音色设计 (推荐)",
    description: "根据语义自动生成最适合的音色",
  },
  {
    value: "mimo-v2.5-tts",
    label: "预置音色",
    description: "使用内置精品音色（冰糖/茉莉/苏打/白桦等）",
  },
  {
    value: "mimo-v2.5-tts-voiceclone",
    label: "音色克隆",
    description: "基于音频样本复刻任意音色",
  },
];

export const PRESET_VOICES = [
  { id: "冰糖", name: "冰糖", language: "中文", gender: "女性" },
  { id: "茉莉", name: "茉莉", language: "中文", gender: "女性" },
  { id: "苏打", name: "苏打", language: "中文", gender: "男性" },
  { id: "白桦", name: "白桦", language: "中文", gender: "男性" },
  { id: "Mia", name: "Mia", language: "英文", gender: "女性" },
  { id: "Chloe", name: "Chloe", language: "英文", gender: "女性" },
  { id: "Milo", name: "Milo", language: "英文", gender: "男性" },
  { id: "Dean", name: "Dean", language: "英文", gender: "男性" },
];
