"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type Locale, type TranslationKey, t } from "@/lib/i18n";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "zh",
  setLocale: () => {},
  t: (key) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("auto-reader-locale") as Locale | null;
    if (stored && (stored === "zh" || stored === "en")) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("auto-reader-locale", newLocale);
  };

  const translate = (key: TranslationKey, params?: Record<string, string | number>) => {
    return t(locale, key, params);
  };

  if (!mounted) {
    return (
      <I18nContext.Provider value={{ locale: "zh", setLocale, t: (key) => t("zh", key) }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translate }}>
      {children}
    </I18nContext.Provider>
  );
}
