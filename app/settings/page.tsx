"use client";

import { useEffect, useState } from "react";
import SettingsForm from "@/components/SettingsForm";

export default function SettingsPage() {
  const [serverMode, setServerMode] = useState(false);

  useEffect(() => {
    // Check if server mode (env vars configured)
    // In client, we can't directly access process.env, so we check via API
    fetch("/api/config-check")
      .then((res) => res.json())
      .then((data) => setServerMode(data.serverMode))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          设置
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          配置您的 MiMo API Key 和语音合成模型
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <SettingsForm serverMode={serverMode} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          使用说明
        </h2>
        <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <li>
            1. 前往{" "}
            <a
              href="https://platform.xiaomimimo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Xiaomi MiMo 开放平台
            </a>{" "}
            注册账号并获取 API Key
          </li>
          <li>2. 将 API Key 粘贴到上方输入框</li>
          <li>3. 配置 API Base URL（默认: https://api.xiaomimimo.com/v1）</li>
          <li>
            4. 选择 TTS 模型（推荐使用"音色设计"，系统会根据语义自动生成最适合的音色）
          </li>
          <li>5. 保存设置后，返回首页开始使用</li>
        </ul>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          环境变量配置（服务器部署）
        </h2>
        <div className="rounded bg-gray-50 p-3 text-xs font-mono text-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <p>MIMO_API_KEY=your_api_key</p>
          <p>MIMO_BASE_URL=https://api.xiaomimimo.com/v1</p>
          <p>MIMO_TTS_MODEL=mimo-v2.5-tts-voicedesign</p>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          设置环境变量后，前端将无法修改这些配置，确保安全性。
        </p>
      </div>
    </div>
  );
}
