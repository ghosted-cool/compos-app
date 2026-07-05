import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5";
const MAX_HISTORY = 30;

const SYSTEM_PROMPT =
  "You are the assistant inside Compos, a personal organization app with projects, tasks, " +
  "a whiteboard, a calendar and a budget tracker. Be helpful, concise and friendly.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { chatId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const message = body.message?.trim();
  const chatId = body.chatId;
  if (!message || !chatId) {
    return NextResponse.json({ error: "chatId and message are required" }, { status: 400 });
  }

  // Load the chat with the user-scoped client so RLS proves ownership.
  const { data: chat } = await supabase
    .from("chats")
    .select("id, title, messages")
    .eq("id", chatId)
    .maybeSingle();
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  // HARD CAP — checked server-side BEFORE calling Anthropic. The Postgres
  // function atomically resets the 24h window, rejects at 10, or increments.
  const admin = createAdminClient();
  const { data: usageRows, error: usageError } = await admin.rpc(
    "consume_chat_request",
    { p_user_id: user.id }
  );
  if (usageError || !usageRows?.[0]) {
    console.error("consume_chat_request failed", usageError);
    return NextResponse.json({ error: "Rate limit check failed" }, { status: 500 });
  }
  const usage = usageRows[0] as {
    allowed: boolean;
    remaining: number;
    reset_at: string;
  };
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: "limit_reached",
        message: `You've used all 10 chat requests for now. Your limit resets ${new Date(
          usage.reset_at
        ).toLocaleString()}.`,
        resetAt: usage.reset_at,
        remaining: 0,
      },
      { status: 429 }
    );
  }

  const history: ChatMessage[] = Array.isArray(chat.messages) ? chat.messages : [];
  const messages: ChatMessage[] = [...history, { role: "user", content: message }];
  const window = messages.slice(-MAX_HISTORY);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";
      try {
        const anthropicStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: window.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            assistantText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        await anthropicStream.finalMessage();
      } catch (e) {
        console.error("Anthropic stream error", e);
        if (!assistantText) {
          controller.enqueue(
            encoder.encode("Sorry — something went wrong talking to the model.")
          );
          assistantText = "Sorry — something went wrong talking to the model.";
        }
      }

      // Persist the full transcript and auto-title new chats.
      const finalMessages: ChatMessage[] = [
        ...messages,
        { role: "assistant", content: assistantText },
      ];
      const update: Record<string, unknown> = {
        messages: finalMessages,
        updated_at: new Date().toISOString(),
      };
      if (!chat.title || chat.title === "New chat") {
        update.title = message.slice(0, 60);
      }
      await admin.from("chats").update(update).eq("id", chatId);

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Remaining": String(usage.remaining),
      "X-Reset-At": usage.reset_at,
    },
  });
}
