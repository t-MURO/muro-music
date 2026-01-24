import { ChevronLeft, ChevronRight, GripVertical, ListChecks, Music2, Play, Speaker, Trash2, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { t } from "../../i18n";
import type { Track } from "../../types/library";
import type { CurrentTrack } from "../../hooks/useAudioPlayback";

type QueuePanelProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  queueTracks: Track[];
  currentTrack: CurrentTrack | null;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
};

export const QueuePanel = ({
  collapsed,
  onToggleCollapsed,
  queueTracks,
  currentTrack,
  onRemoveFromQueue,
  onClearQueue,
}: QueuePanelProps) => {
  return (
    <aside className="flex h-full flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-bg-primary)]">
      {/* Now Playing Section */}
      <div
        className={`p-[var(--spacing-lg)] ${
          collapsed ? "" : "border-b border-[var(--color-border-light)]"
        }`}
      >
        <div className="relative flex items-center gap-[var(--spacing-sm)]">
          {!collapsed && (
            <>
              <Play className="h-[14px] w-[14px] text-[var(--color-text-muted)]" />
              <h3 className="flex-1 text-[var(--font-size-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {t("panel.nowPlaying")}
              </h3>
            </>
          )}
          <button
            className="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] shadow-[var(--shadow-sm)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expand panel" : "Collapse panel"}
            type="button"
          >
            {collapsed ? (
              <ChevronLeft className="h-4 w-4 text-[var(--color-text-muted)]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
            )}
          </button>
        </div>

        {!collapsed && (
          <div className="mt-[var(--spacing-md)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-[var(--spacing-md)]">
            {/* Large cover art */}
            <div className="mb-[var(--spacing-md)] aspect-square w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
              {currentTrack?.coverArtPath ? (
                <img
                  src={convertFileSrc(currentTrack.coverArtPath)}
                  alt={`${currentTrack.title} cover`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
                  <Music2 className="h-16 w-16" />
                </div>
              )}
            </div>
            {/* Song info */}
            <div className="min-w-0">
              <p className="truncate text-[var(--font-size-md)] font-semibold text-[var(--color-text-primary)]">
                {currentTrack ? currentTrack.title : t("player.empty.title")}
              </p>
              <p className="truncate text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
                {currentTrack ? currentTrack.artist : t("player.empty.subtitle")}
              </p>
              {currentTrack && (
                <p className="mt-[var(--spacing-xs)] truncate text-[var(--font-size-xs)] text-[var(--color-text-muted)]">
                  {currentTrack.album}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Queue Section */}
      {!collapsed && (
        <>
          <div className="flex-1 overflow-y-auto border-b border-[var(--color-border-light)] p-[var(--spacing-lg)]">
            <div className="mb-[var(--spacing-md)] flex items-center gap-[var(--spacing-sm)]">
              <ListChecks className="h-[14px] w-[14px] text-[var(--color-text-muted)]" />
              <h3 className="flex-1 text-[var(--font-size-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {t("panel.queue")}
              </h3>
            </div>

            {queueTracks.length === 0 ? (
              <p className="py-[var(--spacing-lg)] text-center text-[var(--font-size-sm)] text-[var(--color-text-muted)]">
                Queue is empty
              </p>
            ) : (
              <div className="space-y-1">
                {queueTracks.map((track, index) => (
                  <div
                    key={`${track.id}-queue-${index}`}
                    className="group flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--spacing-sm)] transition-colors hover:bg-[var(--color-bg-hover)]"
                  >
                    <GripVertical className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)] opacity-30" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[var(--font-size-sm)] font-medium text-[var(--color-text-primary)]">
                        {track.title}
                      </div>
                      <div className="truncate text-[var(--font-size-xs)] text-[var(--color-text-secondary)]">
                        {track.artist}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveFromQueue(index)}
                      className="flex-shrink-0 rounded p-1 text-[var(--color-text-muted)] opacity-0 transition-all hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] group-hover:opacity-100"
                      title="Remove from queue"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={onClearQueue}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] py-2 text-[var(--font-size-xs)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear queue
                </button>
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="mt-auto flex items-center justify-between bg-[var(--color-bg-secondary)] p-[var(--spacing-md)] px-[var(--spacing-lg)]">
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <Speaker className="h-4 w-4 text-[var(--color-text-muted)]" />
              <span className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
                {t("panel.output")}
              </span>
            </div>
            <span className="text-[var(--font-size-sm)] font-medium text-[var(--color-text-primary)]">
              {t("panel.output.device")}
            </span>
          </div>
        </>
      )}
    </aside>
  );
};
