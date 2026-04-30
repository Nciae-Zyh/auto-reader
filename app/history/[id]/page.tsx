"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/components/I18nProvider";
import AudioPlayer from "@/components/AudioPlayer";
import { useSettings } from "@/lib/use-settings";
import { mergeAudioFiles, downloadBlob } from "@/lib/audio-merger";

interface Segment {
  id: number;
  segment_index: number;
  character_name: string;
  segment_type: string;
  text: string;
  voice_description: string;
  style_instruction: string;
  audio_file_key: string;
}

interface Analysis {
  id: number;
  title: string;
  summary: string;
  status: string;
  merged_audio_key: string;
  segment_count: number;
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
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    params.then(({ id }) => fetchData(id));
  }, []);

  const fetchData = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAnalysis(data.analysis);
      setSegments(data.segments || []);
      setMergedAudio(data.mergedAudio || "");
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (segIndex: number) => {
    setGeneratingIndex(segIndex);
    try {
      const seg = segments[segIndex];
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment: { ...seg, type: seg.segment_type },
          model: settings.ttsModel,
          baseUrl,
          effectiveModel: seg.segment_index === 0 ? "mimo-v2.5-tts-voicedesign" : "mimo-v2.5-tts-voiceclone",
          analysisId: analysis?.id,
          segmentIndex: segIndex,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSegments((prev) => prev.map((s, i) => i === segIndex ? { ...s, audio_file_key: "regenerated" } : s));
        setMergedAudio("");
      }
    } catch {
      setError("Regeneration failed");
    } finally {
      setGeneratingIndex(null);
    }
  };

  const handleMergeAndDownload = async () => {
    if (!analysis) return;
    setIsMerging(true);
    try {
      // Fetch all segment audios as base64
      const audioPromises = segments.map(async (seg, idx) => {
        const res = await fetch(`/api/analysis/${analysis.id}/audio?segment=${idx}`);
        if (res.ok) {
          const blob = await res.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = arrayBufferToBase64(arrayBuffer);
          return { data: base64, filename: `segment_${idx}.wav` };
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

  const handleDownloadMerged = async () => {
    if (!analysis) return;
    const res = await fetch(`/api/analysis/${analysis.id}/audio`);
    if (res.ok) {
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = analysis.title ? `${analysis.title}.wav` : `audio_${analysis.id}.wav`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-8 text-center text-gray-500">Loading...</div>;
  if (error || !analysis) return <div className="mx-auto max-w-4xl px-4 py-8 text-center text-red-500">{error || "Not found"}</div>;

  const allHaveAudio = segments.every((s) => s.audio_file_key);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {analysis.title || `Analysis #${analysis.id}`}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{analysis.summary}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(analysis.created_at).toLocaleString()} · {analysis.segment_count} segments
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Merged Audio */}
      {mergedAudio && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Complete Audio</h3>
            <button onClick={handleDownloadMerged} className="text-xs text-green-600 hover:underline dark:text-green-400">Download</button>
          </div>
          <AudioPlayer audioBase64={mergedAudio} />
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={handleMergeAndDownload}
          disabled={isMerging || !allHaveAudio}
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
        {!allHaveAudio && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Generate all segments first
          </span>
        )}
      </div>

      {/* Segments */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Segments</h3>
        {segments.map((seg, idx) => (
          <div key={seg.id} className={`rounded-lg border p-4 transition-all ${seg.segment_type === "narration" ? "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50" : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"}`}>
            <div className="mb-2 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${seg.segment_type === "narration" ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" : "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300"}`}>
                {seg.segment_type === "narration" ? "旁白" : "对话"}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{seg.character_name}</span>
              <span className="text-xs text-gray-400">#{seg.segment_index + 1}</span>
              <div className="ml-auto flex items-center gap-2">
                {generatingIndex === idx && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">Generating...</span>
                )}
                <button
                  onClick={() => handleRegenerate(idx)}
                  disabled={generatingIndex !== null}
                  className="text-xs text-orange-600 hover:underline dark:text-orange-400 disabled:opacity-50"
                >
                  Regenerate
                </button>
                {seg.audio_file_key && (
                  <button
                    onClick={() => handleDownloadSegment(idx)}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Download
                  </button>
                )}
              </div>
            </div>
            <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">{seg.text}</p>
            {seg.voice_description && <p className="mb-1 text-xs text-gray-500 dark:text-gray-400"><span className="font-medium">Voice:</span> {seg.voice_description}</p>}
            {seg.style_instruction && <p className="text-xs text-gray-500 dark:text-gray-400"><span className="font-medium">Style:</span> {seg.style_instruction}</p>}
          </div>
        ))}
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
