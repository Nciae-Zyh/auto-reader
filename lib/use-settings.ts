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
  const [serverApiKey, setServerApiKey] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check server mode from config-check API
    fetch("/api/config-check")
      .then((res) => res.json())
      .then((data) => {
        setServerMode(data.serverMode || false);
        setServerApiKey(data.hasApiKey || false);
      })
      .catch(() => {});

    // Load local settings
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch {}
  }, []);

  // In server mode with API key configured, the server handles everything
  // In local mode, we need the API key from settings
  const hasApiKey = serverMode ? serverApiKey : !!settings.apiKey;
  const apiKey = serverMode ? "" : settings.apiKey; // Don't expose server API key to frontend
  const baseUrl = settings.baseUrl || DEFAULT_BASE_URL;

  return {
    settings,
    apiKey,
    baseUrl,
    mounted,
    serverMode,
    hasApiKey, // Whether API key is available (server-side or client-side)
  };
}
