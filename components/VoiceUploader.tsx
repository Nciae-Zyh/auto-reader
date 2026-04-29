"use client";

import { useState, useRef } from "react";

interface VoiceUploaderProps {
  onUploadComplete: (audioBase64: string) => void;
}

export default function VoiceUploader({ onUploadComplete }: VoiceUploaderProps) {
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);

    // Validate file type
    const validTypes = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/webm"];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|webm)$/i)) {
      setError("仅支持 WAV、MP3、WebM 格式的音频文件");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("音频文件不能超过 10MB");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      onUploadComplete(base64);
    } catch {
      setError("读取文件失败，请重试");
    }
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  return (
    <div className="space-y-3">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          上传音频文件
        </button>
      </div>

      {fileName && !error && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {fileName}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        支持 WAV、MP3、WebM 格式，最大 10MB
      </p>
    </div>
  );
}
