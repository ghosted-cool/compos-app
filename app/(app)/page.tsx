"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";

const CARDS = [
  { href: "/projects", titleKey: "nav.projects", icon: "folder_open", hintKey: "home.projectsHint" },
  { href: "/tasks", titleKey: "home.taskBar", icon: "check_circle", hintKey: "home.tasksHint" },
  { href: "/brainstorm", titleKey: "nav.brainstorm", icon: "lightbulb", hintKey: "home.brainstormHint" },
  { href: "/calendar", titleKey: "nav.calendar", icon: "calendar_today", hintKey: "home.calendarHint" },
  { href: "/budget", titleKey: "nav.budget", icon: "payments", hintKey: "home.budgetHint" },
  { href: "/chat", titleKey: "home.chat", icon: "chat_bubble", hintKey: "home.chatHint" },
];

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 px-4 md:px-8 pb-16 pt-6 md:pt-10">
      <div className="hidden md:flex justify-center mb-10">
        <Image
          src="/arrow-logo.png"
          alt="Compos"
          width={120}
          height={120}
          className="object-contain transition-transform duration-300 hover:scale-105"
          priority
        />
      </div>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="bento-card group flex flex-col items-center justify-center min-h-[200px] bg-card border border-outline-soft rounded-xl p-8 relative overflow-hidden shadow-sm"
            >
              <span className="material-symbols-outlined text-[40px] text-secondary group-hover:text-primary transition-colors mb-3">
                {card.icon}
              </span>
              <h3 className="text-xl font-bold text-ink group-hover:text-primary transition-colors">
                {t(card.titleKey)}
              </h3>
              <p className="text-xs text-ink-soft mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {t(card.hintKey)}
              </p>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-low opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
