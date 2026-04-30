"use client";

import { useState, useRef } from "react";
import { useI18n } from "./I18nProvider";

interface ArticleInputProps {
  onAnalyze: (article: string) => void;
  onAnalyzeAndPlay: (article: string) => void;
  isLoading: boolean;
}

export default function ArticleInput({
  onAnalyze,
  onAnalyzeAndPlay,
  isLoading,
}: ArticleInputProps) {
  const [article, setArticle] = useState("");
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = () => {
    if (article.trim() && !isLoading) {
      onAnalyze(article.trim());
    }
  };

  const handleAnalyzeAndPlay = () => {
    if (article.trim() && !isLoading) {
      onAnalyzeAndPlay(article.trim());
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      alert("Please select a .txt file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setArticle(content);
      }
    };
    reader.readAsText(file, "utf-8");

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith(".txt")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setArticle(content);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="article"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("articleLabel")}
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import TXT
            </button>
          </div>
        </div>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="relative"
        >
          <textarea
            id="article"
            value={article}
            onChange={(e) => setArticle(e.target.value)}
            placeholder={t("articlePlaceholder") + "\n\nTip: You can also drag and drop a .txt file here."}
            className="h-64 w-full rounded-lg border border-gray-300 bg-white p-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400"
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {article.length > 0 && t("charCount", { count: article.length })}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={!article.trim() || isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("analyzing")}
              </>
            ) : (
              t("startAnalyze")
            )}
          </button>
          <button
            onClick={handleAnalyzeAndPlay}
            disabled={!article.trim() || isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("processing")}
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {t("startGenerate")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
