import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en } from "@/i18n/en";
import { fa, type FaDict } from "@/i18n/fa";

export type Locale = "fa" | "en";

type LocaleContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: FaDict;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readLocale(): Locale {
  const stored = localStorage.getItem("locale");
  return stored === "en" ? "en" : "fa";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale);
  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem("locale", next);
    setLocaleState(next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "fa" ? "rtl" : "ltr";
  }, []);
  const value = useMemo(
    () => ({
      locale,
      dir: (locale === "fa" ? "rtl" : "ltr") as "rtl" | "ltr",
      t: locale === "en" ? en : fa,
      setLocale,
    }),
    [locale, setLocale]
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("LocaleProvider missing");
  return ctx;
}
