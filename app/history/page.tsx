"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";

interface HistoryRecord {
  id: number;
  title: string;
  summary: string;
  segment_count: number;
  status: string;
  reading_mode: string;
  created_at: string;
}

export default function HistoryPage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please login to view history");
          setLoading(false);
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      setRecords(data.records || []);
    } catch {
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString() + " " + new Date(dateStr).toLocaleTimeString();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">History</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View your generation history</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
      ) : error ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No records yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <Link
              key={record.id}
              href={`/history/${record.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {record.title || `Record #${record.id}`}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {record.summary}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                    <span>{formatDate(record.created_at)}</span>
                    <span>{record.segment_count} segments</span>
                    <span>{record.reading_mode === "ai" ? "AI" : "Personal"}</span>
                    <span className={`rounded-full px-2 py-0.5 ${record.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>
                      {record.status}
                    </span>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
