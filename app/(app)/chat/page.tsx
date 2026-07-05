"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";

function ChatInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isNew = searchParams.get("new") === "1";
  const chatId = isNew ? null : searchParams.get("id");

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-0px)] md:h-screen">
      <ChatPanel
        chatId={chatId}
        onChatCreated={(id) => router.replace(`/chat?id=${id}`)}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatInner />
    </Suspense>
  );
}
