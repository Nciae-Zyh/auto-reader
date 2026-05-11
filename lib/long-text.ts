export interface AnalysisChunk {
  index: number;
  total: number;
  text: string;
}

export const MAX_ANALYSIS_CHUNK_LENGTH = 12000;

const SENTENCE_BOUNDARY = /[。！？.!?][""'')）】』」]*\s*/g;
const SOFT_BOUNDARY = /[，,；;、：:\n]\s*/g;

export function normalizeArticleText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function splitArticleForAnalysis(
  article: string,
  maxLength = MAX_ANALYSIS_CHUNK_LENGTH
): AnalysisChunk[] {
  const normalized = normalizeArticleText(article);
  if (!normalized) return [];

  const paragraphChunks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) => splitOversizedBlock(block, maxLength));

  const chunks: string[] = [];
  let current = "";

  for (const block of paragraphChunks) {
    const separator = current ? "\n\n" : "";
    if (current && current.length + separator.length + block.length > maxLength) {
      chunks.push(current);
      current = block;
    } else {
      current += separator + block;
    }
  }

  if (current) chunks.push(current);

  return chunks.map((text, index) => ({
    index,
    total: chunks.length,
    text,
  }));
}

function splitOversizedBlock(block: string, maxLength: number): string[] {
  if (block.length <= maxLength) return [block];

  const pieces: string[] = [];
  let remaining = block;

  while (remaining.length > maxLength) {
    const splitIndex =
      findLastBoundary(remaining, maxLength, SENTENCE_BOUNDARY) ||
      findLastBoundary(remaining, maxLength, SOFT_BOUNDARY) ||
      maxLength;

    pieces.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trimStart();
  }

  if (remaining) pieces.push(remaining);
  return pieces;
}

function findLastBoundary(text: string, maxLength: number, regex: RegExp): number {
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  let lastGoodSplit = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index + match[0].length <= maxLength) {
      lastGoodSplit = match.index + match[0].length;
    } else {
      break;
    }
  }

  return lastGoodSplit;
}
