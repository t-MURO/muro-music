import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useLocation, useNavigate, useMatch } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { QueuePanel } from "./components/layout/QueuePanel";
import { LibraryHeader } from "./components/layout/LibraryHeader";
import { PlayerBar } from "./components/layout/PlayerBar";
import { SettingsPanel } from "./components/layout/SettingsPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { ColumnsMenu } from "./components/library/ColumnsMenu";
import { InboxBanner } from "./components/library/InboxBanner";
import { TrackTable } from "./components/library/TrackTable";
import { ContextMenu } from "./components/ui/ContextMenu";
import { DragOverlay } from "./components/ui/DragOverlay";
import { PlaylistContextMenu } from "./components/ui/PlaylistContextMenu";
import { AnalysisModal } from "./components/ui/AnalysisModal";
import { DuplicateTracksModal } from "./components/ui/DuplicateTracksModal";
import { PlaylistCreateModal } from "./components/ui/PlaylistCreateModal";
import { PlaylistEditModal } from "./components/ui/PlaylistEditModal";
import { useFileImport } from "./hooks/useFileImport";
import { useViewConfig, type LibraryView } from "./hooks/useLibraryView";
import { initialInboxTracks, initialTracks, themes } from "./data/library";
import { useAppPreferences } from "./hooks/useAppPreferences";
import { useColumns } from "./hooks/useColumns";
import { useColumnsMenu } from "./hooks/useColumnsMenu";
import { useContextMenu } from "./hooks/useContextMenu";
import { useQueuePanel } from "./hooks/useQueuePanel";
import { useNativeDrag } from "./hooks/useNativeDrag";
import { usePlaylistMenu } from "./hooks/usePlaylistMenu";
import { usePlaylistDrag } from "./hooks/usePlaylistDrag";
import { useAudioPlayback } from "./hooks/useAudioPlayback";
import { useSelection } from "./hooks/useSelection";
import { useSidebarPanel } from "./hooks/useSidebarPanel";
import { useSidebarData } from "./hooks/useSidebarData";
import { useHistoryNavigation } from "./hooks/useHistoryNavigation";
import { useTrackRatings } from "./hooks/useTrackRatings";
import { useQueueOperations } from "./hooks/useQueueOperations";
import { usePlaybackControls } from "./hooks/usePlaybackControls";
import { usePlaylistOperations } from "./hooks/usePlaylistOperations";
import { useInboxOperations } from "./hooks/useInboxOperations";
import { useTrackAnalysis } from "./hooks/useTrackAnalysis";
import { localeOptions, t } from "./i18n";
import {
  backfillCoverArt,
  backfillSearchText,
  clearTracks,
  loadPlaylists,
  loadTracks,
} from "./utils/database";
import { importedTrackToTrack } from "./utils/importApi";
import { getPathForView } from "./utils/viewRouting";
import { compareSortValues, getSortableValue } from "./utils/trackSorting";
import { confirm, open } from "@tauri-apps/plugin-dialog";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { ColumnConfig, Playlist, Track } from "./types/library";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const playlistMatch = useMatch("/playlists/:playlistId");
  const { canGoBack, canGoForward, goBack, goForward } = useHistoryNavigation();

  const view = useMemo((): LibraryView => {
    if (location.pathname === "/inbox") return "inbox";
    if (location.pathname === "/settings") return "settings";
    if (playlistMatch?.params.playlistId) {
      return `playlist:${playlistMatch.params.playlistId}` as LibraryView;
    }
    return "library";
  }, [location.pathname, playlistMatch]);

  const navigateToView = useCallback(
    (newView: LibraryView) => {
      navigate(getPathForView(newView));
    },
    [navigate]
  );

  // Redirect unknown paths to library
  useEffect(() => {
    const { pathname } = location;
    const isKnownPath =
      pathname === "/" ||
      pathname === "/inbox" ||
      pathname === "/settings" ||
      pathname.startsWith("/playlists/");
    if (!isKnownPath) {
      navigate("/", { replace: true });
    }
  }, [location, navigate]);

  // Core state
  const [tracks, setTracks] = useState(() => initialTracks);
  const [inboxTracks, setInboxTracks] = useState(() => initialInboxTracks);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => []);
  const allTracks = useMemo(
    () => [...tracks, ...inboxTracks],
    [tracks, inboxTracks]
  );

  // Database state
  const [dbPath, setDbPath] = useState("");
  const [dbFileName, setDbFileName] = useState("muro.db");
  const [useAutoDbPath, setUseAutoDbPath] = useState(true);

  // View configuration
  const viewConfig = useViewConfig({
    view,
    playlists,
    libraryTracks: tracks,
    inboxTracks,
  });

  // Preferences
  const { locale, seekMode, setLocale, setSeekMode, setTheme, theme } =
    useAppPreferences();

  // Sorting
  const displayedTracks = viewConfig.trackTable?.tracks ?? [];
  const [sortState, setSortState] = useState<{
    key: ColumnConfig["key"];
    direction: "asc" | "desc";
  } | null>(null);

  const sortedTracks = useMemo(() => {
    if (!sortState) {
      return displayedTracks;
    }
    const next = [...displayedTracks];
    next.sort((left, right) => {
      const leftValue = getSortableValue(left, sortState.key);
      const rightValue = getSortableValue(right, sortState.key);

      if (leftValue === null && rightValue === null) {
        return 0;
      }
      if (leftValue === null) {
        return 1;
      }
      if (rightValue === null) {
        return -1;
      }

      const result = compareSortValues(leftValue, rightValue);
      return sortState.direction === "asc" ? result : -result;
    });
    return next;
  }, [displayedTracks, sortState]);

  const handleSortChange = useCallback((key: ColumnConfig["key"]) => {
    setSortState((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  }, []);

  // Selection
  const {
    selectedIds,
    activeIndex,
    handleRowSelect,
    selectAll,
    clearSelection,
  } = useSelection(sortedTracks);

  // Columns
  const {
    autoFitColumn,
    columns,
    handleColumnResize,
    reorderColumns,
    toggleColumn,
  } = useColumns({ tracks });

  // Context menus
  const { closeMenu, menuPosition, menuSelection, openForRow, openMenuId } =
    useContextMenu({
      selectedIds,
      onSelectRow: handleRowSelect,
    });
  const {
    closeMenu: closeColumnsMenu,
    isOpen: showColumns,
    position: columnsMenuPosition,
    openAt: openColumnsMenu,
  } = useColumnsMenu();

  // Playback state
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");

  // Queue operations
  const {
    queue,
    setQueue,
    queueTracks,
    addToQueue,
    playNext,
    removeFromQueue,
    clearQueue,
    reorderQueue,
  } = useQueueOperations({ allTracks });

  // Playback controls (needs to be before useAudioPlayback for handleTrackEnd)
  const [playTrackFn, setPlayTrackFn] = useState<
    ((track: Track) => void) | null
  >(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [currentTrackState, setCurrentTrackState] = useState<Track | null>(
    null
  );

  const { handleTrackEnd, handleSkipNext, handlePlayTrack } = usePlaybackControls({
    allTracks,
    currentTrack: currentTrackState
      ? {
          id: currentTrackState.id,
          title: currentTrackState.title,
          artist: currentTrackState.artist,
          album: currentTrackState.album,
          sourcePath: currentTrackState.sourcePath,
          durationSeconds: currentTrackState.durationSeconds,
          coverArtPath: currentTrackState.coverArtPath,
          coverArtThumbPath: currentTrackState.coverArtThumbPath,
        }
      : null,
    currentPosition,
    queue,
    setQueue,
    shuffleEnabled,
    repeatMode,
    playTrack: playTrackFn ?? (() => {}),
    seek: () => {},
  });

  const {
    isPlaying,
    currentPosition: audioPosition,
    duration,
    volume,
    currentTrack,
    playTrack,
    togglePlay,
    seek,
    setVolume,
  } = useAudioPlayback({ onTrackEnd: handleTrackEnd, seekMode });

  // Update state refs after useAudioPlayback initializes
  useEffect(() => {
    setPlayTrackFn(() => playTrack);
  }, [playTrack]);

  useEffect(() => {
    setCurrentPosition(audioPosition);
  }, [audioPosition]);

  useEffect(() => {
    if (currentTrack) {
      const track = allTracks.find((t) => t.id === currentTrack.id);
      setCurrentTrackState(track ?? null);
    } else {
      setCurrentTrackState(null);
    }
  }, [currentTrack, allTracks]);

  // Re-create skip handlers with proper seek function
  const skipPrevious = useCallback(() => {
    if (audioPosition > 3) {
      seek(0);
      return;
    }
    const currentIndex = currentTrack
      ? allTracks.findIndex((t) => t.id === currentTrack.id)
      : -1;
    if (currentIndex > 0) {
      playTrack(allTracks[currentIndex - 1]);
    }
  }, [audioPosition, currentTrack, allTracks, seek, playTrack]);

  const toggleShuffle = useCallback(() => {
    setShuffleEnabled((current) => !current);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((current) =>
      current === "off" ? "all" : current === "all" ? "one" : "off"
    );
  }, []);

  // Track ratings
  const { handleRatingChange } = useTrackRatings({ setTracks });

  // Import progress state
  const [importProgress, setImportProgress] = useState<{
    imported: number;
    total: number;
    phase: "scanning" | "importing";
  } | null>(null);

  // File import and playlist drop
  const {
    handleImportPaths,
    handlePlaylistDrop,
    handleCreatePlaylist,
    pendingPlaylistDrop,
    confirmPlaylistDropOperation,
    cancelPlaylistDropOperation,
  } = useFileImport({
    dbPath,
    dbFileName,
    playlists,
    setImportProgress,
    setPlaylists,
    setInboxTracks,
    onImportComplete: () => navigateToView("inbox"),
  });

  // Playlist drag
  const {
    dragIndicator,
    draggingPlaylistId,
    isInternalDrag,
    onPlaylistDragEnter,
    onPlaylistDragLeave,
    onPlaylistDragOver,
    onPlaylistDropEvent,
    onRowMouseDown,
  } = usePlaylistDrag({ selectedIds, onDropToPlaylist: handlePlaylistDrop });

  // Playlist menu
  const {
    closeMenu: closePlaylistMenu,
    isOpen: isPlaylistMenuOpen,
    openAt: openPlaylistMenu,
    playlistId: playlistMenuId,
    position: playlistMenuPosition,
  } = usePlaylistMenu();

  const playlistMenuTarget = useMemo(
    () => playlists.find((playlist) => playlist.id === playlistMenuId) ?? null,
    [playlists, playlistMenuId]
  );

  // Playlist operations
  const {
    isPlaylistEditOpen,
    playlistEditName,
    setPlaylistEditName,
    handleOpenPlaylistEdit,
    handleClosePlaylistEdit,
    handleDeletePlaylist,
    handlePlaylistEditSubmit,
  } = usePlaylistOperations({
    dbPath,
    dbFileName,
    playlists,
    currentView: view,
    setPlaylists,
    navigateToView,
  });

  // Inbox operations
  const { handleAcceptTracks, handleRejectTracks } = useInboxOperations({
    dbPath,
    dbFileName,
    inboxTracks,
    selectedIds,
    clearSelection,
    setTracks,
    setInboxTracks,
  });

  // Track analysis
  const {
    analysisTrackIds,
    isAnalysisModalOpen,
    openAnalysisModal,
    closeAnalysisModal,
    handleAnalysisComplete,
  } = useTrackAnalysis({ setTracks, setInboxTracks });

  // Playlist create modal state
  const [isPlaylistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");

  // Panel state
  const { sidebarWidth, startSidebarResize } = useSidebarPanel();
  const {
    queuePanelCollapsed,
    queuePanelWidth,
    startQueuePanelResize,
    toggleQueuePanelCollapsed,
  } = useQueuePanel();

  // Backfill state
  const [backfillPending, setBackfillPending] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);
  const [coverArtBackfillPending, setCoverArtBackfillPending] = useState(false);
  const [coverArtBackfillStatus, setCoverArtBackfillStatus] = useState<
    string | null
  >(null);
  const [clearSongsPending, setClearSongsPending] = useState(false);

  // Sidebar props
  const sidebarProps = useSidebarData({
    view,
    tracksCount: tracks.length,
    inboxCount: inboxTracks.length,
    playlists,
    draggingPlaylistId,
    canGoBack,
    canGoForward,
    onGoBack: goBack,
    onGoForward: goForward,
    onViewChange: navigateToView,
    onPlaylistDrop: onPlaylistDropEvent,
    onPlaylistDragEnter,
    onPlaylistDragLeave,
    onPlaylistDragOver,
    onCreatePlaylist: () => {
      setPlaylistName("");
      setPlaylistModalOpen(true);
    },
    onPlaylistContextMenu: openPlaylistMenu,
  });

  // Native drag
  const { isDragging, nativeDropStatus } = useNativeDrag(handleImportPaths);

  // Context menu handlers
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

  const handleShowBpmKey = useCallback(() => {
    openAnalysisModal(menuSelection);
    closeMenu();
  }, [menuSelection, closeMenu, openAnalysisModal]);

  // Playlist menu handlers
  const handlePlaylistMenuEdit = useCallback(() => {
    if (!playlistMenuTarget) {
      return;
    }
    handleOpenPlaylistEdit(playlistMenuTarget);
    closePlaylistMenu();
  }, [closePlaylistMenu, handleOpenPlaylistEdit, playlistMenuTarget]);

  const handlePlaylistMenuDelete = useCallback(() => {
    if (!playlistMenuId) {
      return;
    }
    closePlaylistMenu();
    handleDeletePlaylist(playlistMenuId);
  }, [closePlaylistMenu, handleDeletePlaylist, playlistMenuId]);

  // Disable user select during internal drag
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

  // Auto-resolve DB path
  useEffect(() => {
    let isMounted = true;

    const resolveDefaultDbPath = async () => {
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

    resolveDefaultDbPath();
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

  // Load library on mount
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

  // Backfill handlers
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

  const handleBackfillCoverArt = useCallback(async () => {
    if (!dbPath.trim()) {
      setCoverArtBackfillStatus("Enter a database path to run the backfill.");
      return;
    }

    try {
      setCoverArtBackfillPending(true);
      setCoverArtBackfillStatus("Extracting cover art...");
      const updated = await backfillCoverArt(dbPath.trim());
      setCoverArtBackfillStatus(`Extracted cover art for ${updated} tracks.`);
      // Reload tracks to get the new cover art paths
      const resolvedPath = await resolveDbPath();
      const snapshot = await loadTracks(resolvedPath);
      setTracks(snapshot.library.map(importedTrackToTrack));
      setInboxTracks(snapshot.inbox.map(importedTrackToTrack));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Cover art extraction failed.";
      setCoverArtBackfillStatus(message);
    } finally {
      setCoverArtBackfillPending(false);
    }
  }, [dbPath, resolveDbPath]);

  // Import handlers
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

  // Playlist submit handler
  const handlePlaylistSubmit = useCallback(async () => {
    const trimmed = playlistName.trim();
    if (!trimmed) {
      return;
    }

    await handleCreatePlaylist(trimmed);
    setPlaylistName("");
    setPlaylistModalOpen(false);
  }, [handleCreatePlaylist, playlistName]);

  // Clear songs handler
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
        closePlaylistMenu();
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
      <PlaylistEditModal
        isOpen={isPlaylistEditOpen}
        value={playlistEditName}
        onChange={setPlaylistEditName}
        onClose={handleClosePlaylistEdit}
        onSubmit={handlePlaylistEditSubmit}
      />
      <DuplicateTracksModal
        isOpen={pendingPlaylistDrop !== null}
        duplicateTracks={
          pendingPlaylistDrop
            ? pendingPlaylistDrop.duplicateTrackIds
                .map((id) => allTracks.find((t) => t.id === id))
                .filter((t): t is Track => t !== undefined)
            : []
        }
        onClose={cancelPlaylistDropOperation}
        onConfirm={confirmPlaylistDropOperation}
      />
      <AnalysisModal
        isOpen={isAnalysisModalOpen}
        tracks={analysisTrackIds
          .map((id) => allTracks.find((t) => t.id === id))
          .filter((t): t is Track => t !== undefined)}
        dbPath={dbPath}
        onClose={closeAnalysisModal}
        onAnalysisComplete={handleAnalysisComplete}
      />
      <div
        className="grid h-screen grid-cols-[var(--sidebar-width)_1fr_var(--queue-width)] grid-rows-[1fr_auto_var(--media-controls-height)] overflow-hidden"
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
            "--queue-width": `${queuePanelWidth}px`,
          } as CSSProperties
        }
      >
        <AppLayout
          onSidebarResizeStart={startSidebarResize}
          onQueuePanelResizeStart={startQueuePanelResize}
          sidebar={<Sidebar {...sidebarProps} />}
          main={
            <>
              <ContextMenu
                isOpen={Boolean(openMenuId)}
                position={menuPosition}
                selectionCount={menuSelection.length}
                onPlay={() => {
                  if (menuSelection.length > 0) {
                    const firstTrack = allTracks.find(
                      (t) => t.id === menuSelection[0]
                    );
                    if (firstTrack) {
                      playTrack(firstTrack);
                    }
                  }
                  closeMenu();
                }}
                onPlayNext={() => {
                  playNext(menuSelection);
                  closeMenu();
                }}
                onAddToQueue={() => {
                  addToQueue(menuSelection);
                  closeMenu();
                }}
                onShowBpmKey={handleShowBpmKey}
              />
              <PlaylistContextMenu
                isOpen={isPlaylistMenuOpen}
                position={playlistMenuPosition}
                playlistName={playlistMenuTarget?.name}
                onEdit={handlePlaylistMenuEdit}
                onDelete={handlePlaylistMenuDelete}
              />
              <ColumnsMenu
                isOpen={showColumns}
                position={columnsMenuPosition}
                columns={columns}
                onToggleColumn={toggleColumn}
              />
              <div className="flex min-h-0 flex-1 flex-col">
                <LibraryHeader
                  title={viewConfig.title}
                  subtitle={viewConfig.subtitle}
                  isSettings={viewConfig.type === "settings"}
                />
                {viewConfig.trackTable && importProgress && (
                  <div className="border-b border-[var(--color-border-light)] bg-[var(--color-bg-primary)] px-[var(--spacing-lg)] py-[var(--spacing-md)]">
                    <div className="mb-[var(--spacing-xs)] text-[length:var(--font-size-xs)] font-semibold text-[color:var(--color-text-secondary)]">
                      {importProgress.phase === "scanning" ||
                      importProgress.total === 0
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
                      coverArtBackfillPending={coverArtBackfillPending}
                      coverArtBackfillStatus={coverArtBackfillStatus}
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
                      onBackfillCoverArt={handleBackfillCoverArt}
                      onClearSongs={handleClearSongs}
                      onUseDefaultLocation={() => {
                        setUseAutoDbPath(true);
                      }}
                    />
                  ) : (
                    viewConfig.trackTable && (
                      <>
                        <TrackTable
                          tracks={sortedTracks}
                          columns={columns}
                          selectedIds={selectedIds}
                          activeIndex={activeIndex}
                          emptyTitle={viewConfig.trackTable.emptyState.title}
                          emptyDescription={
                            viewConfig.trackTable.emptyState.description
                          }
                          emptyActionLabel={
                            viewConfig.trackTable.emptyState.primaryAction
                              ?.label
                          }
                          onEmptyAction={
                            viewConfig.trackTable.showImportActions
                              ? handleEmptyImport
                              : undefined
                          }
                          emptySecondaryActionLabel={
                            viewConfig.trackTable.emptyState.secondaryAction
                              ?.label
                          }
                          onEmptySecondaryAction={
                            viewConfig.trackTable.showImportActions
                              ? handleEmptyImportFolder
                              : undefined
                          }
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
                          onColumnReorder={reorderColumns}
                          onHeaderContextMenu={openColumnsMenu}
                          onSortChange={handleSortChange}
                          sortState={sortState}
                          onRatingChange={handleRatingChange}
                        />
                        {viewConfig.trackTable.banner === "inbox" && (
                          <InboxBanner
                            selectedCount={selectedIds.size}
                            onAccept={handleAcceptTracks}
                            onReject={handleRejectTracks}
                          />
                        )}
                      </>
                    )
                  )}
                </section>
              </div>
            </>
          }
          detail={
            <QueuePanel
              collapsed={queuePanelCollapsed}
              onToggleCollapsed={toggleQueuePanelCollapsed}
              queueTracks={queueTracks}
              currentTrack={currentTrack}
              onRemoveFromQueue={removeFromQueue}
              onReorderQueue={reorderQueue}
              onClearQueue={clearQueue}
            />
          }
        />
        <PlayerBar
          isPlaying={isPlaying}
          shuffleEnabled={shuffleEnabled}
          repeatMode={repeatMode}
          currentPosition={audioPosition}
          duration={duration}
          volume={volume}
          currentTrack={currentTrack}
          onTogglePlay={togglePlay}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onSeekChange={seek}
          onVolumeChange={setVolume}
          onSkipPrevious={skipPrevious}
          onSkipNext={handleSkipNext}
        />
      </div>
    </div>
  );
}

export default App;
