"use client";

import { useCallback, useRef } from "react";
import {
  Tldraw,
  getSnapshot,
  loadSnapshot,
  type Editor,
  type TLEditorSnapshot,
  type TLStoreSnapshot,
} from "tldraw";
import "tldraw/tldraw.css";
import { createClient } from "@/lib/supabase/client";

// Full whiteboard: pan (drag empty canvas / space+drag), scroll-wheel zoom,
// arrows, shapes, text and clipboard image paste all ship natively with tldraw.
export default function BoardCanvas({
  boardId,
  initialData,
  readOnly = false,
}: {
  boardId: string;
  initialData: unknown;
  readOnly?: boolean;
}) {
  const supabase = createClient();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMount = useCallback(
    (editor: Editor) => {
      if (initialData) {
        try {
          loadSnapshot(
            editor.store,
            initialData as Partial<TLEditorSnapshot> | TLStoreSnapshot
          );
        } catch (e) {
          console.error("Could not load board snapshot", e);
        }
      }
      if (readOnly) {
        editor.updateInstanceState({ isReadonly: true });
        return;
      }

      const unlisten = editor.store.listen(
        () => {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(async () => {
            const snapshot = getSnapshot(editor.store);
            await supabase
              .from("boards")
              .update({
                board_data: snapshot,
                updated_at: new Date().toISOString(),
              })
              .eq("id", boardId);
          }, 1200);
        },
        { scope: "document", source: "user" }
      );
      return () => {
        unlisten();
        if (saveTimer.current) clearTimeout(saveTimer.current);
      };
    },
    [boardId, initialData, readOnly, supabase]
  );

  return (
    <div className="absolute inset-0">
      <Tldraw key={boardId} onMount={handleMount} />
    </div>
  );
}
