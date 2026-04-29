"use client";

import { useState, useRef, useCallback } from "react";
import { useI18n } from "./I18nProvider";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBase64: string) => void;
}

export default function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const { t } = useI18n();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        onRecordingComplete(base64);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      setError(t("micError"));
    }
  }, [onRecordingComplete, t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            {t("startRecord")}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-gray-700"
          >
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            {t("recording", { time: formatDuration(duration) })}
          </button>
        )}

        {isRecording && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.random() * 12}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("recordHint")}
      </p>
    </div>
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
