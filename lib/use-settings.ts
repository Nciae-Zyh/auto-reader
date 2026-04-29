"use client";

import { useState, useEffect } from "react";
import type { Settings } from "./types";
import { DEFAULT_BASE_URL } from "./config";

const STORAGE_KEY = "auto-reader-settings";

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  baseUrl: "",
  ttsModel: "mimo-v2.5-tts-voicedesign",
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);
  const [serverMode, setServerMode] = useState(false);
  const [serverHasApiKey, setServerHasApiKey] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check server status via API
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => {
        setServerMode(data.serverMode || false);
        setServerHasApiKey(data.hasApiKey || false);
      })
      .catch(() => {});

    // Load local settings from localStorage (only for non-sensitive settings)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only load non-sensitive settings, never load API key from localStorage
        setSettings({
          apiKey: "", // Never load API key from client storage
          baseUrl: parsed.baseUrl || "",
          ttsModel: parsed.ttsModel || "mimo-v2.5-tts-voicedesign",
        });
      }
    } catch {}
  }, []);

  // In server mode: server has the API key, frontend doesn't need it
  // In local mode: user configures API key in settings (stored in localStorage)
  // But we NEVER expose the actual API key value to the frontend
  const hasApiKey = serverMode ? serverHasApiKey : !!settings.apiKey;

  return {
    settings,
    apiKey: "", // NEVER expose API key to frontend
    baseUrl: settings.baseUrl || DEFAULT_BASE_URL,
    mounted,
    serverMode,
    hasApiKey,
  };
}
