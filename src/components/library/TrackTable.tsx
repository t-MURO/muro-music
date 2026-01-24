import { memo, useMemo, useRef } from "react";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { Disc3, FileAudio, FolderOpen } from "lucide-react";
import type { ColumnConfig, Track } from "../../types/library";
import { RatingCell } from "./RatingCell";
import { TableHeader } from "./TableHeader";

type TrackTableProps = {
  tracks: Track[];
  columns: ColumnConfig[];
  selectedIds: Set<string>;
  activeIndex: number | null;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptySecondaryActionLabel?: string;
  onEmptySecondaryAction?: () => void;
  onRowSelect: (
    index: number,
    id: string,
    options?: { isMetaKey?: boolean; isShiftKey?: boolean }
  ) => void;
  onRowMouseDown: (event: React.MouseEvent, id: string) => void;
  onRowContextMenu: (
    event: React.MouseEvent,
    id: string,
    index: number,
    isSelected: boolean
  ) => void;
  onRowDoubleClick?: (trackId: string) => void;
  playingTrackId?: string;
  isPlaying?: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onColumnResize: (key: ColumnConfig["key"], width: number) => void;
  onColumnAutoFit: (key: ColumnConfig["key"]) => void;
  onColumnReorder?: (dragKey: ColumnConfig["key"], targetIndex: number) => void;
  onHeaderContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSortChange?: (key: ColumnConfig["key"]) => void;
  sortState?: { key: ColumnConfig["key"]; direction: "asc" | "desc" } | null;
  onRatingChange: (id: string, rating: number) => void;
};

export const TrackTable = memo(
  ({
    tracks,
    columns,
    selectedIds,
    activeIndex,
    emptyTitle,
    emptyDescription,
    emptyActionLabel,
    onEmptyAction,
    emptySecondaryActionLabel,
    onEmptySecondaryAction,
    onRowSelect,
    onRowMouseDown,
    onRowContextMenu,
    onRowDoubleClick,
    playingTrackId,
    isPlaying: isCurrentlyPlaying,
    onSelectAll,
    onClearSelection,
    onColumnResize,
    onColumnAutoFit,
    onColumnReorder,
    onHeaderContextMenu,
    onSortChange,
    sortState,
    onRatingChange,
  }: TrackTableProps) => {
    const leadingColumnWidth = 48;
    const tableContainerRef = useRef<HTMLDivElement | null>(null);
    const visibleColumns = useMemo(
      () => columns.filter((column) => column.visible),
      [columns]
    );
    const tableWidth = useMemo(() => {
      return (
        visibleColumns.reduce((total, column) => total + column.width, 0) +
        leadingColumnWidth
      );
    }, [leadingColumnWidth, visibleColumns]);
    const gridTemplateColumns = useMemo(
      () =>
        [`${leadingColumnWidth}px`, ...visibleColumns.map((column) => `${column.width}px`)].join(
          " "
        ),
      [leadingColumnWidth, visibleColumns]
    );

    const rowVirtualizer = useVirtualizer({
      count: tracks.length,
      getScrollElement: () => tableContainerRef.current,
      estimateSize: () => 48,
      overscan: 50,
    });
    const virtualRows = rowVirtualizer.getVirtualItems();

    const clampIndex = (index: number) =>
      Math.max(0, Math.min(tracks.length - 1, index));

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.currentTarget !== event.target) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        onSelectAll();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClearSelection();
        return;
      }

      if (event.key === "Enter" && activeIndex !== null) {
        event.preventDefault();
        const track = tracks[activeIndex];
        if (track) {
          onRowDoubleClick?.(track.id);
        }
        return;
      }

      if (tracks.length === 0) {
        return;
      }

      const current = activeIndex ?? 0;
      const pageStep = 10;
      let nextIndex = current;

      if (event.key === "ArrowDown") {
        nextIndex = clampIndex(current + 1);
      } else if (event.key === "ArrowUp") {
        nextIndex = clampIndex(current - 1);
      } else if (event.key === "PageDown") {
        nextIndex = clampIndex(current + pageStep);
      } else if (event.key === "PageUp") {
        nextIndex = clampIndex(current - pageStep);
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tracks.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      const track = tracks[nextIndex];
      if (!track) {
        return;
      }
      onRowSelect(nextIndex, track.id, { isShiftKey: event.shiftKey });
      rowVirtualizer.scrollToIndex(nextIndex, { align: "auto" });
    };

    const getColumnDisplayValue = (track: Track, key: ColumnConfig["key"]) => {
      switch (key) {
        case "artists":
          return track.artists ?? track.artist;
        case "trackNumber":
          return track.trackNumber === undefined || track.trackNumber === null
            ? ""
            : String(track.trackNumber);
        case "trackTotal":
          return track.trackTotal === undefined || track.trackTotal === null
            ? ""
            : String(track.trackTotal);
        case "key":
          return track.key ?? "";
        case "year":
          return track.year === undefined || track.year === null
            ? ""
            : String(track.year);
        case "date":
          return track.date ?? "";
        case "dateAdded":
          return track.dateAdded ?? "";
        case "dateModified":
          return track.dateModified ?? "";
        default: {
          const value = track[key as keyof Track];
          return value === undefined || value === null ? "" : String(value);
        }
      }
    };

    return (
      <div
        ref={tableContainerRef}
        className="relative min-h-0 flex-1 min-w-0 overflow-x-auto overflow-y-auto"
        role="grid"
        aria-rowcount={tracks.length}
        aria-colcount={visibleColumns.length + 1}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <TableHeader
          columns={visibleColumns}
          tableWidth={tableWidth}
          leadingColumnWidth={leadingColumnWidth}
          gridTemplateColumns={gridTemplateColumns}
          onColumnResize={onColumnResize}
          onColumnAutoFit={onColumnAutoFit}
          onColumnReorder={onColumnReorder}
          onHeaderContextMenu={onHeaderContextMenu}
          onSortChange={onSortChange}
          sortState={sortState}
        />
        {tracks.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center px-[var(--spacing-lg)] py-10">
            <div className="max-w-md rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-5 text-center">
              <div className="text-[var(--font-size-md)] font-semibold text-[var(--color-text-primary)]">
                {emptyTitle}
              </div>
              <div className="mt-2 text-[var(--font-size-sm)] leading-relaxed text-[var(--color-text-secondary)]">
                {emptyDescription}
              </div>
              {(emptyActionLabel || emptySecondaryActionLabel) && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  {emptyActionLabel && onEmptyAction && (
                    <button
                      className="flex h-[var(--button-height)] items-center gap-[var(--spacing-sm)] rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--spacing-md)] text-[var(--font-size-sm)] font-medium text-white transition-all duration-[var(--transition-fast)] hover:bg-[var(--color-accent-hover)]"
                      type="button"
                      onClick={onEmptyAction}
                    >
                      <FileAudio className="h-4 w-4" />
                      {emptyActionLabel}
                    </button>
                  )}
                  {emptySecondaryActionLabel && onEmptySecondaryAction && (
                    <button
                      className="flex h-[var(--button-height)] items-center gap-[var(--spacing-sm)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-[var(--spacing-md)] text-[var(--font-size-sm)] font-medium text-[var(--color-text-primary)] transition-all duration-[var(--transition-fast)] hover:bg-[var(--color-bg-hover)]"
                      type="button"
                      onClick={onEmptySecondaryAction}
                    >
                      <FolderOpen className="h-4 w-4" />
                      {emptySecondaryActionLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
        <div
          className="relative"
          style={{ height: rowVirtualizer.getTotalSize(), minWidth: tableWidth }}
        >
          {virtualRows.map((virtualRow: VirtualItem) => {
            const track = tracks[virtualRow.index];
            if (!track) {
              return null;
            }
            const isSelected = selectedIds.has(track.id);
            const isPlayingTrack = track.id === playingTrackId;
            const rowBaseClass = isSelected
              ? "bg-[var(--color-accent-light)]"
              : "bg-[var(--color-bg-primary)]";
            return (
              <div
                key={virtualRow.key}
                className={`group grid select-none items-center ${
                  rowBaseClass
                } hover:bg-[var(--color-bg-hover)]`}
                style={{
                  gridTemplateColumns,
                  height: "var(--table-row-height)",
                  position: "absolute",
                  top: virtualRow.start,
                  left: 0,
                  width: "100%",
                  minWidth: tableWidth,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onRowSelect(virtualRow.index, track.id, {
                    isMetaKey: event.metaKey || event.ctrlKey,
                    isShiftKey: event.shiftKey,
                  });
                }}
                onDoubleClick={() => {
                  onRowDoubleClick?.(track.id);
                }}
                onMouseDown={(event) => {
                  const target = event.target as HTMLElement | null;
                  if (target?.closest("button, input, select, textarea")) {
                    return;
                  }
                  onRowMouseDown(event, track.id);
                }}
                onContextMenu={(event) =>
                  onRowContextMenu(event, track.id, virtualRow.index, isSelected)
                }
                role="row"
              >
                <div
                  className="sticky left-0 z-30 flex h-12 items-center justify-center bg-[var(--color-bg-primary)] group-hover:bg-[var(--color-bg-hover)] relative"
                  role="cell"
                >
                  {isSelected && (
                    <span
                      className="pointer-events-none absolute inset-0 bg-[var(--color-accent-light)]"
                      aria-hidden="true"
                    />
                  )}
                  {isPlayingTrack && (
                    <Disc3
                      className={`relative z-10 h-4 w-4 shrink-0 text-[var(--color-accent)] ${
                        isCurrentlyPlaying ? "animate-spin-slow" : ""
                      }`}
                    />
                  )}
                </div>
                {visibleColumns.map((column) => {
                  const value = getColumnDisplayValue(track, column.key);
                  if (column.key === "rating") {
                    const currentRating = Number(track.rating) || 0;
                    return (
                      <RatingCell
                        key={`${track.id}-${column.key}`}
                        trackId={track.id}
                        title={track.title}
                        rating={currentRating}
                        onRate={onRatingChange}
                      />
                    );
                  }
                  const isTitleColumn = column.key === "title";
                  const textColorClass = isPlayingTrack 
                    ? "text-[var(--color-accent)]" 
                    : isTitleColumn 
                      ? "" 
                      : "text-[var(--color-text-muted)]";
                  return (
                    <div
                      key={`${track.id}-${column.key}`}
                      className={`h-12 px-4 py-3 ${isTitleColumn ? "font-medium" : ""} ${textColorClass}`}
                      role="cell"
                    >
                      <span className="block truncate">{value}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        )}
      </div>
    );
  }
);
