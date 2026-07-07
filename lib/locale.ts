"use client";

import type { i18n as I18nInstance } from "i18next";
import { LOCALE_COOKIE, SUPPORTED_LOCALES } from "@/lib/languages";

export function normalizeLocale(code: string | null | undefined): string {
  if (code && SUPPORTED_LOCALES.includes(code)) return code;
  return "en";
}

// Switch the live i18n instance and keep the cookie + <html> attributes in
// sync so the server layout picks the same locale on the next request.
export function applyLocale(i18n: I18nInstance, code: string) {
  const locale = normalizeLocale(code);
  if (i18n.language !== locale) {
    void i18n.changeLanguage(locale);
  }
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}
