import type { R2Bucket, CloudflareEnv } from "./db-types";
import * as fs from "fs";
import * as path from "path";

const LOCAL_DATA_DIR = ".data/storage";

/**
 * Get R2 bucket from Cloudflare environment
 */
export function getR2FromEnv(env: CloudflareEnv): R2Bucket | undefined {
  return env?.AUDIO_BUCKET;
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
    // Cloudflare R2 - create a new ArrayBuffer from the data
    const arrayBuffer = data instanceof ArrayBuffer
      ? data.slice(0)
      : new Uint8Array(data).buffer.slice(0);
    await r2.put(key, arrayBuffer, {
      httpMetadata: { contentType },
    });
    return key;
  } else {
    // Local filesystem
    const filePath = path.join(LOCAL_DATA_DIR, key);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

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
    // Cloudflare R2
    const obj = await r2.get(key);
    if (!obj) return null;

    const data = await obj.arrayBuffer();
    return {
      data,
      contentType: "audio/wav",
    };
  } else {
    // Local filesystem
    const filePath = path.join(LOCAL_DATA_DIR, key);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const data = fs.readFileSync(filePath);
    return {
      data: data.buffer,
      contentType: "audio/wav",
    };
  }
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
    // Cloudflare R2
    await r2.delete(key);
  } else {
    // Local filesystem
    const filePath = path.join(LOCAL_DATA_DIR, key);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * Generate storage key for user's audio
 */
export function generateAudioKey(userId: number, recordId: number): string {
  return `audio/${userId}/${recordId}.wav`;
}
