export interface Language {
  code: string; // ISO 639-1
  name: string;
}

// The ten languages the UI is fully translated into (messages/<code>.json).
// Top five first, the rest alphabetical by English name.
export const LANGUAGES: Language[] = [
  { code: "en", name: "English" },
  { code: "it", name: "Italiano" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "ar", name: "العربية (Arabic)" },
  { code: "zh", name: "中文 (Chinese)" },
  { code: "hi", name: "हिन्दी (Hindi)" },
  { code: "ja", name: "日本語 (Japanese)" },
  { code: "pt", name: "Português (Portuguese)" },
];

export const SUPPORTED_LOCALES = LANGUAGES.map((l) => l.code);

// localStorage key used to carry the pre-login language choice through the
// OAuth redirect; synced into users.language on first authenticated load.
export const PENDING_LANGUAGE_KEY = "compos-pending-language";

// Cookie the server layout reads to pick the locale before hydration.
export const LOCALE_COOKIE = "compos-lang";
