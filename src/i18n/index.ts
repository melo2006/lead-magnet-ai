import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";
import es from "./locales/es.json";

const SUPPORTED = ["en", "pt-BR", "es"] as const;
export type SupportedLang = (typeof SUPPORTED)[number];

// Always default to English. Only a language the user explicitly selected
// (stored in localStorage) overrides the default.
const getInitialLang = (): string => {
  try {
    const stored = localStorage.getItem("lang");
    if (stored && (SUPPORTED as readonly string[]).includes(stored)) return stored;
  } catch {}
  return "en";
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      "pt-BR": { translation: ptBR },
      pt: { translation: ptBR },
      es: { translation: es },
    },
    lng: getInitialLang(),
    fallbackLng: "en",
    supportedLngs: ["en", "pt-BR", "pt", "es"],
    load: "currentOnly",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },
  });

// Keep <html lang> in sync for SEO
const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng;
};
syncHtmlLang(i18n.language || "en");
i18n.on("languageChanged", (lng) => {
  syncHtmlLang(lng);
  console.log("[i18n] languageChanged →", lng, "| hero.badge =", i18n.t("hero.badge"));
});
// expose for debugging
(window as any).__i18n = i18n;

export default i18n;
