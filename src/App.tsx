import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { DuplicateTracksModal } from "./components/ui/DuplicateTracksModal";
import { PlaylistCreateModal } from "./components/ui/PlaylistCreateModal";
import { PlaylistEditModal } from "./components/ui/PlaylistEditModal";
import { useLibraryCommands } from "./hooks/useLibraryCommands";
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
import { localeOptions, t } from "./i18n";
import { backfillCoverArt, backfillSearchText, clearTracks, importedTrackToTrack, loadPlaylists, loadTracks } from "./utils/tauriDb";
import { commandManager } from "./command-manager/commandManager";
import { confirm, open } from "@tauri-apps/plugin-dialog";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { ColumnConfig, Playlist, Track } from "./types/library";

const getSortableValue = (track: Track, key: ColumnConfig["key"]) => {
  switch (key) {
    case "duration":
      return track.durationSeconds;
    case "rating":
      return track.rating;
    case "trackNumber":
      return track.trackNumber ?? null;
    case "trackTotal":
      return track.trackTotal ?? null;
    case "year":
      return track.year ?? null;
    case "artists":
      return track.artists ?? track.artist;
    case "key":
      return track.key ?? null;
    case "date":
    case "dateAdded":
    case "dateModified": {
      const raw =
        key === "date"
          ? track.date
          : key === "dateAdded"
          ? track.dateAdded
          : track.dateModified;
      if (!raw) {
        return null;
      }
      const parsed = Date.parse(raw);
      return Number.isNaN(parsed) ? raw : parsed;
    }
    default: {
      const value = track[key as keyof Track];
      return value === undefined || value === null ? null : value;
    }
  }
};

const compareSortValues = (left: string | number, right: string | number) => {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const getPathForView = (view: LibraryView): string => {
  if (view === "inbox") return "/inbox";
  if (view === "settings") return "/settings";
  if (view.startsWith("playlist:")) return `/playlists/${view.slice("playlist:".length)}`;
  return "/";
};



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

  const navigateToView = useCallback((newView: LibraryView) => {
    navigate(getPathForView(newView));
  }, [navigate]);

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

  const { selectedIds, activeIndex, handleRowSelect, selectAll, clearSelection } =
    useSelection(sortedTracks);
  const { autoFitColumn, columns, handleColumnResize, reorderColumns, toggleColumn } =
    useColumns({
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
    openAt: openColumnsMenu,
  } = useColumnsMenu();
  const [importProgress, setImportProgress] = useState<
    { imported: number; total: number; phase: "scanning" | "importing" } | null
  >(null);
  const [clearSongsPending, setClearSongsPending] = useState(false);
  const [isPlaylistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [isPlaylistEditOpen, setPlaylistEditOpen] = useState(false);
  const [playlistEditName, setPlaylistEditName] = useState("");
  const [playlistEditId, setPlaylistEditId] = useState<string | null>(null);
  const { sidebarWidth, startSidebarResize } = useSidebarPanel();
  const [dbPath, setDbPath] = useState("");
  const [dbFileName, setDbFileName] = useState("muro.db");
  const [useAutoDbPath, setUseAutoDbPath] = useState(true);
  const [backfillPending, setBackfillPending] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);
  const [coverArtBackfillPending, setCoverArtBackfillPending] = useState(false);
  const [coverArtBackfillStatus, setCoverArtBackfillStatus] = useState<string | null>(null);
  const {
    queuePanelCollapsed,
    queuePanelWidth,
    startQueuePanelResize,
    toggleQueuePanelCollapsed,
  } = useQueuePanel();

  // Playback state
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [queue, setQueue] = useState<string[]>([]); // Array of track IDs

  const allTracks = [...tracks, ...inboxTracks];

  // Queue operations
  const addToQueue = useCallback((trackIds: string[]) => {
    setQueue(q => [...q, ...trackIds]);
  }, []);

  const playNext = useCallback((trackIds: string[]) => {
    setQueue(q => [...trackIds, ...q]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue(q => q.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue(q => {
      const newQueue = [...q];
      const [removed] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, removed);
      return newQueue;
    });
  }, []);

  // Get actual track objects for queue display
  const queueTracks = useMemo(() => {
    return queue
      .map(id => allTracks.find(t => t.id === id))
      .filter((t): t is Track => t !== undefined);
  }, [queue, allTracks]);

  // Refs for track-end handler - declared before useAudioPlayback so the stable callback can use them
  const allTracksRef = useRef(allTracks);
  const repeatModeRef = useRef(repeatMode);
  const shuffleEnabledRef = useRef(shuffleEnabled);
  const currentTrackIdRef = useRef<string | null>(null);
  const playTrackRef = useRef<((track: Track) => void) | null>(null);
  const queueRef = useRef(queue);
  const setQueueRef = useRef(setQueue);

  /**
   * Determines the next track to play based on queue, shuffle, and repeat settings.
   * Returns the next track and updated queue (with first item removed if queue was used).
   * 
   * @param respectRepeatOne - If true, repeat "one" mode will return the current track.
   *                           Set to true for auto-advance (track end), false for manual skip.
   */
  const getNextPlayableTrack = useCallback((
    tracks: Track[],
    currentQueue: string[],
    currentTrackId: string | null,
    repeat: "off" | "all" | "one",
    shuffle: boolean,
    respectRepeatOne: boolean
  ): { nextTrack: Track | null; nextQueue: string[] } => {
    // If there's a track in the queue, use it
    if (currentQueue.length > 0) {
      const nextTrackId = currentQueue[0];
      const nextTrack = tracks.find(t => t.id === nextTrackId);
      if (nextTrack) {
        return { nextTrack, nextQueue: currentQueue.slice(1) };
      }
    }

    // No queue - fall back to normal progression
    if (tracks.length === 0) {
      return { nextTrack: null, nextQueue: currentQueue };
    }

    const currentIndex = currentTrackId 
      ? tracks.findIndex(t => t.id === currentTrackId) 
      : -1;

    // Repeat one (only for auto-advance, not manual skip)
    if (respectRepeatOne && repeat === "one" && currentIndex !== -1) {
      return { nextTrack: tracks[currentIndex], nextQueue: currentQueue };
    }

    // Shuffle
    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      return { nextTrack: tracks[randomIndex], nextQueue: currentQueue };
    }

    // Next track in list
    if (currentIndex < tracks.length - 1) {
      return { nextTrack: tracks[currentIndex + 1], nextQueue: currentQueue };
    }

    // Repeat all - wrap to beginning
    if (repeat === "all") {
      return { nextTrack: tracks[0], nextQueue: currentQueue };
    }

    // End of list, no repeat
    return { nextTrack: null, nextQueue: currentQueue };
  }, []);

  // Stable callback that reads from refs (for track end event)
  const handleTrackEnd = useCallback(() => {
    const tracks = allTracksRef.current;
    const trackId = currentTrackIdRef.current;
    const repeat = repeatModeRef.current;
    const shuffle = shuffleEnabledRef.current;
    const play = playTrackRef.current;
    const currentQueue = queueRef.current;
    const updateQueue = setQueueRef.current;

    if (!play) return;

    const { nextTrack, nextQueue } = getNextPlayableTrack(
      tracks, currentQueue, trackId, repeat, shuffle, true
    );

    if (nextTrack) {
      if (nextQueue !== currentQueue) {
        updateQueue(nextQueue);
      }
      play(nextTrack);
    }
  }, [getNextPlayableTrack]);

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
  } = useAudioPlayback({ onTrackEnd: handleTrackEnd, seekMode });

  // Keep refs in sync
  useEffect(() => { allTracksRef.current = allTracks; }, [allTracks]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffleEnabledRef.current = shuffleEnabled; }, [shuffleEnabled]);
  useEffect(() => { currentTrackIdRef.current = currentTrack?.id ?? null; }, [currentTrack]);
  useEffect(() => { playTrackRef.current = playTrack; }, [playTrack]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

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
      seek(0);
      return;
    }
    const currentIndex = currentTrack 
      ? allTracks.findIndex(t => t.id === currentTrack.id) 
      : -1;
    if (currentIndex > 0) {
      playTrack(allTracks[currentIndex - 1]);
    }
  }, [currentPosition, currentTrack, allTracks, seek, playTrack]);

  const handleSkipNext = useCallback(() => {
    const { nextTrack, nextQueue } = getNextPlayableTrack(
      allTracks, queue, currentTrack?.id ?? null, repeatMode, shuffleEnabled, false
    );

    if (nextTrack) {
      if (nextQueue !== queue) {
        setQueue(nextQueue);
      }
      playTrack(nextTrack);
    }
  }, [allTracks, queue, currentTrack, repeatMode, shuffleEnabled, playTrack, getNextPlayableTrack]);

  const handlePlayTrack = useCallback((trackId: string) => {
    const track = allTracks.find((t) => t.id === trackId);
    if (track) {
      void playTrack(track);
    }
  }, [allTracks, playTrack]);

  const { handleRatingChange } = useTrackRatings({ setTracks });

  const {
    handleImportPaths,
    handlePlaylistDrop,
    handleCreatePlaylist,
    pendingPlaylistDrop,
    confirmPendingPlaylistDrop,
    cancelPendingPlaylistDrop,
  } = useLibraryCommands({
      dbPath,
      dbFileName,
      playlists,
      setImportProgress,
      setPlaylists,
      setInboxTracks,
    });

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

  const { isDragging, nativeDropStatus } = useNativeDrag(handleImportPaths);

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

  const handleOpenPlaylistEdit = useCallback((playlist: Playlist) => {
    setPlaylistEditId(playlist.id);
    setPlaylistEditName(playlist.name);
    setPlaylistEditOpen(true);
  }, []);

  const handleRenamePlaylist = useCallback(
    (playlistId: string, nextName: string) => {
      let previousName: string | null = null;
      const command = {
        label: `Rename playlist to ${nextName}`,
        do: () => {
          setPlaylists((current) =>
            current.map((playlist) => {
              if (playlist.id !== playlistId) {
                return playlist;
              }
              previousName = playlist.name;
              return { ...playlist, name: nextName };
            })
          );
        },
        undo: () => {
          if (previousName === null) {
            return;
          }
          setPlaylists((current) =>
            current.map((playlist) =>
              playlist.id === playlistId
                ? { ...playlist, name: previousName ?? playlist.name }
                : playlist
            )
          );
        },
      };

      commandManager.execute(command);
    },
    [setPlaylists]
  );

  const handleDeletePlaylist = useCallback(
    (playlistId: string) => {
      let removedPlaylist: Playlist | null = null;
      let removedIndex = -1;
      const wasOnDeletedPlaylist = view === `playlist:${playlistId}`;
      const command = {
        label: "Delete playlist",
        do: () => {
          setPlaylists((current) => {
            removedIndex = current.findIndex((playlist) => playlist.id === playlistId);
            removedPlaylist = removedIndex >= 0 ? current[removedIndex] : null;
            return current.filter((playlist) => playlist.id !== playlistId);
          });
          if (wasOnDeletedPlaylist) {
            navigateToView("library");
          }
        },
        undo: () => {
          if (!removedPlaylist || removedIndex < 0) {
            return;
          }
          setPlaylists((current) => {
            const next = [...current];
            const insertIndex = Math.min(removedIndex, next.length);
            next.splice(insertIndex, 0, removedPlaylist as Playlist);
            return next;
          });
          if (wasOnDeletedPlaylist) {
            navigateToView(`playlist:${playlistId}` as LibraryView);
          }
        },
      };

      commandManager.execute(command);
    },
    [navigateToView, setPlaylists, view]
  );

  const handlePlaylistEditSubmit = useCallback(() => {
    if (!playlistEditId) {
      return;
    }
    const trimmed = playlistEditName.trim();
    if (!trimmed) {
      return;
    }
    handleRenamePlaylist(playlistEditId, trimmed);
    setPlaylistEditOpen(false);
    setPlaylistEditId(null);
    setPlaylistEditName("");
  }, [handleRenamePlaylist, playlistEditId, playlistEditName]);

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
        onClose={() => {
          setPlaylistEditOpen(false);
          setPlaylistEditId(null);
          setPlaylistEditName("");
        }}
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
        onClose={cancelPendingPlaylistDrop}
        onConfirm={confirmPendingPlaylistDrop}
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
          sidebar={
            <Sidebar
              {...sidebarProps}
            />
          }
          main={
            <>
              <ContextMenu
                isOpen={Boolean(openMenuId)}
                position={menuPosition}
                selectionCount={menuSelection.length}
                onPlay={() => {
                  if (menuSelection.length > 0) {
                    const firstTrack = allTracks.find(t => t.id === menuSelection[0]);
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
                  ) : viewConfig.trackTable && (
                    <>
                      <TrackTable
                        tracks={sortedTracks}
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
                        onColumnReorder={reorderColumns}
                        onHeaderContextMenu={openColumnsMenu}
                        onSortChange={handleSortChange}
                        sortState={sortState}
                        onRatingChange={handleRatingChange}
                      />
                      {viewConfig.trackTable.banner === "inbox" && (
                        <InboxBanner selectedCount={selectedIds.size} />
                      )}
                    </>
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
