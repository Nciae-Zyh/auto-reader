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

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch {}
  }, []);

  const apiKey = settings.apiKey;
  const baseUrl = settings.baseUrl || DEFAULT_BASE_URL;

  return { settings, apiKey, baseUrl, mounted };
}
