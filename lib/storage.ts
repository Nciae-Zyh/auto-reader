import type { CloudflareEnv } from "./db-types";
import * as fs from "fs";
import * as path from "path";

const LOCAL_DATA_DIR = ".data/storage";

/**
 * Save audio from base64 string to storage
 */
export async function saveAudioFromBase64(
  env: CloudflareEnv | undefined,
  key: string,
  base64Data: string
): Promise<string> {
  const binaryData = atob(base64Data);
  const bytes = new Uint8Array(binaryData.length);
  for (let i = 0; i < binaryData.length; i++) {
    bytes[i] = binaryData.charCodeAt(i);
  }
  return saveAudio(env, key, bytes, "audio/wav");
}

/**
 * Save audio file to storage (R2 or local filesystem)
 */
export async function saveAudio(
  env: CloudflareEnv | undefined,
  key: string,
  data: ArrayBuffer | Uint8Array,
  contentType = "audio/wav"
): Promise<string> {
  const r2 = env?.AUDIO_BUCKET;

  if (r2) {
    const arrayBuffer = data instanceof ArrayBuffer ? data.slice(0) : new Uint8Array(data).buffer.slice(0);
    await r2.put(key, arrayBuffer, { httpMetadata: { contentType } });
    return key;
  } else {
    const filePath = path.join(LOCAL_DATA_DIR, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data);
    fs.writeFileSync(filePath, buffer);
    return key;
  }
}

/**
 * Get audio file from storage
 */
export async function getAudio(
  env: CloudflareEnv | undefined,
  key: string
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const r2 = env?.AUDIO_BUCKET;

  if (r2) {
    const obj = await r2.get(key);
    if (!obj) return null;
    return { data: await obj.arrayBuffer(), contentType: "audio/wav" };
  } else {
    const filePath = path.join(LOCAL_DATA_DIR, key);
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath);
    return { data: data.buffer, contentType: "audio/wav" };
  }
}

/**
 * Get audio as base64
 */
export async function getAudioAsBase64(
  env: CloudflareEnv | undefined,
  key: string
): Promise<string | null> {
  const audio = await getAudio(env, key);
  if (!audio) return null;
  const bytes = new Uint8Array(audio.data);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Delete audio file from storage
 */
export async function deleteAudio(
  env: CloudflareEnv | undefined,
  key: string
): Promise<void> {
  const r2 = env?.AUDIO_BUCKET;
  if (r2) {
    await r2.delete(key);
  } else {
    const filePath = path.join(LOCAL_DATA_DIR, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

/**
 * Generate storage key for user's audio
 */
export function generateAudioKey(userId: number, recordId: number, segmentIndex?: number): string {
  if (segmentIndex !== undefined) {
    return `audio/${userId}/${recordId}/segment_${segmentIndex}.wav`;
  }
  return `audio/${userId}/${recordId}/merged.wav`;
}
