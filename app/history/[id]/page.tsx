"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/components/I18nProvider";
import AudioPlayer from "@/components/AudioPlayer";

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

interface Article {
  article_text: string;
  narrator_voice: string;
}

export default function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useI18n();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [mergedAudio, setMergedAudio] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id }) => fetchData(id));
  }, []);

  const fetchData = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAnalysis(data.analysis);
      setArticle(data.article);
      setSegments(data.segments || []);
      setMergedAudio(data.mergedAudio || "");
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (segmentIndex?: number) => {
    const url = segmentIndex !== undefined
      ? `/api/analysis/${analysis?.id}/audio?segment=${segmentIndex}`
      : `/api/analysis/${analysis?.id}/audio`;

    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = segmentIndex !== undefined
        ? `segment_${segmentIndex}.wav`
        : `${analysis?.title || "audio"}.wav`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-8 text-center text-gray-500">Loading...</div>;
  if (error || !analysis) return <div className="mx-auto max-w-4xl px-4 py-8 text-center text-red-500">{error || "Not found"}</div>;

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

      {mergedAudio && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Complete Audio</h3>
            <button onClick={() => handleDownload()} className="text-xs text-green-600 hover:underline dark:text-green-400">Download</button>
          </div>
          <AudioPlayer audioBase64={mergedAudio} />
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Segments</h3>
        {segments.map((seg) => (
          <div key={seg.id} className={`rounded-lg border p-4 ${seg.segment_type === "narration" ? "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50" : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"}`}>
            <div className="mb-2 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${seg.segment_type === "narration" ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" : "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300"}`}>
                {seg.segment_type === "narration" ? "旁白" : "对话"}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{seg.character_name}</span>
              <span className="text-xs text-gray-400">#{seg.segment_index + 1}</span>
              {seg.audio_file_key && (
                <button onClick={() => handleDownload(seg.segment_index)} className="ml-auto text-xs text-blue-600 hover:underline dark:text-blue-400">Download</button>
              )}
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
