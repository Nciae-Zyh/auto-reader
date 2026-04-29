"use client";

import { useEffect, useState } from "react";
import SettingsForm from "@/components/SettingsForm";
import { useI18n } from "@/components/I18nProvider";

interface ConfigStatus {
  serverMode: boolean;
  googleAuthEnabled: boolean;
  googleClientId: string;
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [config, setConfig] = useState<ConfigStatus>({
    serverMode: false,
    googleAuthEnabled: false,
    googleClientId: "",
  });

  useEffect(() => {
    fetch("/api/config-check")
      .then((res) => res.json())
      .then((data) => setConfig(data))
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

      {/* Server Mode Status */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Deployment Mode
        </h3>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              config.serverMode ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {config.serverMode ? "Server Mode (Cloudflare)" : "Local Mode"}
          </span>
        </div>
        {config.serverMode && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            API Key and settings are configured via environment variables.
            Frontend settings are disabled.
          </p>
        )}
        {!config.serverMode && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Running locally. Settings are stored in browser localStorage.
          </p>
        )}
      </div>

      {/* Google Auth Status */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Google OAuth
        </h3>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              config.googleAuthEnabled ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {config.googleAuthEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        {!config.googleAuthEnabled && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google login.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <SettingsForm serverMode={config.serverMode} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <SettingsForm serverMode={config.serverMode} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          {t("usageGuide")}
        </h2>
        <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <li>1. {t("guideStep1")}</li>
          <li>2. {t("guideStep2")}</li>
          <li>3. {t("guideStep3")}</li>
          <li>4. {t("guideStep4")}</li>
          <li>5. {t("guideStep5")}</li>
        </ul>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Environment Variables
        </h2>
        <div className="rounded bg-gray-50 p-3 text-xs font-mono text-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <p className="mb-2 text-gray-400"># Required</p>
          <p>MIMO_API_KEY=your_api_key</p>
          <p className="mt-2 mb-2 text-gray-400"># Server Mode (enable D1/R2/Google Auth)</p>
          <p>SERVER_MODE=true</p>
          <p className="mt-2 mb-2 text-gray-400"># Google OAuth (optional)</p>
          <p>GOOGLE_CLIENT_ID=your_client_id</p>
          <p>GOOGLE_CLIENT_SECRET=your_client_secret</p>
          <p className="mt-2 mb-2 text-gray-400"># Optional</p>
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
