import { useCallback, useEffect, useRef, useState } from "react";

type DragIndicator = {
  x: number;
  y: number;
  count: number;
};

type UsePlaylistDragArgs = {
  selectedIds: Set<string>;
  onDropToPlaylist: (playlistId: string, payload?: string[]) => void;
};

export const usePlaylistDrag = ({
  selectedIds,
  onDropToPlaylist,
}: UsePlaylistDragArgs) => {
  const [isInternalDrag, setIsInternalDrag] = useState(false);
  const [draggingPlaylistId, setDraggingPlaylistId] = useState<string | null>(
    null
  );
  const [dragIndicator, setDragIndicator] = useState<DragIndicator | null>(null);
  const dragPayloadRef = useRef<string[]>([]);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragCandidateRef = useRef<string[]>([]);
  const isInternalDragRef = useRef(false);
  const suppressOverlayUntilRef = useRef(0);
  const selectedIdsRef = useRef(selectedIds);
  const onDropToPlaylistRef = useRef(onDropToPlaylist);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    onDropToPlaylistRef.current = onDropToPlaylist;
  }, [onDropToPlaylist]);

  useEffect(() => {
    isInternalDragRef.current = isInternalDrag;
  }, [isInternalDrag]);

  const resetDragState = useCallback(() => {
    dragStartRef.current = null;
    dragCandidateRef.current = [];
    dragPayloadRef.current = [];
    setDragIndicator(null);
    setDraggingPlaylistId(null);
    setIsInternalDrag(false);
  }, []);

  const onRowMouseDown = useCallback(
    (event: React.MouseEvent, trackId: string) => {
      event.preventDefault();
      const currentSelectedIds = selectedIdsRef.current;
      dragCandidateRef.current = currentSelectedIds.has(trackId)
        ? Array.from(currentSelectedIds)
        : [trackId];
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    []
  );

  const onPlaylistDragEnter = useCallback((id: string) => {
    setDraggingPlaylistId(id);
  }, []);

  const onPlaylistDragLeave = useCallback((id: string) => {
    setDraggingPlaylistId((current) => (current === id ? null : current));
  }, []);

  const onPlaylistDragOver = useCallback((id: string) => {
    setDraggingPlaylistId(id);
  }, []);

  const onPlaylistDropEvent = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, playlistId: string) => {
      const data = event.dataTransfer.getData("text/plain");
      const payload = data ? data.split(",").map((item) => item.trim()) : [];
      onDropToPlaylistRef.current(playlistId, payload);
      resetDragState();
    },
    [resetDragState]
  );

  const isImportDragAllowed = useCallback(
    () => !isInternalDragRef.current && Date.now() >= suppressOverlayUntilRef.current,
    []
  );

  const setInternalDragActive = useCallback((active: boolean) => {
    isInternalDragRef.current = active;
    setIsInternalDrag(active);
    // Suppress overlay when drag starts AND for a bit after it ends
    // to handle race conditions with native drop events
    suppressOverlayUntilRef.current = Date.now() + 300;
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStartRef.current) {
        return;
      }

      const distance = Math.hypot(
        event.clientX - dragStartRef.current.x,
        event.clientY - dragStartRef.current.y
      );

      if (!isInternalDragRef.current && distance > 4) {
        dragPayloadRef.current = dragCandidateRef.current;
        setIsInternalDrag(true);
        suppressOverlayUntilRef.current = Date.now() + 300;
        setDragIndicator({
          x: event.clientX,
          y: event.clientY,
          count: dragCandidateRef.current.length,
        });
      }

      if (isInternalDragRef.current) {
        setDragIndicator((current) =>
          current
            ? { ...current, x: event.clientX, y: event.clientY }
            : {
                x: event.clientX,
                y: event.clientY,
                count: dragPayloadRef.current.length,
              }
        );
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest?.("[data-playlist-target]") as HTMLElement | null;
        setDraggingPlaylistId(
          target ? target.getAttribute("data-playlist-target") : null
        );
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (isInternalDragRef.current) {
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest?.("[data-playlist-target]") as HTMLElement | null;
        const playlistId = target?.getAttribute("data-playlist-target") ?? "";
        if (playlistId) {
          onDropToPlaylistRef.current(playlistId, dragPayloadRef.current);
        }
      }

      resetDragState();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resetDragState]);

  return {
    dragIndicator,
    draggingPlaylistId,
    isImportDragAllowed,
    isInternalDrag,
    onPlaylistDragEnter,
    onPlaylistDragLeave,
    onPlaylistDragOver,
    onPlaylistDropEvent,
    onRowMouseDown,
    setInternalDragActive,
  };
};
