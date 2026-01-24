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
import { useViewConfig, type LibraryView } from "./hooks/useLibraryView";
import { initialInboxTracks, initialTracks, themes } from "./data/library";
import { useAppPreferences } from "./hooks/useAppPreferences";
import { useColumns } from "./hooks/useColumns";
import { useColumnsMenu } from "./hooks/useColumnsMenu";
import { useContextMenu } from "./hooks/useContextMenu";
import { useDetailPanel } from "./hooks/useDetailPanel";
import { useNativeDrag } from "./hooks/useNativeDrag";
import { usePlaylistDrag } from "./hooks/usePlaylistDrag";
import { useAudioPlayback } from "./hooks/useAudioPlayback";
import { useSelection } from "./hooks/useSelection";
import { useSidebarPanel } from "./hooks/useSidebarPanel";
import { useSidebarData } from "./hooks/useSidebarData";
import { useTrackRatings } from "./hooks/useTrackRatings";
import { localeOptions, t } from "./i18n";
import { backfillSearchText, clearTracks, importedTrackToTrack, loadPlaylists, loadTracks } from "./utils/tauriDb";
import { confirm, open } from "@tauri-apps/plugin-dialog";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { Playlist } from "./types/library";

function App() {
  const [view, setView] = useState<LibraryView>("library");
  const [tracks, setTracks] = useState(() => initialTracks);
  const [inboxTracks, setInboxTracks] = useState(() => initialInboxTracks);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => []);

  const viewConfig = useViewConfig({
    view,
    playlists,
    libraryTracks: tracks,
    inboxTracks,
  });

  const { locale, seekMode, setLocale, setSeekMode, setTheme, theme } =
    useAppPreferences();

  const displayedTracks = viewConfig.trackTable?.tracks ?? [];

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
  const [importProgress, setImportProgress] = useState<
    { imported: number; total: number; phase: "scanning" | "importing" } | null
  >(null);
  const [clearSongsPending, setClearSongsPending] = useState(false);
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

  // Playback state
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [queueIndex, setQueueIndex] = useState(0);

  const allTracks = [...tracks, ...inboxTracks];

  const handleTrackEnd = useCallback(() => {
    // Handle repeat and queue progression
    if (repeatMode === "one") {
      // Replay the same track - will be handled in playback
      const currentTrack = allTracks[queueIndex];
      if (currentTrack) {
        playTrack(currentTrack);
      }
    } else if (queueIndex < allTracks.length - 1) {
      // Play next track
      const nextIndex = shuffleEnabled
        ? Math.floor(Math.random() * allTracks.length)
        : queueIndex + 1;
      setQueueIndex(nextIndex);
      const nextTrack = allTracks[nextIndex];
      if (nextTrack) {
        playTrack(nextTrack);
      }
    } else if (repeatMode === "all" && allTracks.length > 0) {
      // Loop back to beginning
      setQueueIndex(0);
      playTrack(allTracks[0]);
    }
  }, [repeatMode, shuffleEnabled, queueIndex, allTracks]);

  const {
    isPlaying,
    currentPosition,
    duration,
    volume,
    currentTrack,
    playTrack,
    togglePlay,
    seek,
    setVolume,
  } = useAudioPlayback({
    onTrackEnd: handleTrackEnd,
    seekMode,
  });

  const toggleShuffle = useCallback(() => {
    setShuffleEnabled((current) => !current);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((current) =>
      current === "off" ? "all" : current === "all" ? "one" : "off"
    );
  }, []);

  const handleSkipPrevious = useCallback(() => {
    if (currentPosition > 3) {
      // If more than 3 seconds in, restart current track
      seek(0);
    } else if (queueIndex > 0) {
      // Go to previous track
      const prevIndex = queueIndex - 1;
      setQueueIndex(prevIndex);
      const prevTrack = allTracks[prevIndex];
      if (prevTrack) {
        playTrack(prevTrack);
      }
    }
  }, [currentPosition, queueIndex, allTracks, seek, playTrack]);

  const handleSkipNext = useCallback(() => {
    if (queueIndex < allTracks.length - 1) {
      const nextIndex = shuffleEnabled
        ? Math.floor(Math.random() * allTracks.length)
        : queueIndex + 1;
      setQueueIndex(nextIndex);
      const nextTrack = allTracks[nextIndex];
      if (nextTrack) {
        playTrack(nextTrack);
      }
    } else if (repeatMode === "all" && allTracks.length > 0) {
      setQueueIndex(0);
      playTrack(allTracks[0]);
    }
  }, [queueIndex, allTracks, shuffleEnabled, repeatMode, playTrack]);

  const handlePlayTrack = useCallback((trackId: string) => {
    const trackIndex = allTracks.findIndex((t) => t.id === trackId);
    if (trackIndex !== -1) {
      setQueueIndex(trackIndex);
      playTrack(allTracks[trackIndex]);
    }
  }, [allTracks, playTrack]);

  const { handleRatingChange } = useTrackRatings({ setTracks });

  const { handleImportPaths, handlePlaylistDrop, handleCreatePlaylist } =
    useLibraryCommands({
      dbPath,
      dbFileName,
      setImportProgress,
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
        setTracks(snapshot.library.map(importedTrackToTrack));
        setInboxTracks(snapshot.inbox.map(importedTrackToTrack));
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

  const handleClearSongs = useCallback(async () => {
    if (clearSongsPending) {
      return;
    }

    const shouldClear = await confirm(
      t("settings.dev.clearSongs.confirm.body"),
      {
        title: t("settings.dev.clearSongs.confirm.title"),
        kind: "warning",
      }
    );
    if (!shouldClear) {
      return;
    }

    setClearSongsPending(true);
    try {
      const resolvedPath = await resolveDbPath();
      await clearTracks(resolvedPath);
      setTracks([]);
      setInboxTracks([]);
    } catch (error) {
      console.error("Clear songs failed:", error);
    } finally {
      setClearSongsPending(false);
    }
  }, [clearSongsPending, resolveDbPath]);

  const importPercent = importProgress
    ? Math.min(
        100,
        importProgress.total > 0
          ? Math.round((importProgress.imported / importProgress.total) * 100)
          : 0
      )
    : 0;

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
                title={viewConfig.title}
                subtitle={viewConfig.subtitle}
                isSettings={viewConfig.type === "settings"}
                onColumnsButtonClick={toggleColumnsMenu}
              />
              {viewConfig.trackTable && importProgress && (
                <div className="border-b border-[var(--color-border-light)] bg-[var(--color-bg-primary)] px-[var(--spacing-lg)] py-[var(--spacing-md)]">
                  <div className="mb-[var(--spacing-xs)] text-[var(--font-size-xs)] font-semibold text-[var(--color-text-secondary)]">
                    {importProgress.phase === "scanning" || importProgress.total === 0
                      ? "Scanning files..."
                      : `${importProgress.imported} of ${importProgress.total} songs imported`}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-bg-tertiary)]">
                    <div
                      className="h-full rounded-[var(--radius-full)] bg-[var(--color-accent)] transition-all duration-[var(--transition-normal)]"
                      style={{ width: `${importPercent}%` }}
                    />
                  </div>
                </div>
              )}
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
                {viewConfig.type === "settings" ? (
                    <SettingsPanel
                      theme={theme}
                      locale={locale}
                      themes={themes}
                      localeOptions={localeOptions}
                      dbPath={dbPath}
                      dbFileName={dbFileName}
                      backfillPending={backfillPending}
                      backfillStatus={backfillStatus}
                      clearSongsPending={clearSongsPending}
                      seekMode={seekMode}
                      onThemeChange={setTheme}
                      onLocaleChange={setLocale}
                      onSeekModeChange={setSeekMode}
                      onDbPathChange={(value) => {
                        setDbPath(value);
                        setUseAutoDbPath(false);
                      }}
                      onDbFileNameChange={(value) => {
                        setDbFileName(value);
                        setUseAutoDbPath(true);
                      }}
                      onBackfillSearchText={handleBackfillSearchText}
                      onClearSongs={handleClearSongs}
                      onUseDefaultLocation={() => {
                        setUseAutoDbPath(true);
                      }}
                    />
                ) : viewConfig.trackTable && (
                  <>
                    {viewConfig.trackTable.banner === "inbox" && (
                      <InboxBanner selectedCount={selectedIds.size} />
                    )}
                    <TrackTable
                      tracks={viewConfig.trackTable.tracks}
                      columns={columns}
                      selectedIds={selectedIds}
                      activeIndex={activeIndex}
                      emptyTitle={viewConfig.trackTable.emptyState.title}
                      emptyDescription={viewConfig.trackTable.emptyState.description}
                      emptyActionLabel={viewConfig.trackTable.emptyState.primaryAction?.label}
                      onEmptyAction={viewConfig.trackTable.showImportActions ? handleEmptyImport : undefined}
                      emptySecondaryActionLabel={viewConfig.trackTable.emptyState.secondaryAction?.label}
                      onEmptySecondaryAction={viewConfig.trackTable.showImportActions ? handleEmptyImportFolder : undefined}
                      onRowSelect={handleRowSelect}
                      onRowMouseDown={onRowMouseDown}
                      onRowContextMenu={handleRowContextMenu}
                      onRowDoubleClick={handlePlayTrack}
                      playingTrackId={currentTrack?.id}
                      isPlaying={isPlaying}
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
          currentPosition={currentPosition}
          duration={duration}
          volume={volume}
          currentTrack={currentTrack}
          onTogglePlay={togglePlay}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onSeekChange={seek}
          onVolumeChange={setVolume}
          onSkipPrevious={handleSkipPrevious}
          onSkipNext={handleSkipNext}
        />
      </div>
    </div>
  );
}

export default App;
