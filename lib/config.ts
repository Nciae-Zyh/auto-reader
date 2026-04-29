export interface AppConfig {
  apiKey: string;
  baseUrl: string;
  ttsModel: string;
}

const DEFAULT_BASE_URL = "https://api.xiaomimimo.com/v1";
const STORAGE_KEY = "auto-reader-settings";

/**
 * Check if running in server mode
 * Server mode is enabled when SERVER_MODE=true or when MIMO_API_KEY is set via env
 */
export function isServerMode(): boolean {
  if (typeof window !== "undefined") {
    return false;
  }
  // Check SERVER_MODE env var, or fallback to checking if MIMO_API_KEY is set
  return (
    process.env.SERVER_MODE === "true" ||
    process.env.SERVER_MODE === "1" ||
    !!process.env.MIMO_API_KEY
  );
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleAuthEnabled(): boolean {
  if (typeof window !== "undefined") {
    return false;
  }
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

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
 * Debug: Get all config sources (for troubleshooting)
 */
export function getDebugInfo(): Record<string, unknown> {
  if (typeof window !== "undefined") {
    return { location: "client" };
  }

  return {
    location: "server",
    serverMode: process.env.SERVER_MODE,
    hasApiKey: !!process.env.MIMO_API_KEY,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    baseUrl: process.env.MIMO_BASE_URL || DEFAULT_BASE_URL,
    ttsModel: process.env.MIMO_TTS_MODEL,
  };
}

export { DEFAULT_BASE_URL };
