"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Excalidraw, getSceneVersion } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { createClient } from "@/lib/supabase/client";

// Full whiteboard: pan (space+drag / hand tool), scroll-wheel zoom, arrows,
// shapes, text and clipboard image paste all ship natively with Excalidraw.
export default function BoardCanvas({
  boardId,
  initialData,
  readOnly = false,
}: {
  boardId: string;
  initialData: unknown;
  readOnly?: boolean;
}) {
  return (
    <div className="absolute inset-0">
      <Board key={boardId} boardId={boardId} initialData={initialData} readOnly={readOnly} />
    </div>
  );
}

function Board({
  boardId,
  initialData,
  readOnly,
}: {
  boardId: string;
  initialData: unknown;
  readOnly: boolean;
}) {
  const supabase = createClient();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialScene = useMemo<ExcalidrawInitialDataState | null>(() => {
    const data = initialData as {
      elements?: unknown;
      appState?: Record<string, unknown>;
      files?: BinaryFiles;
    } | null;
    // Boards saved before the Excalidraw switch hold a tldraw snapshot
    // (no `elements` array) — those start from a blank scene.
    if (!data || !Array.isArray(data.elements)) return null;
    // `collaborators` must be a Map at runtime; the JSON round-trip through
    // Supabase turns it into a plain object, so it can't be restored.
    const appState = { ...data.appState };
    delete appState.collaborators;
    return {
      elements: data.elements as ExcalidrawInitialDataState["elements"],
      appState: appState as ExcalidrawInitialDataState["appState"],
      files: data.files,
    };
  }, [initialData]);

  const lastSavedVersion = useRef(
    getSceneVersion((initialScene?.elements ?? []) as readonly OrderedExcalidrawElement[])
  );

  const handleChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      const version = getSceneVersion(elements);
      // onChange also fires for camera moves and selection; only persist
      // when the document itself changed (mirrors tldraw's document scope).
      if (version === lastSavedVersion.current) return;
      lastSavedVersion.current = version;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const persistedAppState: Partial<AppState> = { ...appState };
        delete persistedAppState.collaborators;
        await supabase
          .from("boards")
          .update({
            board_data: { elements, appState: persistedAppState, files },
            updated_at: new Date().toISOString(),
          })
          .eq("id", boardId);
      }, 1200);
    },
    [boardId, supabase]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <Excalidraw
      initialData={initialScene}
      onChange={readOnly ? undefined : handleChange}
      viewModeEnabled={readOnly}
    />
  );
}
