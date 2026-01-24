import { useCallback, useEffect, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const useNativeDrag = (
  onImport: (paths: string[]) => void,
  isImportAllowed: () => boolean
) => {
  const [isDragging, setIsDragging] = useState(false);
  const [nativeDropStatus, setNativeDropStatus] = useState<string | null>(null);
  const nativeDropTimerRef = useRef<number | null>(null);
  const nativeDragSetupRef = useRef(false);
  const dragCounterRef = useRef(0);
  const wasShowingOverlayRef = useRef(false);
  const onImportRef = useRef(onImport);
  const isImportAllowedRef = useRef(isImportAllowed);

  useEffect(() => {
    onImportRef.current = onImport;
  }, [onImport]);

  useEffect(() => {
    isImportAllowedRef.current = isImportAllowed;
  }, [isImportAllowed]);

  const clearNativeDropStatus = useCallback(() => {
    if (nativeDropTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(nativeDropTimerRef.current);
      nativeDropTimerRef.current = null;
    }
    setNativeDropStatus(null);
  }, []);

  const scheduleNativeDropStatus = useCallback((message: string) => {
    if (typeof window === "undefined") {
      return;
    }
    if (nativeDropTimerRef.current !== null) {
      window.clearTimeout(nativeDropTimerRef.current);
    }
    setNativeDropStatus(message);
    nativeDropTimerRef.current = window.setTimeout(() => {
      setNativeDropStatus(null);
      nativeDropTimerRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    const handleWindowDragEnd = () => {
      dragCounterRef.current = 0;
      setIsDragging(false);
    };

    window.addEventListener("dragend", handleWindowDragEnd, true);
    window.addEventListener("dragleave", handleWindowDragEnd, true);
    return () => {
      window.removeEventListener("dragend", handleWindowDragEnd, true);
      window.removeEventListener("dragleave", handleWindowDragEnd, true);
    };
  }, []);

  useEffect(() => {
    if (nativeDragSetupRef.current) {
      return;
    }
    nativeDragSetupRef.current = true;
    let unlistenNative: UnlistenFn | null = null;

    const setup = async () => {
      try {
        getCurrentWindow();
      } catch {
        return;
      }
      try {
        unlistenNative = await listen<{ kind: string; paths: string[] }>(
          "muro://native-drag",
          (event) => {
            const payload = event.payload;
            if (!payload) {
              return;
            }
            const isImportAllowed = isImportAllowedRef.current();
            
            if (payload.kind === "over") {
              if (!isImportAllowed) {
                return;
              }
              wasShowingOverlayRef.current = true;
              setIsDragging(true);
              setNativeDropStatus("Drop files to import");
              return;
            }
            if (payload.kind === "leave") {
              wasShowingOverlayRef.current = false;
              setIsDragging(false);
              dragCounterRef.current = 0;
              clearNativeDropStatus();
              return;
            }
            if (payload.kind === "drop") {
              const wasShowingOverlay = wasShowingOverlayRef.current;
              wasShowingOverlayRef.current = false;
              setIsDragging(false);
              dragCounterRef.current = 0;
              // Ignore drops if we weren't showing the file import overlay
              if (!wasShowingOverlay) {
                clearNativeDropStatus();
                return;
              }
              if (payload.paths?.length) {
                scheduleNativeDropStatus(
                  `Imported ${payload.paths.length} file${
                    payload.paths.length === 1 ? "" : "s"
                  }`
                );
                onImportRef.current(payload.paths);
              } else {
                scheduleNativeDropStatus("Drop received, no files found");
              }
            }
          }
        );
      } catch (error) {
        console.error("Drag diagnostics: listener failed", error);
      }
    };

    void setup();

    return () => {
      unlistenNative?.();
    };
  }, [clearNativeDropStatus, scheduleNativeDropStatus]);

  return { isDragging, nativeDropStatus };
};
