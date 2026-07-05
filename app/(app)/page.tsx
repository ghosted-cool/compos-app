import Image from "next/image";
import Link from "next/link";

const CARDS = [
  { href: "/projects", title: "Projects", icon: "folder_open", hint: "Organize work into spaces" },
  { href: "/tasks", title: "Task Bar", icon: "check_circle", hint: "Every task, by priority" },
  { href: "/brainstorm", title: "Brainstorm", icon: "lightbulb", hint: "Infinite whiteboard" },
  { href: "/calendar", title: "Calendar", icon: "calendar_today", hint: "Synced with Google" },
  { href: "/budget", title: "Budget", icon: "payments", hint: "Spending at a glance" },
  { href: "/chat", title: "Chat", icon: "chat_bubble", hint: "Ask Claude anything" },
];

export default function HomePage() {
  return (
    <div className="flex-1 px-4 md:px-8 pb-16 pt-6 md:pt-10">
      <div className="hidden md:flex justify-center mb-10">
        <Image
          src="/logo.png"
          alt="Compos"
          width={96}
          height={96}
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
                {card.title}
              </h3>
              <p className="text-xs text-ink-soft mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {card.hint}
              </p>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-low opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
