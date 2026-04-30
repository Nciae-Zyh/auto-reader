"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/components/I18nProvider";
import AudioPlayer from "@/components/AudioPlayer";
import { useSettings } from "@/lib/use-settings";
import { mergeAudioFiles, downloadBlob } from "@/lib/audio-merger";

interface Segment {
  id: number;
  segment_index: number;
  character_name: string;
  character_id: string;
  segment_type: string;
  text: string;
  voice_description: string;
  style_instruction: string;
  audio_file_key: string;
  isFirstOfCharacter?: boolean;
}

interface Analysis {
  id: number;
  title: string;
  summary: string;
  status: string;
  merged_audio_key: string;
  segment_count: number;
  reading_mode: string;
  tts_model: string;
  created_at: string;
}

export default function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useI18n();
  const { settings, baseUrl } = useSettings();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [mergedAudio, setMergedAudio] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationIndex, setGenerationIndex] = useState(-1);
  const [isMerging, setIsMerging] = useState(false);
  const [characterAudios, setCharacterAudios] = useState<Map<string, string>>(new Map());

  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const characterAudiosRef = useRef(characterAudios);
  characterAudiosRef.current = characterAudios;
  const analysisRef = useRef(analysis);
  analysisRef.current = analysis;

  useEffect(() => {
    params.then(({ id }) => fetchData(id));
  }, []);

  const fetchData = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAnalysis(data.analysis);

      // Mark first segment per character
      const segs = data.segments || [];
      const firstChars = new Set<string>();
      const markedSegs = segs.map((seg: Segment) => {
        const isFirst = !firstChars.has(seg.character_id);
        firstChars.add(seg.character_id);
        return { ...seg, isFirstOfCharacter: isFirst };
      });

      setSegments(markedSegs);

      // Build character audios map from existing audio
      const audioMap = new Map<string, string>();
      markedSegs.forEach((seg: Segment) => {
        if (seg.audio_file_key && seg.isFirstOfCharacter) {
          audioMap.set(seg.character_id, seg.audio_file_key);
        }
      });
      setCharacterAudios(audioMap);

      setMergedAudio(data.mergedAudio || "");
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayNext = useCallback((currentIndex: number) => {
    if (currentIndex < segmentsRef.current.length - 1) {
      setGenerationIndex(currentIndex + 1);
    } else {
      setGenerationIndex(-1);
    }
  }, []);

  const generateSegment = useCallback(
    async (segment: Segment, index: number, audioMap?: Map<string, string>) => {
      const isFirst = segment.isFirstOfCharacter;
      const effectiveModel = isFirst ? "mimo-v2.5-tts-voicedesign" : "mimo-v2.5-tts-voiceclone";
      const map = audioMap || characterAudiosRef.current;
      const referenceAudio = !isFirst ? map.get(segment.character_id) : undefined;

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment: { ...segment, type: segment.segment_type },
          model: settings.ttsModel,
          baseUrl,
          effectiveModel,
          referenceAudio,
          analysisId: analysisRef.current?.id,
          segmentIndex: index,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "TTS failed");
      }

      const data = await res.json();
      return data.audioBase64;
    },
    [baseUrl, settings.ttsModel]
  );

  const handleGenerateAll = async () => {
    if (segments.length === 0) return;

    setIsGeneratingAll(true);
    setError("");
    setGenerationIndex(0);

    const currentSegments = segmentsRef.current;
    const localAudioMap = new Map<string, string>();

    // Collect existing audio
    currentSegments.forEach((seg) => {
      if (seg.audio_file_key && seg.isFirstOfCharacter) {
        localAudioMap.set(seg.character_id, seg.audio_file_key);
      }
    });

    const firstSegments: { seg: Segment; idx: number }[] = [];
    const subsequentSegments: { seg: Segment; idx: number }[] = [];

    currentSegments.forEach((seg, idx) => {
      if (seg.audio_file_key) return;
      if (seg.isFirstOfCharacter) {
        firstSegments.push({ seg, idx });
      } else {
        subsequentSegments.push({ seg, idx });
      }
    });

    const BATCH_SIZE = 3;

    for (let i = 0; i < firstSegments.length; i += BATCH_SIZE) {
      const batch = firstSegments.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async ({ seg, idx }) => {
        try {
          const audioBase64 = await generateSegment(seg, idx, localAudioMap);
          setSegments((prev) => prev.map((s, si) => si === idx ? { ...s, audio_file_key: "generated" } : s));
          if (audioBase64) localAudioMap.set(seg.character_id, "generated");
        } catch {}
      });
      await Promise.all(promises);
    }

    for (let i = 0; i < subsequentSegments.length; i += BATCH_SIZE) {
      const batch = subsequentSegments.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async ({ seg, idx }) => {
        try {
          const audioBase64 = await generateSegment(seg, idx, localAudioMap);
          setSegments((prev) => prev.map((s, si) => si === idx ? { ...s, audio_file_key: "generated" } : s));
        } catch {}
      });
      await Promise.all(promises);
    }

    setIsGeneratingAll(false);
    setGenerationIndex(-1);
  };

  const handleMergeAndDownload = async () => {
    if (!analysis) return;
    setIsMerging(true);
    try {
      const audioPromises = segments.map(async (_seg, idx) => {
        const res = await fetch(`/api/analysis/${analysis.id}/audio?segment=${idx}`);
        if (res.ok) {
          const blob = await res.blob();
          const arrayBuffer = await blob.arrayBuffer();
          return { data: arrayBufferToBase64(arrayBuffer), filename: `segment_${idx}.wav` };
        }
        return null;
      });

      const audioFiles = (await Promise.all(audioPromises)).filter(Boolean) as { data: string; filename: string }[];
      if (audioFiles.length === 0) throw new Error("No audio files");

      const mergedBlob = await mergeAudioFiles(audioFiles);
      const filename = analysis.title ? `${analysis.title}.wav` : `audio_${analysis.id}.wav`;
      downloadBlob(mergedBlob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownloadSegment = async (segIndex: number) => {
    if (!analysis) return;
    const res = await fetch(`/api/analysis/${analysis.id}/audio?segment=${segIndex}`);
    if (res.ok) {
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `segment_${segIndex}.wav`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-8 text-center text-gray-500">Loading...</div>;
  if (error && !analysis) return <div className="mx-auto max-w-4xl px-4 py-8 text-center text-red-500">{error}</div>;

  const generatedCount = segments.filter((s) => s.audio_file_key).length;
  const allGenerated = generatedCount === segments.length && segments.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {analysis?.title || `Analysis #${analysis?.id}`}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{analysis?.summary}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {analysis && new Date(analysis.created_at).toLocaleString()} · {segments.length} segments
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {mergedAudio && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Complete Audio</h3>
          </div>
          <AudioPlayer audioBase64={mergedAudio} />
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleGenerateAll}
          disabled={isGeneratingAll || allGenerated || segments.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGeneratingAll ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : allGenerated ? (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              All Done
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Generate All
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
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Merging...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Merge & Download
              </>
            )}
          </button>
        )}

        {!isGeneratingAll && !allGenerated && generatedCount > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {segments.length - generatedCount} remaining
          </span>
        )}
      </div>

      {/* Progress */}
      {isGeneratingAll && segments.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Progress</span>
            <span>{generatedCount} / {segments.length}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${(generatedCount / segments.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Segments */}
      <div className="space-y-4">
        {segments.map((seg, idx) => {
          const isCurrentGenerating = isGeneratingAll && generationIndex === idx;
          return (
            <div key={seg.id} className={`rounded-lg border p-4 transition-all ${
              isCurrentGenerating
                ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30"
                : seg.segment_type === "narration"
                  ? "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                  : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
            }`}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  seg.segment_type === "narration"
                    ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300"
                }`}>
                  {seg.segment_type === "narration" ? "旁白" : "对话"}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{seg.character_name}</span>
                <span className="text-xs text-gray-400">#{seg.segment_index + 1}</span>
                <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
                  {seg.isFirstOfCharacter ? "音色设计" : "音色克隆"}
                </span>
                {isCurrentGenerating && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">Generating...</span>
                )}
              </div>
              <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">{seg.text}</p>
              {seg.voice_description && <p className="mb-1 text-xs text-gray-500 dark:text-gray-400"><span className="font-medium">Voice:</span> {seg.voice_description}</p>}
              {seg.style_instruction && <p className="text-xs text-gray-500 dark:text-gray-400"><span className="font-medium">Style:</span> {seg.style_instruction}</p>}

              {seg.audio_file_key ? (
                <AudioPlayer audioBase64={seg.audio_file_key} />
              ) : isCurrentGenerating ? (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating audio...
                </div>
              ) : (
                <button
                  onClick={() => handlePlayNext(idx - 1)}
                  disabled={isGeneratingAll}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  Generate
                </button>
              )}
            </div>
          );
        })}
      </div>
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
