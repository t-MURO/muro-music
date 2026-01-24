import { ChevronLeft, ChevronRight, ListChecks, Music2, Play, Speaker } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { t } from "../../i18n";
import type { Track } from "../../types/library";
import type { CurrentTrack } from "../../hooks/useAudioPlayback";

type DetailPanelProps = {
  detailCollapsed: boolean;
  onToggleCollapsed: () => void;
  queueTracks: Track[];
  currentTrack: CurrentTrack | null;
};

export const DetailPanel = ({
  detailCollapsed,
  onToggleCollapsed,
  queueTracks,
  currentTrack,
}: DetailPanelProps) => {
  return (
    <aside className="flex h-full flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-bg-primary)]">
      {/* Now Playing Section */}
      <div
        className={`p-[var(--spacing-lg)] ${
          detailCollapsed ? "" : "border-b border-[var(--color-border-light)]"
        }`}
      >
        <div className="relative flex items-center gap-[var(--spacing-sm)]">
          {!detailCollapsed && (
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
            title={detailCollapsed ? "Expand panel" : "Collapse panel"}
            type="button"
          >
            {detailCollapsed ? (
              <ChevronLeft className="h-4 w-4 text-[var(--color-text-muted)]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
            )}
          </button>
        </div>

        {!detailCollapsed && (
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
      {!detailCollapsed && (
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
              <div className="space-y-2">
                {queueTracks.map((track) => (
                  <div
                    key={`${track.id}-queue`}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--spacing-sm)] transition-colors hover:bg-[var(--color-bg-hover)]"
                  >
                    <div className="text-[var(--font-size-sm)] font-medium text-[var(--color-text-primary)]">
                      {track.title}
                    </div>
                    <div className="text-[var(--font-size-xs)] text-[var(--color-text-secondary)]">
                      {track.artist}
                    </div>
                  </div>
                ))}
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
