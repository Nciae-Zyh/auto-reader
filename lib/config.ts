export interface AppConfig {
  apiKey: string;
  baseUrl: string;
  ttsModel: string;
}

const DEFAULT_BASE_URL = "https://api.xiaomimimo.com/v1";
const STORAGE_KEY = "auto-reader-settings";

/**
 * Get config from environment variables (server-side only)
 */
export function getServerConfig(): Partial<AppConfig> {
  if (typeof window !== "undefined") {
    return {};
  }

  return {
    apiKey: process.env.MIMO_API_KEY || "",
    baseUrl: process.env.MIMO_BASE_URL || DEFAULT_BASE_URL,
    ttsModel: process.env.MIMO_TTS_MODEL || "",
  };
}

/**
 * Get config from localStorage (client-side only)
 */
export function getClientConfig(): Partial<AppConfig> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return {};
}

/**
 * Get merged config: server env vars take precedence over client settings
 */
export function getConfig(): AppConfig {
  const server = getServerConfig();
  const client = getClientConfig();

  return {
    apiKey: server.apiKey || client.apiKey || "",
    baseUrl: server.baseUrl || client.baseUrl || DEFAULT_BASE_URL,
    ttsModel: server.ttsModel || client.ttsModel || "mimo-v2.5-tts-voicedesign",
  };
}

/**
 * Check if running in server-only mode (env vars configured, no frontend settings)
 */
export function isServerMode(): boolean {
  if (typeof window !== "undefined") {
    return false;
  }
  return !!process.env.MIMO_API_KEY;
}

export { DEFAULT_BASE_URL };
