"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AudioPlayer, { type AudioPlayerHandle } from "./AudioPlayer";
import { useI18n } from "./I18nProvider";
import type { ArticleSegment, TTSModel } from "@/lib/types";

interface SegmentCardProps {
  segment: ArticleSegment;
  index: number;
  ttsModel: TTSModel;
  baseUrl: string;
  isGeneratingAll?: boolean;
  generationIndex?: number;
  characterAudios?: Map<string, string>;
  onGenerateComplete?: (segmentId: string, audioBase64: string) => void;
  onPlayNext?: () => void;
}

export default function SegmentCard({
  segment,
  index,
  ttsModel,
  baseUrl,
  isGeneratingAll = false,
  generationIndex,
  characterAudios,
  onGenerateComplete,
  onPlayNext,
}: SegmentCardProps) {
  const { t } = useI18n();
  const [audioBase64, setAudioBase64] = useState(segment.audioBase64 || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [effectiveModel, setEffectiveModel] = useState<TTSModel>(ttsModel);
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);

  const isCurrentGenerating = isGeneratingAll && generationIndex === index;
  const isWaiting =
    isGeneratingAll &&
    generationIndex !== undefined &&
    generationIndex < index;

  useEffect(() => {
    if (segment.audioBase64) {
      setAudioBase64(segment.audioBase64);
    }
  }, [segment.audioBase64]);

  // Determine effective model: first segment = voicedesign, subsequent = voiceclone
  useEffect(() => {
    if (segment.isFirstOfCharacter) {
      setEffectiveModel("mimo-v2.5-tts-voicedesign");
    } else {
      setEffectiveModel("mimo-v2.5-tts-voiceclone");
    }
  }, [segment.isFirstOfCharacter]);

  const generateAudio = useCallback(async () => {
    setIsGenerating(true);
    setError("");

    // Get reference audio for voiceclone (first segment of same character)
    const referenceAudio =
      !segment.isFirstOfCharacter && characterAudios
        ? characterAudios.get(segment.characterId)
        : undefined;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment,
          model: ttsModel,
          baseUrl,
          effectiveModel,
          referenceAudio,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "语音合成失败");
      }

      const data = await res.json();
      setAudioBase64(data.audioBase64);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      onGenerateComplete?.(segment.id, data.audioBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : "语音合成失败");
    } finally {
      setIsGenerating(false);
    }
  }, [
    segment,
    ttsModel,
    baseUrl,
    effectiveModel,
    characterAudios,
    onGenerateComplete,
  ]);

  // Auto-generate when it's this segment's turn
  useEffect(() => {
    if (isCurrentGenerating && !audioBase64 && !isGenerating) {
      generateAudio();
    }
  }, [isCurrentGenerating, audioBase64, isGenerating, generateAudio]);

  const isNarration = segment.type === "narration";

  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-300 ${
        isCurrentGenerating
          ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30 shadow-lg shadow-blue-500/10"
          : isWaiting
            ? "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 opacity-60"
            : showSuccess
              ? "border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/30"
              : isNarration
                ? "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isNarration
              ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              : "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300"
          }`}
        >
          {isNarration ? t("narration") : t("dialogue")}
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {segment.character}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          #{index + 1}
        </span>

        {/* Show which model will be used */}
        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
          {segment.isFirstOfCharacter ? t("voiceDesign") : t("voiceClone")}
        </span>

        {isCurrentGenerating && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {t("generatingVoice")}
            </span>
          </div>
        )}

        {showSuccess && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-xs">{t("completed")}</span>
          </div>
        )}
      </div>

      <p
        className={`mb-3 text-sm leading-relaxed transition-colors ${
          isCurrentGenerating
            ? "text-blue-700 dark:text-blue-300"
            : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {segment.text}
      </p>

      {segment.voiceDescription && (
        <div className="mb-2 rounded bg-white/80 p-2 text-xs text-gray-500 dark:bg-gray-700/80 dark:text-gray-400">
          <span className="font-medium">{t("voiceLabel")}</span>
          {segment.voiceDescription}
        </div>
      )}

      {segment.styleInstruction && (
        <div className="mb-3 rounded bg-white/80 p-2 text-xs text-gray-500 dark:bg-gray-700/80 dark:text-gray-400">
          <span className="font-medium">{t("styleLabel")}</span>
          {segment.styleInstruction}
        </div>
      )}

      {error && (
        <div className="mb-3 rounded bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {audioBase64 ? (
        <AudioPlayer
          ref={audioPlayerRef}
          audioBase64={audioBase64}
        />
      ) : (
        <button
          onClick={generateAudio}
          disabled={isGenerating || isCurrentGenerating}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            isCurrentGenerating
              ? "bg-blue-500 text-white cursor-wait"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {isGenerating || isCurrentGenerating ? (
            <>
              <div className="relative">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
              {t("generatingVoice")}
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              {t("generateVoice")}
            </>
          )}
        </button>
      )}
    </div>
  );
}
