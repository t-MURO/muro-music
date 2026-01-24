import { memo, useMemo, useRef } from "react";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
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
  onSelectAll: () => void;
  onClearSelection: () => void;
  onColumnResize: (key: ColumnConfig["key"], width: number) => void;
  onColumnAutoFit: (key: ColumnConfig["key"]) => void;
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
    onSelectAll,
    onClearSelection,
    onColumnResize,
    onColumnAutoFit,
    onRatingChange,
  }: TrackTableProps) => {
    const tableContainerRef = useRef<HTMLDivElement | null>(null);
    const visibleColumns = useMemo(
      () => columns.filter((column) => column.visible),
      [columns]
    );
    const tableWidth = useMemo(() => {
      return visibleColumns.reduce((total, column) => total + column.width, 0);
    }, [visibleColumns]);
    const gridTemplateColumns = useMemo(
      () => visibleColumns.map((column) => `${column.width}px`).join(" "),
      [visibleColumns]
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

    return (
      <div
        ref={tableContainerRef}
        className="relative min-h-0 flex-1 min-w-0 overflow-x-auto overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--panel-border)] shadow-[var(--shadow-sm)]"
        role="grid"
        aria-rowcount={tracks.length}
        aria-colcount={visibleColumns.length}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <TableHeader
          columns={visibleColumns}
          tableWidth={tableWidth}
          gridTemplateColumns={gridTemplateColumns}
          onColumnResize={onColumnResize}
          onColumnAutoFit={onColumnAutoFit}
        />
        {tracks.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center px-6 py-10">
            <div className="max-w-md rounded-[var(--radius-lg)] border border-dashed border-[var(--panel-border)] bg-[var(--panel-muted)] px-6 py-5 text-center shadow-[var(--shadow-sm)]">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {emptyTitle}
              </div>
              <div className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                {emptyDescription}
              </div>
              {(emptyActionLabel || emptySecondaryActionLabel) && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  {emptyActionLabel && onEmptyAction && (
                    <button
                      className="rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-elevated)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:border-[var(--panel-border-strong)]"
                      type="button"
                      onClick={onEmptyAction}
                    >
                      {emptyActionLabel}
                    </button>
                  )}
                  {emptySecondaryActionLabel && onEmptySecondaryAction && (
                    <button
                      className="rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] shadow-[var(--shadow-sm)] transition hover:border-[var(--panel-border-strong)] hover:text-[var(--text-primary)]"
                      type="button"
                      onClick={onEmptySecondaryAction}
                    >
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
            return (
              <div
                key={virtualRow.key}
                className={`group grid select-none items-center border-t border-[var(--panel-border)] ${
                  isSelected ? "bg-[var(--accent-soft)]" : "bg-[var(--panel-bg)]"
                } hover:bg-[var(--panel-muted)]`}
                style={{
                  gridTemplateColumns,
                  height: 48,
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
                {visibleColumns.map((column) => {
                  const value = track[column.key as keyof Track];
                  if (column.key === "rating") {
                    const currentRating = Number(value) || 0;
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
                  return (
                    <div
                      key={`${track.id}-${column.key}`}
                      className={`h-12 px-4 py-3 ${
                        column.key === "title"
                          ? "font-medium"
                          : "text-[var(--text-muted)]"
                      }`}
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
