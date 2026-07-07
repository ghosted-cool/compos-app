"use client";

import { useTranslation } from "react-i18next";
import TaskBoard from "@/components/TaskBoard";

export default function TasksPage() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 px-4 md:px-8 py-8 max-w-6xl w-full mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{t("tasks.title")}</h1>
        <p className="text-sm text-ink-soft mt-1">{t("tasks.subtitle")}</p>
      </header>
      <TaskBoard />
    </div>
  );
}
