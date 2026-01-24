import { Folder, Inbox, ListMusic, Plus, Settings } from "lucide-react";
import { t } from "../../i18n";
import type { Playlist } from "../../types/library";

type SidebarProps = {
  currentView: "library" | "inbox" | "settings";
  trackCount: number;
  inboxCount: number;
  playlists: Playlist[];
  draggingPlaylistId: string | null;
  onViewChange: (view: "library" | "inbox" | "settings") => void;
  onPlaylistDrop: (event: React.DragEvent<HTMLButtonElement>, id: string) => void;
  onPlaylistDragEnter: (id: string) => void;
  onPlaylistDragLeave: (id: string) => void;
  onPlaylistDragOver: (id: string) => void;
};

export const Sidebar = ({
  currentView,
  trackCount,
  inboxCount,
  playlists,
  draggingPlaylistId,
  onViewChange,
  onPlaylistDrop,
  onPlaylistDragEnter,
  onPlaylistDragLeave,
  onPlaylistDragOver,
}: SidebarProps) => {
  const isLibrary = currentView === "library";
  const isInbox = currentView === "inbox";
  const isSettings = currentView === "settings";

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-r border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 pb-32">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {t("app.name")}
      </div>
      <div className="mt-6 space-y-2 text-sm">
        <button
          className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left font-medium transition-colors duration-[var(--motion-fast)] ${
            isLibrary
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : "text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
          }`}
          onClick={() => onViewChange("library")}
          type="button"
        >
          <span className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            {t("nav.library")}
          </span>
          <span
            className={`text-xs ${
              isLibrary
                ? "font-semibold text-[var(--accent)]"
                : "text-[var(--text-muted)]"
            }`}
          >
            {trackCount}
          </span>
        </button>
        <button
          className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left font-medium transition-colors duration-[var(--motion-fast)] ${
            isInbox
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : "text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
          }`}
          onClick={() => onViewChange("inbox")}
          type="button"
        >
          <span className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            {t("nav.inbox")}
          </span>
          <span
            className={`text-xs ${
              isInbox
                ? "font-semibold text-[var(--accent)]"
                : "text-[var(--text-muted)]"
            }`}
          >
            {inboxCount}
          </span>
        </button>
        <div className="space-y-1">
          <button
            className="flex w-full cursor-pointer items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-muted)]"
            type="button"
          >
            <span className="flex items-center gap-2">
              <ListMusic className="h-4 w-4" />
              {t("nav.playlists")}
            </span>
            <Plus className="h-4 w-4" />
          </button>
          <div className="space-y-1">
            {playlists.map((playlist) => {
              const isDropTarget = draggingPlaylistId === playlist.id;
              return (
                <button
                  key={playlist.id}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] border px-3 py-2 text-left text-sm font-medium transition-colors duration-[var(--motion-fast)] ${
                    isDropTarget
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-transparent text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
                  }`}
                  onClick={() => onViewChange("library")}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    onPlaylistDragEnter(playlist.id);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    onPlaylistDragLeave(playlist.id);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    onPlaylistDragOver(playlist.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onPlaylistDrop(event, playlist.id);
                  }}
                  data-playlist-target={playlist.id}
                  type="button"
                >
                  <span className="truncate">{playlist.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {playlist.trackIds.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-auto" />
      <button
        className={`mt-4 flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left font-medium transition-colors duration-[var(--motion-fast)] ${
          isSettings
            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
            : "text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
        }`}
        onClick={() => onViewChange("settings")}
        type="button"
      >
        <span className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          {t("nav.settings")}
        </span>
      </button>
    </aside>
  );
};
