import type { TTSModel } from "./types";
import { DEFAULT_BASE_URL } from "./config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  // Retry on 500 errors, network errors, or format errors
  return (
    errorMessage.includes("500") ||
    errorMessage.includes("Internal server error") ||
    errorMessage.includes("Format not recognised") ||
    errorMessage.includes("ECONNRESET") ||
    errorMessage.includes("ETIMEDOUT")
  );
}

export async function chatCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  responseFormat?: { type: "json_object" },
  baseUrl?: string
): Promise<string> {
  const apiBase = baseUrl || DEFAULT_BASE_URL;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${apiBase}/chat/completions`, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          ...(responseFormat && { response_format: responseFormat }),
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
          console.log(`Chat API error ${res.status}, retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        throw new Error(`MiMo API error (${res.status}): ${error}`);
      }

      const data = await res.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`Chat API error, retrying in ${delay}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  throw new Error("Max retries exceeded");
}

export interface TTSOptions {
  text: string;
  voiceDescription?: string;
  styleInstruction?: string;
  voice?: string;
  referenceAudio?: string;
  format?: "wav" | "pcm16";
  stream?: boolean;
}

export async function ttsCompletion(
  apiKey: string,
  model: TTSModel,
  options: TTSOptions,
  baseUrl?: string
): Promise<string> {
  const apiBase = baseUrl || DEFAULT_BASE_URL;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const messages: ChatMessage[] = [];

      if (model === "mimo-v2.5-tts-voicedesign") {
        if (options.voiceDescription) {
          messages.push({ role: "user", content: options.voiceDescription });
        }
        messages.push({ role: "assistant", content: options.text });
      } else if (model === "mimo-v2.5-tts-voiceclone") {
        if (options.styleInstruction) {
          messages.push({ role: "user", content: options.styleInstruction });
        }
        messages.push({ role: "assistant", content: options.text });
      } else {
        if (options.styleInstruction) {
          messages.push({ role: "user", content: options.styleInstruction });
        }
        messages.push({ role: "assistant", content: options.text });
      }

      const audioConfig: Record<string, unknown> = {
        format: options.format || "wav",
      };

      if (model === "mimo-v2.5-tts" && options.voice) {
        audioConfig.voice = options.voice;
      } else if (model === "mimo-v2.5-tts-voiceclone" && options.referenceAudio) {
        audioConfig.voice = options.referenceAudio.startsWith("data:")
          ? options.referenceAudio
          : `data:audio/wav;base64,${options.referenceAudio}`;
      }

      const res = await fetch(`${apiBase}/chat/completions`, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          audio: audioConfig,
          stream: options.stream || false,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
          console.log(`TTS API error ${res.status}, retrying in ${delay}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          continue;
        }
        throw new Error(`MiMo TTS error (${res.status}): ${error}`);
      }

      const data = await res.json();
      const audioData = data.choices[0]?.message?.audio?.data;
      if (!audioData) {
        throw new Error("No audio data in response");
      }
      return audioData;
    } catch (error) {
      if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`TTS API error, retrying in ${delay}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  throw new Error("Max retries exceeded");
}
