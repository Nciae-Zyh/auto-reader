"use client";

import { useEffect, useState } from "react";
import SettingsForm from "@/components/SettingsForm";
import { useI18n } from "@/components/I18nProvider";

export default function SettingsPage() {
  const { t } = useI18n();
  const [serverMode, setServerMode] = useState(false);

  useEffect(() => {
    fetch("/api/config-check")
      .then((res) => res.json())
      .then((data) => setServerMode(data.serverMode))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("settingsTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("settingsDesc")}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <SettingsForm serverMode={serverMode} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          {t("usageGuide")}
        </h2>
        <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <li>
            1. {t("guideStep1")}
          </li>
          <li>2. {t("guideStep2")}</li>
          <li>3. {t("guideStep3")}</li>
          <li>
            4. {t("guideStep4")}
          </li>
          <li>5. {t("guideStep5")}</li>
        </ul>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          {t("envConfig")}
        </h2>
        <div className="rounded bg-gray-50 p-3 text-xs font-mono text-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <p>MIMO_API_KEY=your_api_key</p>
          <p>MIMO_BASE_URL=https://api.xiaomimimo.com/v1</p>
          <p>MIMO_TTS_MODEL=mimo-v2.5-tts-voicedesign</p>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {t("envHint")}
        </p>
      </div>
    </div>
  );
}
