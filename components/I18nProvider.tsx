"use client";

import { useState } from "react";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { resources } from "@/lib/i18n-resources";

export default function I18nProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  // One instance per mount so server renders never share a global singleton.
  const [i18n] = useState(() => {
    const instance = createInstance();
    instance.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: "en",
      interpolation: { escapeValue: false },
    });
    return instance;
  });

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
