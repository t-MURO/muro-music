import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { DetailPanel } from "./components/layout/DetailPanel";
import { LibraryHeader } from "./components/layout/LibraryHeader";
import { PlayerBar } from "./components/layout/PlayerBar";
import { SettingsPanel } from "./components/layout/SettingsPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { ColumnsMenu } from "./components/library/ColumnsMenu";
import { InboxBanner } from "./components/library/InboxBanner";
import { TrackTable } from "./components/library/TrackTable";
import { ContextMenu } from "./components/ui/ContextMenu";
import { DragOverlay } from "./components/ui/DragOverlay";
import { PlaylistCreateModal } from "./components/ui/PlaylistCreateModal";
import { useLibraryCommands } from "./hooks/useLibraryCommands";
import { useLibraryView, type LibraryView } from "./hooks/useLibraryView";
import { initialInboxTracks, initialTracks, themes } from "./data/library";
import { useAppPreferences } from "./hooks/useAppPreferences";
import { useColumns } from "./hooks/useColumns";
import { useColumnsMenu } from "./hooks/useColumnsMenu";
import { useContextMenu } from "./hooks/useContextMenu";
import { useDetailPanel } from "./hooks/useDetailPanel";
import { useNativeDrag } from "./hooks/useNativeDrag";
import { usePlaylistDrag } from "./hooks/usePlaylistDrag";
import { usePlayerState } from "./hooks/usePlayerState";
import { useSelection } from "./hooks/useSelection";
import { useSidebarPanel } from "./hooks/useSidebarPanel";
import { useSidebarData } from "./hooks/useSidebarData";
import { useTrackRatings } from "./hooks/useTrackRatings";
import { localeOptions } from "./i18n";
import { backfillSearchText, loadPlaylists, loadTracks } from "./utils/tauriDb";
import { open } from "@tauri-apps/plugin-dialog";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { Playlist } from "./types/library";

function App() {
  const [view, setView] = useState<LibraryView>("library");
  const [tracks, setTracks] = useState(() => initialTracks);
  const [inboxTracks, setInboxTracks] = useState(() => initialInboxTracks);
  const { isInbox, isSettings, subtitle, title } = useLibraryView(view);

  const { locale, setLocale, setTheme, theme } = useAppPreferences();
  const displayedTracks = isInbox ? inboxTracks : tracks;
  const { selectedIds, activeIndex, handleRowSelect, selectAll, clearSelection } =
    useSelection(displayedTracks);
  const { autoFitColumn, columns, handleColumnResize, toggleColumn } = useColumns({
    tracks,
  });
  const { closeMenu, menuPosition, menuSelection, openForRow, openMenuId } =
    useContextMenu({
      selectedIds,
      onSelectRow: handleRowSelect,
    });
  const {
    closeMenu: closeColumnsMenu,
    isOpen: showColumns,
    position: columnsMenuPosition,
    toggleAt: toggleColumnsMenu,
  } = useColumnsMenu();
  const [playlists, setPlaylists] = useState<Playlist[]>(() => []);
  const [isPlaylistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const { sidebarWidth, startSidebarResize } = useSidebarPanel();
  const [dbPath, setDbPath] = useState("");
  const [dbFileName, setDbFileName] = useState("muro.db");
  const [useAutoDbPath, setUseAutoDbPath] = useState(true);
  const [backfillPending, setBackfillPending] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);
  const {
    detailCollapsed,
    detailWidth,
    startDetailResize,
    toggleDetailCollapsed,
  } = useDetailPanel();
  const {
    isPlaying,
    repeatMode,
    seekPosition,
    setSeekPosition,
    shuffleEnabled,
    togglePlay,
    toggleRepeat,
    toggleShuffle,
  } = usePlayerState();

  const { handleRatingChange } = useTrackRatings({ setTracks });

  const { handleImportPaths, handlePlaylistDrop, handleCreatePlaylist } =
    useLibraryCommands({
      dbPath,
      dbFileName,
      setPlaylists,
      setInboxTracks,
    });

  const {
    dragIndicator,
    draggingPlaylistId,
    isImportDragAllowed,
    isInternalDrag,
    onPlaylistDragEnter,
    onPlaylistDragLeave,
    onPlaylistDragOver,
    onPlaylistDropEvent,
    onRowMouseDown,
  } = usePlaylistDrag({ selectedIds, onDropToPlaylist: handlePlaylistDrop });

  const sidebarProps = useSidebarData({
    view,
    tracksCount: tracks.length,
    inboxCount: inboxTracks.length,
    playlists,
    draggingPlaylistId,
    onViewChange: setView,
    onPlaylistDrop: onPlaylistDropEvent,
    onPlaylistDragEnter,
    onPlaylistDragLeave,
    onPlaylistDragOver,
    onCreatePlaylist: () => {
      setPlaylistName("");
      setPlaylistModalOpen(true);
    },
  });

  const { isDragging, nativeDropStatus } = useNativeDrag(
    handleImportPaths,
    isImportDragAllowed
  );

  const handleRowContextMenu = useCallback(
    (
      event: React.MouseEvent,
      trackId: string,
      index: number,
      isSelected: boolean
    ) => {
      openForRow(event, trackId, index, isSelected);
    },
    [openForRow]
  );

  useEffect(() => {
    if (!isInternalDrag) {
      document.body.style.userSelect = "";
      return;
    }

    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = "";
    };
  }, [isInternalDrag]);

  useEffect(() => {
    let isMounted = true;

    const resolveDbPath = async () => {
      if (!useAutoDbPath) {
        return;
      }

      try {
        const baseDir = await appDataDir();
        const defaultPath = await join(baseDir, dbFileName || "muro.db");
        if (isMounted) {
          setDbPath(defaultPath);
        }
      } catch (error) {
        console.warn("Failed to resolve default db path", error);
      }
    };

    resolveDbPath();
    return () => {
      isMounted = false;
    };
  }, [dbFileName, useAutoDbPath]);

  const resolveDbPath = useCallback(async () => {
    const trimmed = dbPath.trim();
    if (trimmed) {
      return trimmed;
    }
    const baseDir = await appDataDir();
    return join(baseDir, dbFileName || "muro.db");
  }, [dbFileName, dbPath]);

  useEffect(() => {
    let isMounted = true;

    const loadLibrary = async () => {
      try {
        const resolvedPath = await resolveDbPath();
        const [snapshot, playlistSnapshot] = await Promise.all([
          loadTracks(resolvedPath),
          loadPlaylists(resolvedPath),
        ]);
        if (!isMounted) {
          return;
        }
        setTracks(snapshot.library);
        setInboxTracks(snapshot.inbox);
        setPlaylists(
          playlistSnapshot.playlists.map((playlist) => ({
            id: playlist.id,
            name: playlist.name,
            trackIds: playlist.track_ids,
          }))
        );
      } catch (error) {
        console.error("Load tracks failed:", error);
      }
    };

    loadLibrary();
    return () => {
      isMounted = false;
    };
  }, [resolveDbPath]);

  const handleBackfillSearchText = useCallback(async () => {
    if (!dbPath.trim()) {
      setBackfillStatus("Enter a database path to run the backfill.");
      return;
    }

    try {
      setBackfillPending(true);
      setBackfillStatus("Running backfill...");
      const updated = await backfillSearchText(dbPath.trim());
      setBackfillStatus(`Updated ${updated} tracks.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Backfill failed.";
      setBackfillStatus(message);
    } finally {
      setBackfillPending(false);
    }
  }, [dbPath]);

  const handleEmptyImport = useCallback(async () => {
    try {
      const result = await open({
        multiple: true,
        filters: [
          {
            name: "Audio",
            extensions: [
              "mp3",
              "flac",
              "wav",
              "m4a",
              "aac",
              "ogg",
              "aiff",
              "alac",
            ],
          },
        ],
      });

      if (!result) {
        return;
      }

      const paths = Array.isArray(result) ? result : [result];
      handleImportPaths(paths);
    } catch (error) {
      console.error("File picker failed:", error);
    }
  }, [handleImportPaths]);

  const handleEmptyImportFolder = useCallback(async () => {
    try {
      const result = await open({ directory: true });
      if (!result) {
        return;
      }

      const paths = Array.isArray(result) ? result : [result];
      handleImportPaths(paths);
    } catch (error) {
      console.error("Folder picker failed:", error);
    }
  }, [handleImportPaths]);

  const handlePlaylistSubmit = useCallback(async () => {
    const trimmed = playlistName.trim();
    if (!trimmed) {
      return;
    }

    await handleCreatePlaylist(trimmed);
    setPlaylistName("");
    setPlaylistModalOpen(false);
  }, [handleCreatePlaylist, playlistName]);

  return (
      <div
        className="theme-transition h-screen overflow-hidden bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
        onClick={() => {
          closeMenu();
          closeColumnsMenu();
        }}
      >
      <DragOverlay
        isDragging={isDragging}
        nativeDropStatus={nativeDropStatus}
        dragIndicator={dragIndicator}
        isInternalDrag={isInternalDrag}
      />
      <PlaylistCreateModal
        isOpen={isPlaylistModalOpen}
        value={playlistName}
        onChange={setPlaylistName}
        onClose={() => setPlaylistModalOpen(false)}
        onSubmit={handlePlaylistSubmit}
      />
      <div
        className="grid h-screen grid-cols-[var(--sidebar-width)_1fr_var(--queue-width)] grid-rows-[1fr_auto_var(--media-controls-height)] overflow-hidden"
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
            "--queue-width": `${detailWidth}px`,
          } as CSSProperties
        }
      >
        <AppLayout
          onSidebarResizeStart={startSidebarResize}
          onDetailResizeStart={startDetailResize}
          sidebar={
            <Sidebar
              {...sidebarProps}
            />
          }
          main={
            <>
              <LibraryHeader
                title={title}
                subtitle={subtitle}
                isSettings={isSettings}
                onColumnsButtonClick={toggleColumnsMenu}
              />
              <ContextMenu
                isOpen={Boolean(openMenuId)}
                position={menuPosition}
                selectionCount={menuSelection.length}
              />
              <ColumnsMenu
                isOpen={showColumns}
                position={columnsMenuPosition}
                columns={columns}
                onToggleColumn={toggleColumn}
              />
              <section className="flex min-h-0 flex-1 flex-col bg-[var(--color-bg-primary)]">
                {isSettings ? (
                    <SettingsPanel
                      theme={theme}
                      locale={locale}
                      themes={themes}
                      localeOptions={localeOptions}
                      dbPath={dbPath}
                      dbFileName={dbFileName}
                      backfillPending={backfillPending}
                      backfillStatus={backfillStatus}
                      onThemeChange={setTheme}
                      onLocaleChange={setLocale}
                      onDbPathChange={(value) => {
                        setDbPath(value);
                        setUseAutoDbPath(false);
                      }}
                      onDbFileNameChange={(value) => {
                        setDbFileName(value);
                        setUseAutoDbPath(true);
                      }}
                      onBackfillSearchText={handleBackfillSearchText}
                      onUseDefaultLocation={() => {
                        setUseAutoDbPath(true);
                      }}
                    />
                ) : (
                  <>
                    {isInbox && (
                      <InboxBanner selectedCount={selectedIds.size} />
                    )}
                    <TrackTable
                      tracks={displayedTracks}
                      columns={columns}
                      selectedIds={selectedIds}
                      activeIndex={activeIndex}
                      emptyTitle={isInbox ? "Inbox is empty" : "No tracks yet"}
                      emptyDescription={
                        isInbox
                          ? "Drop folders or audio files here to stage new imports."
                          : "Drag folders or files into the app to build your library."
                      }
                      emptyActionLabel="Import files"
                      onEmptyAction={handleEmptyImport}
                      emptySecondaryActionLabel="Import folder"
                      onEmptySecondaryAction={handleEmptyImportFolder}
                      onRowSelect={handleRowSelect}
                      onRowMouseDown={onRowMouseDown}
                      onRowContextMenu={handleRowContextMenu}
                      onSelectAll={selectAll}
                      onClearSelection={clearSelection}
                      onColumnResize={handleColumnResize}
                      onColumnAutoFit={autoFitColumn}
                      onRatingChange={handleRatingChange}
                    />
                  </>
                )}
              </section>
            </>
          }
          detail={
            <DetailPanel
              detailCollapsed={detailCollapsed}
              onToggleCollapsed={() => {
                toggleDetailCollapsed();
              }}
              queueTracks={tracks}
            />
          }
        />
        <PlayerBar
          isPlaying={isPlaying}
          shuffleEnabled={shuffleEnabled}
          repeatMode={repeatMode}
          seekPosition={seekPosition}
          onTogglePlay={togglePlay}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onSeekChange={setSeekPosition}
        />
      </div>
    </div>
  );
}

export default App;
