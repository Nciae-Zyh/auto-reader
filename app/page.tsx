"use client";

import { useState, useCallback, useRef } from "react";
import ArticleInput from "@/components/ArticleInput";
import SegmentCard from "@/components/SegmentCard";
import VoiceRecorder from "@/components/VoiceRecorder";
import VoiceUploader from "@/components/VoiceUploader";
import { useSettings } from "@/lib/use-settings";
import { useI18n } from "@/components/I18nProvider";
import { mergeAudioFiles, downloadBlob } from "@/lib/audio-merger";
import type { ArticleSegment, ReadingMode } from "@/lib/types";

export default function Home() {
  const [segments, setSegments] = useState<ArticleSegment[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationIndex, setGenerationIndex] = useState(-1);
  const [isMerging, setIsMerging] = useState(false);
  const [characterAudios, setCharacterAudios] = useState<Map<string, string>>(
    new Map()
  );
  const [readingMode, setReadingMode] = useState<ReadingMode>("ai");
  const [personalVoice, setPersonalVoice] = useState<string>("");

  const { settings, apiKey, baseUrl, mounted } = useSettings();
  const { t } = useI18n();
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const characterAudiosRef = useRef(characterAudios);
  characterAudiosRef.current = characterAudios;
  const personalVoiceRef = useRef(personalVoice);
  personalVoiceRef.current = personalVoice;
  const readingModeRef = useRef(readingMode);
  readingModeRef.current = readingMode;

  const updateSegmentAudio = useCallback(
    (segmentId: string, audioBase64: string) => {
      setSegments((prev) =>
        prev.map((seg) =>
          seg.id === segmentId ? { ...seg, audioBase64 } : seg
        )
      );
    },
    []
  );

  const handleAnalyze = async (article: string) => {
    if (!apiKey) {
      setError(t("errorApiKey"));
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setSegments([]);
    setTitle("");
    setSummary("");
    setCharacterAudios(new Map());

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article, apiKey, baseUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "分析失败");
      }

      const data = await res.json();
      setTitle(data.title || "");
      setSummary(data.summary || "");
      setSegments(data.segments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorAnalyze"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayNext = useCallback((currentIndex: number) => {
    const currentSegments = segmentsRef.current;
    if (currentIndex < currentSegments.length - 1) {
      setGenerationIndex(currentIndex + 1);
    } else {
      setGenerationIndex(-1);
    }
  }, []);

  const generateSegment = useCallback(
    async (
      segment: ArticleSegment,
      index: number,
      audioMap?: Map<string, string>
    ) => {
      const isPersonalMode = readingModeRef.current === "personal";

      let effectiveModel: "mimo-v2.5-tts-voicedesign" | "mimo-v2.5-tts-voiceclone";
      let referenceAudio: string | undefined;

      if (isPersonalMode) {
        // Personal mode: always use voiceclone with user's voice
        effectiveModel = "mimo-v2.5-tts-voiceclone";
        referenceAudio = personalVoiceRef.current;
      } else {
        // AI mode: first segment of character = voicedesign, rest = voiceclone
        const isFirst = segment.isFirstOfCharacter;
        effectiveModel = isFirst
          ? "mimo-v2.5-tts-voicedesign"
          : "mimo-v2.5-tts-voiceclone";

        // Use provided audioMap or fall back to ref
        const map = audioMap || characterAudiosRef.current;
        referenceAudio = !isFirst ? map.get(segment.characterId) : undefined;
      }

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment,
          model: settings.ttsModel,
          apiKey,
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

      // Store first audio of each character for voiceclone (AI mode only)
      if (!isPersonalMode && segment.isFirstOfCharacter && data.audioBase64) {
        // Update both ref and state
        characterAudiosRef.current = new Map(characterAudiosRef.current);
        characterAudiosRef.current.set(segment.characterId, data.audioBase64);
        setCharacterAudios(characterAudiosRef.current);
      }

      return data.audioBase64;
    },
    [apiKey, baseUrl, settings.ttsModel]
  );

  const handleGenerateAll = async () => {
    if (!apiKey) {
      setError(t("errorApiKey"));
      return;
    }

    if (readingMode === "personal" && !personalVoice) {
      setError(t("errorPersonalMode"));
      return;
    }

    setIsGeneratingAll(true);
    setError("");
    setGenerationIndex(0);
    const currentSegments = segmentsRef.current;

    // Local audioMap to track generated audios during this batch
    const localAudioMap = new Map<string, string>();

    // Separate first segments (voicedesign) from subsequent segments (voiceclone)
    const firstSegments: { seg: ArticleSegment; idx: number }[] = [];
    const subsequentSegments: { seg: ArticleSegment; idx: number }[] = [];

    currentSegments.forEach((seg, idx) => {
      if (seg.audioBase64) {
        // Already generated, add to local map
        if (seg.isFirstOfCharacter) {
          localAudioMap.set(seg.characterId, seg.audioBase64);
        }
        return;
      }
      if (seg.isFirstOfCharacter) {
        firstSegments.push({ seg, idx });
      } else {
        subsequentSegments.push({ seg, idx });
      }
    });

    const BATCH_SIZE = 3;

    // Step 1: Generate all first segments (voicedesign) in parallel
    for (let i = 0; i < firstSegments.length; i += BATCH_SIZE) {
      const batch = firstSegments.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async ({ seg, idx }) => {
        try {
          const audioBase64 = await generateSegment(seg, idx, localAudioMap);
          updateSegmentAudio(seg.id, audioBase64);
          // Add to local map for subsequent segments
          if (audioBase64) {
            localAudioMap.set(seg.characterId, audioBase64);
          }
        } catch {
          // Continue
        }
      });
      await Promise.all(promises);
    }

    // Step 2: Generate all subsequent segments (voiceclone) in parallel
    for (let i = 0; i < subsequentSegments.length; i += BATCH_SIZE) {
      const batch = subsequentSegments.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async ({ seg, idx }) => {
        try {
          const audioBase64 = await generateSegment(seg, idx, localAudioMap);
          updateSegmentAudio(seg.id, audioBase64);
        } catch {
          // Continue
        }
      });
      await Promise.all(promises);
    }

    setIsGeneratingAll(false);
    setGenerationIndex(-1);
  };

  const handleAnalyzeAndPlay = async (article: string) => {
    if (!apiKey) {
      setError(t("errorApiKey"));
      return;
    }

    if (readingMode === "personal" && !personalVoice) {
      setError(t("errorPersonalMode"));
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setSegments([]);
    setTitle("");
    setSummary("");
    setCharacterAudios(new Map());

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article, apiKey, baseUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "分析失败");
      }

      const data = await res.json();
      setTitle(data.title || "");
      setSummary(data.summary || "");
      setSegments(data.segments || []);

      setIsAnalyzing(false);

      if (data.segments && data.segments.length > 0) {
        setIsGeneratingAll(true);
        setGenerationIndex(0);

        // Local audioMap to track generated audios
        const localAudioMap = new Map<string, string>();

        // Separate first segments from subsequent segments
        const firstSegs: { seg: ArticleSegment; idx: number }[] = [];
        const subsequentSegs: { seg: ArticleSegment; idx: number }[] = [];

        data.segments.forEach((seg: ArticleSegment, idx: number) => {
          if (seg.isFirstOfCharacter) {
            firstSegs.push({ seg, idx });
          } else {
            subsequentSegs.push({ seg, idx });
          }
        });

        const BATCH_SIZE = 3;

        // Step 1: Generate first segments (voicedesign) in parallel
        for (let i = 0; i < firstSegs.length; i += BATCH_SIZE) {
          const batch = firstSegs.slice(i, i + BATCH_SIZE);
          const promises = batch.map(async ({ seg, idx }) => {
            try {
              const audioBase64 = await generateSegment(seg, idx, localAudioMap);
              setSegments((prev) =>
                prev.map((s, sIdx) =>
                  sIdx === idx ? { ...s, audioBase64 } : s
                )
              );
              // Add to local map for subsequent segments
              if (audioBase64) {
                localAudioMap.set(seg.characterId, audioBase64);
              }
            } catch {
              // Continue
            }
          });
          await Promise.all(promises);
        }

        // Step 2: Generate subsequent segments (voiceclone) in parallel
        for (let i = 0; i < subsequentSegs.length; i += BATCH_SIZE) {
          const batch = subsequentSegs.slice(i, i + BATCH_SIZE);
          const promises = batch.map(async ({ seg, idx }) => {
            try {
              const audioBase64 = await generateSegment(seg, idx, localAudioMap);
              setSegments((prev) =>
                prev.map((s, sIdx) =>
                  sIdx === idx ? { ...s, audioBase64 } : s
                )
              );
            } catch {
              // Continue
            }
          });
          await Promise.all(promises);
        }

        setIsGeneratingAll(false);
        setGenerationIndex(-1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
      setIsAnalyzing(false);
    }
  };

  const handleMergeAndDownload = async () => {
    const audioSegments = segments.filter((s) => s.audioBase64);
    if (audioSegments.length === 0) return;

    setIsMerging(true);
    try {
      const audioFiles = audioSegments.map((seg, idx) => ({
        data: seg.audioBase64!,
        filename: `segment_${idx}.wav`,
      }));

      const mergedBlob = await mergeAudioFiles(audioFiles);
      const filename = title ? `${title}.wav` : "audio_output.wav";
      downloadBlob(mergedBlob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorMerge"));
    } finally {
      setIsMerging(false);
    }
  };

  const generatedCount = segments.filter((s) => s.audioBase64).length;
  const totalCount = segments.length;
  const progress = totalCount > 0 ? (generatedCount / totalCount) * 100 : 0;
  const allGenerated = generatedCount === totalCount && totalCount > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("homeTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("homeDesc")}
        </p>
      </div>

      {mounted && !apiKey && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/30">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t("apiKeyWarning")}{" "}
            <a href="/settings" className="font-medium underline">
              {t("configureLink")}
            </a>
          </p>
        </div>
      )}

      {/* Reading Mode Selector */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
          {t("readingMode")}
        </h3>
        <div className="flex gap-4">
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all ${
              readingMode === "ai"
                ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
            }`}
          >
            <input
              type="radio"
              name="readingMode"
              value="ai"
              checked={readingMode === "ai"}
              onChange={() => setReadingMode("ai")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {t("aiMode")}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("aiModeDesc")}
              </div>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all ${
              readingMode === "personal"
                ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
            }`}
          >
            <input
              type="radio"
              name="readingMode"
              value="personal"
              checked={readingMode === "personal"}
              onChange={() => setReadingMode("personal")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {t("personalMode")}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("personalModeDesc")}
              </div>
            </div>
          </label>
        </div>

        {/* Personal Voice Setup */}
        {readingMode === "personal" && (
          <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-600">
            {personalVoice ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t("voiceReady")}
                </div>
                <button
                  onClick={() => setPersonalVoice("")}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {t("reRecord")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h4 className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {t("recordVoice")}
                    </h4>
                    <VoiceRecorder
                      onRecordingComplete={setPersonalVoice}
                    />
                  </div>
                  <div className="w-px bg-gray-200 dark:bg-gray-600" />
                  <div className="flex-1">
                    <h4 className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {t("uploadVoice")}
                    </h4>
                    <VoiceUploader
                      onUploadComplete={setPersonalVoice}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ArticleInput
        onAnalyze={handleAnalyze}
        onAnalyzeAndPlay={handleAnalyzeAndPlay}
        isLoading={isAnalyzing}
      />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      {segments.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h2>
              )}
              {summary && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {summary}
                </p>
              )}
            </div>
            {readingMode === "personal" && (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                {t("personalBadge")}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {isGeneratingAll && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{t("generateProgress")}</span>
                <span>
                  {generatedCount} / {totalCount}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <button
              onClick={() => handleGenerateAll()}
              disabled={isGeneratingAll || allGenerated}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingAll ? (
                <>
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
                  {t("generating")}
                </>
              ) : allGenerated ? (
                <>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t("allDone")}
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
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  {t("generateAll")}
                </>
              )}
            </button>

            {allGenerated && (
              <button
                onClick={handleMergeAndDownload}
                disabled={isMerging}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMerging ? (
                  <>
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
                    {t("merging")}
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
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t("downloadAudio")}
                  </>
                )}
              </button>
            )}

            {!isGeneratingAll && !allGenerated && generatedCount > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t("remaining", { count: totalCount - generatedCount })}
              </span>
            )}
          </div>

          {/* Segments */}
          <div className="space-y-4">
            {segments.map((segment, index) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
                index={index}
                ttsModel={settings.ttsModel}
                apiKey={apiKey}
                baseUrl={baseUrl}
                isGeneratingAll={isGeneratingAll}
                generationIndex={generationIndex}
                characterAudios={characterAudios}
                onGenerateComplete={updateSegmentAudio}
                onPlayNext={() => handlePlayNext(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
