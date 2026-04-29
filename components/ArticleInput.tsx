"use client";

import { useState } from "react";
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

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="article"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {t("articleLabel")}
        </label>
        <textarea
          id="article"
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          placeholder={t("articlePlaceholder")}
          className="h-64 w-full rounded-lg border border-gray-300 bg-white p-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400"
          disabled={isLoading}
        />
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
