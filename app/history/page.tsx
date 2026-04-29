"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/components/I18nProvider";

interface HistoryRecord {
  id: number;
  title: string;
  article_text: string;
  reading_mode: string;
  tts_model: string;
  status: string;
  audio_file_key: string;
  segment_count: number;
  created_at: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string;
}

export default function HistoryPage() {
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    fetchUser();
    fetchHistory();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
    } catch {
      // Not logged in
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.records || []);
      }
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (record: HistoryRecord) => {
    if (!record.audio_file_key) return;

    setDownloading(record.id);
    try {
      const res = await fetch(`/api/history/download?recordId=${record.id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = record.title ? `${record.title}.wav` : `audio_${record.id}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Error
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            Please login to view your history
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Generation History
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View and download your previous generations
        </p>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No generation records yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => (
            <div
              key={record.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {record.title || `Record #${record.id}`}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {record.article_text.substring(0, 150)}...
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                    <span>{formatDate(record.created_at)}</span>
                    <span>{record.segment_count} segments</span>
                    <span>{record.reading_mode === "ai" ? "AI Mode" : "Personal"}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        record.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                </div>
                {record.audio_file_key && (
                  <button
                    onClick={() => handleDownload(record)}
                    disabled={downloading === record.id}
                    className="ml-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    {downloading === record.id ? (
                      "Downloading..."
                    ) : (
                      <>
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
