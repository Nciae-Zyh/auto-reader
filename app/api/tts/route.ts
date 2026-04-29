import { NextRequest, NextResponse } from "next/server";
import { ttsCompletion } from "@/lib/mimo-client";
import { getServerConfig } from "@/lib/config";
import { splitTextForTTS } from "@/lib/text-splitter";
import type { TTSModel, ArticleSegment } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { segment, model, baseUrl, referenceAudio, effectiveModel } =
      (await request.json()) as {
        segment: ArticleSegment;
        model: TTSModel;
        baseUrl?: string;
        referenceAudio?: string;
        effectiveModel?: TTSModel;
      };
    const serverConfig = getServerConfig();

    // Always use server-side API key, never from request
    const apiKey = serverConfig.apiKey;
    const finalBaseUrl = serverConfig.baseUrl || baseUrl;

    if (!segment || !apiKey) {
      return NextResponse.json(
        { error: "分段内容和 API Key 为必填项" },
        { status: 400 }
      );
    }

    const useModel = effectiveModel || model;
    const textChunks = splitTextForTTS(segment.text);

    // If text fits in one chunk, generate directly
    if (textChunks.length === 1) {
      const audioBase64 = await ttsCompletion(
        apiKey,
        useModel,
        {
          text: segment.text,
          voiceDescription:
            useModel === "mimo-v2.5-tts-voicedesign"
              ? segment.voiceDescription
              : undefined,
          styleInstruction:
            useModel !== "mimo-v2.5-tts-voicedesign"
              ? segment.styleInstruction
              : undefined,
          referenceAudio:
            useModel === "mimo-v2.5-tts-voiceclone" ? referenceAudio : undefined,
          format: "wav",
        },
        finalBaseUrl
      );

      return NextResponse.json({ audioBase64 });
    }

    // For long text, generate each chunk and concatenate
    const audioChunks: string[] = [];

    for (const chunk of textChunks) {
      const audioBase64 = await ttsCompletion(
        apiKey,
        useModel,
        {
          text: chunk,
          voiceDescription:
            useModel === "mimo-v2.5-tts-voicedesign"
              ? segment.voiceDescription
              : undefined,
          styleInstruction:
            useModel !== "mimo-v2.5-tts-voicedesign"
              ? segment.styleInstruction
              : undefined,
          referenceAudio:
            useModel === "mimo-v2.5-tts-voiceclone" ? referenceAudio : undefined,
          format: "wav",
        },
        finalBaseUrl
      );

      audioChunks.push(audioBase64);
    }

    // Simple concatenation: merge all base64 audio data
    const mergedAudio = mergeWavBase64(audioChunks);

    return NextResponse.json({ audioBase64: mergedAudio });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "语音合成失败" },
      { status: 500 }
    );
  }
}

/**
 * Merge multiple WAV base64 strings into one.
 */
function mergeWavBase64(chunks: string[]): string {
  if (chunks.length === 0) return "";
  if (chunks.length === 1) return chunks[0];

  const decodedChunks = chunks.map((b64) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  });

  const firstChunk = decodedChunks[0];
  const sampleRate = firstChunk[24] | (firstChunk[25] << 8) | (firstChunk[26] << 16) | (firstChunk[27] << 24);
  const numChannels = firstChunk[22] | (firstChunk[23] << 8);
  const bitsPerSample = firstChunk[34] | (firstChunk[35] << 8);
  const bytesPerSample = bitsPerSample / 8;

  const allPcmData: Uint8Array[] = [];
  for (const chunk of decodedChunks) {
    let dataStart = -1;
    for (let i = 0; i < chunk.length - 4; i++) {
      if (
        chunk[i] === 0x64 &&
        chunk[i + 1] === 0x61 &&
        chunk[i + 2] === 0x74 &&
        chunk[i + 3] === 0x61
      ) {
        dataStart = i + 8;
        break;
      }
    }
    if (dataStart > 0) {
      allPcmData.push(chunk.slice(dataStart));
    }
  }

  const totalPcmSize = allPcmData.reduce((sum, data) => sum + data.length, 0);
  const headerSize = 44;
  const totalSize = headerSize + totalPcmSize;
  const merged = new Uint8Array(totalSize);

  // WAV header
  merged[0] = 0x52; merged[1] = 0x49; merged[2] = 0x46; merged[3] = 0x46;
  merged[4] = (totalSize - 8) & 0xff; merged[5] = ((totalSize - 8) >> 8) & 0xff;
  merged[6] = ((totalSize - 8) >> 16) & 0xff; merged[7] = ((totalSize - 8) >> 24) & 0xff;
  merged[8] = 0x57; merged[9] = 0x41; merged[10] = 0x56; merged[11] = 0x45;
  merged[12] = 0x66; merged[13] = 0x6d; merged[14] = 0x74; merged[15] = 0x20;
  merged[16] = 16; merged[20] = 1;
  merged[22] = numChannels & 0xff; merged[23] = (numChannels >> 8) & 0xff;
  merged[24] = sampleRate & 0xff; merged[25] = (sampleRate >> 8) & 0xff;
  merged[26] = (sampleRate >> 16) & 0xff; merged[27] = (sampleRate >> 24) & 0xff;
  const byteRate = sampleRate * numChannels * bytesPerSample;
  merged[28] = byteRate & 0xff; merged[29] = (byteRate >> 8) & 0xff;
  merged[30] = (byteRate >> 16) & 0xff; merged[31] = (byteRate >> 24) & 0xff;
  merged[32] = numChannels * bytesPerSample;
  merged[34] = bitsPerSample & 0xff; merged[35] = (bitsPerSample >> 8) & 0xff;
  merged[36] = 0x64; merged[37] = 0x61; merged[38] = 0x74; merged[39] = 0x61;
  merged[40] = totalPcmSize & 0xff; merged[41] = (totalPcmSize >> 8) & 0xff;
  merged[42] = (totalPcmSize >> 16) & 0xff; merged[43] = (totalPcmSize >> 24) & 0xff;

  let offset = headerSize;
  for (const pcmData of allPcmData) {
    merged.set(pcmData, offset);
    offset += pcmData.length;
  }

  let binary = "";
  for (let i = 0; i < merged.length; i++) {
    binary += String.fromCharCode(merged[i]);
  }
  return btoa(binary);
}
