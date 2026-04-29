const MAX_TTS_LENGTH = 2500;

/**
 * Split text into chunks that fit within TTS limit.
 * Splits at sentence boundaries (。！？.!?) to maintain natural pauses.
 */
export function splitTextForTTS(text: string): string[] {
  if (text.length <= MAX_TTS_LENGTH) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_TTS_LENGTH) {
      chunks.push(remaining);
      break;
    }

    // Find the best split point within the limit
    let splitIndex = -1;

    // Look for sentence endings within the limit
    const sentenceEndings = /[。！？.!?]/g;
    let match;
    let lastGoodSplit = -1;

    while ((match = sentenceEndings.exec(remaining)) !== null) {
      if (match.index < MAX_TTS_LENGTH) {
        lastGoodSplit = match.index + 1;
      } else {
        break;
      }
    }

    if (lastGoodSplit > 0) {
      splitIndex = lastGoodSplit;
    } else {
      // No sentence ending found, split at comma or other punctuation
      const commaEndings = /[，,；;、]/g;
      while ((match = commaEndings.exec(remaining)) !== null) {
        if (match.index < MAX_TTS_LENGTH) {
          lastGoodSplit = match.index + 1;
        } else {
          break;
        }
      }

      if (lastGoodSplit > 0) {
        splitIndex = lastGoodSplit;
      } else {
        // Last resort: split at MAX_TTS_LENGTH
        splitIndex = MAX_TTS_LENGTH;
      }
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex);
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
}
