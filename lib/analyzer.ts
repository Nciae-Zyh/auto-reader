import { chatCompletion } from "./mimo-client";
import { splitArticleForAnalysis } from "./long-text";
import type { ArticleSegment, AnalysisResult } from "./types";

const ANALYSIS_PROMPT = `你是一位专业的有声书导演和音色设计师。你的任务是分析用户提供的文章，将其拆分为适合朗读的段落，并为每个段落设计合适的音色。

**最重要的规则：严格区分旁白和对话！**

1. **分段规则（核心！）**：
   - 旁白（叙述、描写、说明）和对话必须分开，绝对不能混在一起
   - 对话标签（如"他说"、"她问道"、"老板开口说话了"）属于旁白，必须归入旁白段落
   - 只有引号内的内容（如"布鲁诺先生，您现在到集市上去一下"）才是对话
   - 如果一段文字中既有旁白又有对话，必须拆分成多个段落

   示例：
   原文："布鲁诺先生，"老板开口说话了，"您现在到集市上去一下，看看今天早上有什么卖的。"
   正确拆分：
   - 旁白段落："老板开口说话了，"
   - 对话段落："布鲁诺先生，您现在到集市上去一下，看看今天早上有什么卖的。"

2. **角色识别**：
   - 识别所有说话的角色
   - 为每个角色分配一个唯一的 characterId（如 "narrator", "character_1", "character_2"）
   - 旁白统一使用 characterId: "narrator"
   - 旁白的 voiceDescription 必须完全一致，确保声音统一

3. **音色设计**（重要！）：
   为每个角色生成一段音色描述文本，用于 MiMo-V2.5-TTS-VoiceDesign 模型。

   关键规则：
   - 旁白（narrator）的 voiceDescription 必须在所有旁白段落中保持完全一致
   - 每个角色的 voiceDescription 应该体现该角色的独特特征
   - 描述应包含：性别、年龄段、音色质感、说话风格

   示例：
   - 老年男性角色："一位年迈的老先生，嗓音低沉沙哑，语速缓慢而沉稳，充满沧桑感和岁月的智慧"
   - 年轻女性角色："一位年轻女性，声音清亮柔和，语速适中，带着温暖的笑意"
   - 旁白："一位成熟稳重的男性叙述者，声音醇厚有磁性，语速从容，娓娓道来"

4. **风格指令**：
   为每个段落生成一段风格指令，描述这段话应该用什么情绪、语速、语气来朗读。
   注意：风格指令只控制情绪和语速，不改变音色。

   示例：
   - "语速缓慢，语气沉重，带着深深的遗憾"
   - "语速轻快，声音明亮，充满活力和喜悦"
   - "压低声音，语气紧张，像是在密谋什么"

请严格按以下 JSON 格式输出（不要输出其他内容）：
{
  "title": "文章标题（如没有明显标题则根据内容生成）",
  "summary": "一句话概括文章内容",
  "narratorVoice": "旁白的统一音色描述（所有旁白段落必须使用相同的描述）",
  "characters": {
    "characterId": {
      "name": "角色名",
      "voiceDescription": "该角色的音色描述"
    }
  },
  "segments": [
    {
      "type": "narration 或 dialogue",
      "character": "角色名或旁白",
      "characterId": "narrator 或 character_1 等",
      "text": "要朗读的文本（只包含纯文本，不要包含引号）",
      "voiceDescription": "该段落使用的音色描述（与角色的voiceDescription一致）",
      "styleInstruction": "风格指令（情绪、语速、语气等）"
    }
  ]
}

再次强调：对话标签（他说、她问道等）必须归入旁白段落，不能放在对话段落中！`;

const CONTINUATION_PROMPT = `${ANALYSIS_PROMPT}

这是长文本分块分析任务。你现在只分析用户给出的当前文本块，但必须沿用已知角色的 characterId、name、voiceDescription。
如果当前块出现已知角色，必须复用完全相同的 characterId 和 voiceDescription。
如果出现新角色，可以新增 characterId。不要总结或改写前后块，不要输出当前块之外的段落。`;

export async function analyzeArticle(
  article: string,
  apiKey: string,
  baseUrl?: string
): Promise<AnalysisResult> {
  const chunks = splitArticleForAnalysis(article);
  if (chunks.length > 1) {
    return analyzeLongArticle(article, apiKey, baseUrl);
  }

  const content = await chatCompletion(
    apiKey,
    "mimo-v2.5",
    [
      { role: "system", content: ANALYSIS_PROMPT },
      { role: "user", content: article },
    ],
    { type: "json_object" },
    baseUrl
  );

  return normalizeAnalysisResult(JSON.parse(content));
}

export async function analyzeLongArticle(
  article: string,
  apiKey: string,
  baseUrl?: string
): Promise<AnalysisResult> {
  const chunks = splitArticleForAnalysis(article);
  const merged: AnalysisResult = {
    title: "",
    summary: "",
    narratorVoice: "",
    characters: {},
    segments: [],
  };

  for (const chunk of chunks) {
    const knownCharacters = buildCharacterContext(merged);
    const content = await chatCompletion(
      apiKey,
      "mimo-v2.5",
      [
        { role: "system", content: chunk.index === 0 ? ANALYSIS_PROMPT : CONTINUATION_PROMPT },
        {
          role: "user",
          content: [
            `长文本块：${chunk.index + 1}/${chunk.total}`,
            knownCharacters ? `已知角色：${knownCharacters}` : "",
            "当前文本块：",
            chunk.text,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
      { type: "json_object" },
      baseUrl
    );

    mergeAnalysisResult(merged, normalizeAnalysisResult(JSON.parse(content)), chunk.index);
  }

  return normalizeAnalysisResult({
    ...merged,
    title: merged.title || "长文本朗读任务",
    summary: merged.summary || `已拆分为 ${chunks.length} 个分析任务，共 ${merged.segments.length} 个朗读段落`,
  });
}

type RawArticleSegment = Omit<ArticleSegment, "id"> & Partial<Pick<ArticleSegment, "id">>;
type RawAnalysisResult = Omit<AnalysisResult, "segments"> & {
  segments?: RawArticleSegment[];
};

function normalizeAnalysisResult(result: RawAnalysisResult): AnalysisResult {
  result.characters = result.characters || {};
  result.segments = Array.isArray(result.segments) ? result.segments : [];

  // Ensure narrator voice is consistent across all narrator segments
  if (result.narratorVoice) {
    result.segments = result.segments.map(
      (seg: RawArticleSegment) => {
        if (seg.type === "narration" || seg.characterId === "narrator") {
          return { ...seg, voiceDescription: result.narratorVoice };
        }
        return seg;
      }
    );
  }

  // Track first segment per character for voice design vs voice clone
  const firstSegmentPerCharacter = new Map<string, boolean>();
  result.segments = result.segments.map(
    (seg: RawArticleSegment, idx: number) => {
      const charId = seg.characterId || "unknown";
      const isFirst = !firstSegmentPerCharacter.has(charId);
      firstSegmentPerCharacter.set(charId, true);

      // Clean text: remove quotes and narration tags from dialogue
      let cleanText = seg.text;
      if (seg.type === "dialogue") {
        // Remove surrounding quotes
        cleanText = cleanText.replace(/^[""「」『』【】《》（）\(\)]+/, "");
        cleanText = cleanText.replace(/[""「」『』【】《》（）\(\)]+$/, "");
      }

      return {
        ...seg,
        text: cleanText,
        id: `seg-${idx}-${Date.now()}`,
        isFirstOfCharacter: isFirst,
      };
    }
  );

  return result as AnalysisResult;
}

function mergeAnalysisResult(target: AnalysisResult, chunkResult: AnalysisResult, chunkIndex: number) {
  if (chunkIndex === 0) {
    target.title = chunkResult.title || target.title;
    target.summary = chunkResult.summary || target.summary;
    target.narratorVoice = chunkResult.narratorVoice || target.narratorVoice;
  } else if (!target.summary && chunkResult.summary) {
    target.summary = chunkResult.summary;
  }

  if (!target.narratorVoice && chunkResult.narratorVoice) {
    target.narratorVoice = chunkResult.narratorVoice;
  }

  for (const [characterId, character] of Object.entries(chunkResult.characters || {})) {
    if (!target.characters[characterId]) {
      target.characters[characterId] = character;
    }
  }

  const existingCharacterIds = new Set(Object.keys(target.characters));
  for (const segment of chunkResult.segments || []) {
    const normalizedSegment = { ...segment };
    if (normalizedSegment.characterId === "narrator" || normalizedSegment.type === "narration") {
      normalizedSegment.characterId = "narrator";
      normalizedSegment.character = normalizedSegment.character || "旁白";
      normalizedSegment.voiceDescription = target.narratorVoice || normalizedSegment.voiceDescription;
    } else if (!existingCharacterIds.has(normalizedSegment.characterId)) {
      target.characters[normalizedSegment.characterId] = {
        name: normalizedSegment.character,
        voiceDescription: normalizedSegment.voiceDescription,
      };
      existingCharacterIds.add(normalizedSegment.characterId);
    }
    target.segments.push(normalizedSegment);
  }
}

function buildCharacterContext(result: AnalysisResult): string {
  const entries = Object.entries(result.characters || {}).map(
    ([id, character]) =>
      `${id}: ${character.name}，音色：${character.voiceDescription}`
  );

  if (result.narratorVoice) {
    entries.unshift(`narrator: 旁白，音色：${result.narratorVoice}`);
  }

  return entries.join("\n");
}
