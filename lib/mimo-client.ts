import type { TTSModel } from "./types";
import { DEFAULT_BASE_URL } from "./config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  responseFormat?: { type: "json_object" },
  baseUrl?: string
): Promise<string> {
  const apiBase = baseUrl || DEFAULT_BASE_URL;
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
    throw new Error(`MiMo API error (${res.status}): ${error}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
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
  const messages: ChatMessage[] = [];

  if (model === "mimo-v2.5-tts-voicedesign") {
    // VoiceDesign: user message = voice description, assistant message = text
    if (options.voiceDescription) {
      messages.push({ role: "user", content: options.voiceDescription });
    }
    messages.push({ role: "assistant", content: options.text });
  } else if (model === "mimo-v2.5-tts-voiceclone") {
    // VoiceClone: user message = style instruction, assistant message = text
    // Reference audio goes in audio.voice field as DataURL
    if (options.styleInstruction) {
      messages.push({ role: "user", content: options.styleInstruction });
    }
    messages.push({ role: "assistant", content: options.text });
  } else {
    // Prebuilt voice: user message = style instruction
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
    // VoiceClone: reference audio goes in audio.voice as DataURL
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
    throw new Error(`MiMo TTS error (${res.status}): ${error}`);
  }

  const data = await res.json();
  const audioData = data.choices[0]?.message?.audio?.data;
  if (!audioData) {
    throw new Error("No audio data in response");
  }
  return audioData;
}
