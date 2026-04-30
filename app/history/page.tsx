"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const fetchHistory = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((pageNum - 1) * pageSize),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/history?${params}`);
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please login to view history");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await res.json();

      if (append) {
        setRecords((prev) => [...prev, ...(data.records || [])]);
      } else {
        setRecords(data.records || []);
      }
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch {
      setError("Failed to load history");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search]);

  useEffect(() => {
    setPage(1);
    fetchHistory(1);
  }, [fetchHistory]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage, true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory(1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString() + " " + new Date(dateStr).toLocaleTimeString();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">History</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {total > 0 ? `${total} records` : "View your generation history"}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or summary..."
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
      ) : error ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            {search ? "No matching records" : "No records yet"}
          </p>
        </div>
      ) : (
        <>
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
                      <span className={`rounded-full px-2 py-0.5 ${record.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : record.status === "generating" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>
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

          {/* Load More */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {loadingMore ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
