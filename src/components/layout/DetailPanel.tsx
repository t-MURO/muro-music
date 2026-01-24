import { ChevronLeft, ChevronRight, ListChecks, Play, Speaker } from "lucide-react";
import { t } from "../../i18n";
import type { Track } from "../../types/library";

type DetailPanelProps = {
  detailCollapsed: boolean;
  onToggleCollapsed: () => void;
  queueTracks: Track[];
};

export const DetailPanel = ({
  detailCollapsed,
  onToggleCollapsed,
  queueTracks,
}: DetailPanelProps) => {
  return (
    <aside className="flex h-full flex-col overflow-y-auto border-l border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 pb-32">
      <div
        className={`flex items-center ${
          detailCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!detailCollapsed && (
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <Play className="h-3.5 w-3.5" />
            {t("panel.nowPlaying")}
          </div>
        )}
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--panel-border)] text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--panel-muted)]"
          onClick={onToggleCollapsed}
          title={detailCollapsed ? "Expand panel" : "Collapse panel"}
          type="button"
        >
          {detailCollapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {!detailCollapsed && (
        <>
          <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4 shadow-[var(--shadow-sm)]">
            <div className="text-sm font-semibold">Glass Elevator</div>
            <div className="text-xs text-[var(--text-muted)]">Nova Drift</div>
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              Signal Bloom • FLAC
            </div>
          </div>
          <div className="mt-6 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <ListChecks className="h-3.5 w-3.5" />
              {t("panel.queue")}
            </div>
            <div className="mt-3 space-y-3 text-sm">
              {queueTracks.map((track) => (
                <div
                  key={`${track.id}-queue`}
                  className="rounded-[var(--radius-sm)] border border-[var(--panel-border)] px-3 py-2 shadow-[var(--shadow-sm)]"
                >
                  <div className="font-medium">{track.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {track.artist}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-3 text-xs shadow-[var(--shadow-sm)]">
            <span className="flex items-center gap-2 text-[var(--text-muted)]">
              <Speaker className="h-3.5 w-3.5" />
              {t("panel.output")}
            </span>
            <span className="font-medium">{t("panel.output.device")}</span>
          </div>
        </>
      )}
    </aside>
  );
};
