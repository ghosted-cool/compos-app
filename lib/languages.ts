export interface Language {
  code: string; // ISO 639-1
  name: string;
}

// Top five first, the rest alphabetical by English name.
export const LANGUAGES: Language[] = [
  { code: "en", name: "English" },
  { code: "it", name: "Italiano" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "ar", name: "العربية (Arabic)" },
  { code: "zh", name: "中文 (Chinese)" },
  { code: "cs", name: "Čeština (Czech)" },
  { code: "da", name: "Dansk (Danish)" },
  { code: "nl", name: "Nederlands (Dutch)" },
  { code: "el", name: "Ελληνικά (Greek)" },
  { code: "hi", name: "हिन्दी (Hindi)" },
  { code: "ja", name: "日本語 (Japanese)" },
  { code: "ko", name: "한국어 (Korean)" },
  { code: "no", name: "Norsk (Norwegian)" },
  { code: "pl", name: "Polski (Polish)" },
  { code: "pt", name: "Português (Portuguese)" },
  { code: "ro", name: "Română (Romanian)" },
  { code: "ru", name: "Русский (Russian)" },
  { code: "sv", name: "Svenska (Swedish)" },
  { code: "tr", name: "Türkçe (Turkish)" },
  { code: "uk", name: "Українська (Ukrainian)" },
];

// localStorage key used to carry the pre-login language choice through the
// OAuth redirect; synced into users.language on first authenticated load.
export const PENDING_LANGUAGE_KEY = "compos-pending-language";
