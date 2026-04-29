"use client";

import { useState, useEffect } from "react";
import {
  type Settings,
  type TTSModel,
  DEFAULT_SETTINGS,
  TTS_MODEL_OPTIONS,
} from "@/lib/types";
import { DEFAULT_BASE_URL } from "@/lib/config";
import { useI18n } from "./I18nProvider";

const STORAGE_KEY = "auto-reader-settings";

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function SettingsForm({ serverMode = false }: { serverMode?: boolean }) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {serverMode && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t("serverMode")}
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="apiKey"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {t("apiKeyLabel")}
        </label>
        <input
          id="apiKey"
          type="password"
          value={settings.apiKey}
          onChange={(e) =>
            setSettings({ ...settings, apiKey: e.target.value })
          }
          placeholder={t("apiKeyPlaceholder")}
          disabled={serverMode}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400"
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {t("apiKeyGetFrom")}
        </p>
      </div>

      <div>
        <label
          htmlFor="baseUrl"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {t("baseUrlLabel")}
        </label>
        <input
          id="baseUrl"
          type="text"
          value={settings.baseUrl || DEFAULT_BASE_URL}
          onChange={(e) =>
            setSettings({ ...settings, baseUrl: e.target.value })
          }
          placeholder={DEFAULT_BASE_URL}
          disabled={serverMode}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400"
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {t("baseUrlDefault")}: {DEFAULT_BASE_URL}（{t("baseUrlHint")}）
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("ttsModel")}
        </label>
        <div className="space-y-3">
          {[
            { value: "mimo-v2.5-tts-voicedesign" as TTSModel, labelKey: "ttsDesign" as const, descKey: "ttsDesignDesc" as const },
            { value: "mimo-v2.5-tts" as TTSModel, labelKey: "ttsPreset" as const, descKey: "ttsPresetDesc" as const },
            { value: "mimo-v2.5-tts-voiceclone" as TTSModel, labelKey: "ttsClone" as const, descKey: "ttsCloneDesc" as const },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                settings.ttsModel === option.value
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
              }`}
            >
              <input
                type="radio"
                name="ttsModel"
                value={option.value}
                checked={settings.ttsModel === option.value}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ttsModel: e.target.value as TTSModel,
                  })
                }
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 dark:text-blue-400"
              />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {t(option.labelKey)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t(option.descKey)}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {!serverMode && (
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {saved ? (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t("saved")}
            </>
          ) : (
            t("saveSettings")
          )}
        </button>
      )}
    </div>
  );
}

export function getSettings(): Settings {
  return loadSettings();
}
