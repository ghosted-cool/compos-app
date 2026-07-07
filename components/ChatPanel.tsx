"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/types";

export default function ChatPanel({
  chatId: initialChatId,
  compact = false,
  onChatCreated,
}: {
  chatId?: string | null;
  compact?: boolean;
  onChatCreated?: (id: string) => void;
}) {
  const supabase = createClient();
  const { t, i18n } = useTranslation();
  const [chatId, setChatId] = useState<string | null>(initialChatId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadUsage = useCallback(async () => {
    const { data } = await supabase.rpc("get_chat_usage");
    if (data?.[0]) {
      setRemaining(data[0].remaining);
      setResetAt(data[0].reset_at);
    }
  }, [supabase]);

  const loadChat = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("chats")
        .select("messages")
        .eq("id", id)
        .maybeSingle();
      if (data && Array.isArray(data.messages)) setMessages(data.messages);
    },
    [supabase]
  );

  useEffect(() => {
    setChatId(initialChatId ?? null);
    setMessages([]);
    setLimitError(null);
    if (initialChatId) loadChat(initialChatId);
  }, [initialChatId, loadChat]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setLimitError(null);
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      // Create the chat row lazily on first message.
      let id = chatId;
      if (!id) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");
        const { data: created, error } = await supabase
          .from("chats")
          .insert({ user_id: user.id, title: t("chat.newChat") })
          .select("id")
          .single();
        if (error || !created) throw new Error("Could not create chat");
        id = created.id;
        setChatId(id);
        onChatCreated?.(id!);
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: id, message: text }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setRemaining(0);
        setResetAt(data.resetAt ?? null);
        setLimitError(data.message ?? t("chat.limitReached"));
        setMessages((m) => m.slice(0, -2)); // drop optimistic pair
        setInput(text);
        return;
      }
      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      const rem = res.headers.get("X-Remaining");
      if (rem !== null) setRemaining(Number(rem));
      const reset = res.headers.get("X-Reset-At");
      if (reset) setResetAt(reset);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const current = acc;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: current };
          return copy;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: t("chat.error"),
        };
        return copy;
      });
    } finally {
      setSending(false);
    }
  }

  const resetLabel = resetAt
    ? new Date(resetAt).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header with remaining counter */}
      <div
        className={`flex items-center justify-between border-b border-outline-soft ${
          compact ? "px-3 py-2" : "px-4 py-3"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">chat_bubble</span>
          <span className="text-sm font-semibold">{t("chat.title")}</span>
        </div>
        {remaining !== null && (
          <span
            className={`text-xs font-medium rounded-full px-2.5 py-1 ${
              remaining === 0
                ? "bg-red-50 text-tier-red"
                : remaining <= 3
                  ? "bg-amber-50 text-tier-amber"
                  : "bg-primary/10 text-primary"
            }`}
            title={resetLabel ? t("chat.resetsAt", { time: resetLabel }) : undefined}
          >
            {t("chat.remaining", { count: remaining })}
          </span>
        )}
      </div>

      {/* Thread */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar ${compact ? "p-3" : "p-4 md:p-6"}`}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-ink-soft">
            <span className="material-symbols-outlined text-[40px] text-outline-soft">forum</span>
            <p className="text-sm">{t("chat.askAnything")}</p>
            <p className="text-xs">{t("chat.limitNote")}</p>
          </div>
        )}
        <div className={`space-y-4 ${compact ? "" : "max-w-3xl mx-auto"}`}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words max-w-[85%] ${
                  m.role === "user"
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-card border border-outline-soft rounded-bl-sm"
                }`}
              >
                {m.content ||
                  (sending && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1 items-center text-ink-soft">
                      <span className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce [animation-delay:240ms]" />
                    </span>
                  ) : (
                    m.content
                  ))}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Limit banner */}
      {limitError && (
        <div className="mx-4 mb-2 text-sm text-tier-red bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {limitError}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={send}
        className={`border-t border-outline-soft bg-card ${compact ? "p-2" : "p-3 md:p-4"}`}
      >
        <div className={`flex gap-2 ${compact ? "" : "max-w-3xl mx-auto"}`}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={remaining === 0 ? t("chat.limitPlaceholder") : t("chat.messagePlaceholder")}
            disabled={sending || remaining === 0}
            className="flex-1 px-3.5 py-2.5 text-sm bg-surface border border-outline-soft rounded-xl outline-none focus:border-primary transition-colors disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim() || remaining === 0}
            className="btn-press bg-primary text-white rounded-xl px-4 flex items-center justify-center hover:bg-primary-dark disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
