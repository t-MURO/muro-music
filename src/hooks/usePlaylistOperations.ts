import { useCallback } from "react";
import { appDataDir, join } from "@tauri-apps/api/path";
import { commandManager } from "../command-manager/commandManager";
import { useLibraryStore, useSettingsStore, useUIStore } from "../stores";
import {
  addTracksToPlaylist,
  createPlaylist,
  deletePlaylist,
} from "../utils/database";
import type { LibraryView } from "./useLibraryView";

type UsePlaylistOperationsArgs = {
  currentView: LibraryView;
  navigateToView: (view: LibraryView) => void;
};

export const usePlaylistOperations = ({
  currentView,
  navigateToView,
}: UsePlaylistOperationsArgs) => {
  // Get state and actions from stores
  const dbPath = useSettingsStore((s) => s.dbPath);
  const dbFileName = useSettingsStore((s) => s.dbFileName);
  const playlists = useLibraryStore((s) => s.playlists);
  const setPlaylists = useLibraryStore((s) => s.setPlaylists);
  const playlistEditState = useUIStore((s) => s.playlistEditState);
  const openPlaylistEdit = useUIStore((s) => s.openPlaylistEdit);
  const closePlaylistEdit = useUIStore((s) => s.closePlaylistEdit);
  const setPlaylistEditName = useUIStore((s) => s.setPlaylistEditName);

  const handleOpenPlaylistEdit = useCallback(
    (playlist: { id: string; name: string }) => {
      openPlaylistEdit(playlist.id, playlist.name);
    },
    [openPlaylistEdit]
  );

  const handleClosePlaylistEdit = useCallback(() => {
    closePlaylistEdit();
  }, [closePlaylistEdit]);

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
    async (playlistId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist) {
        return;
      }

      const trimmedDbPath = dbPath.trim();
      const resolvedDbPath = trimmedDbPath
        ? trimmedDbPath
        : await join(await appDataDir(), dbFileName || "muro.db");
      const removedPlaylist = { ...playlist };
      const removedIndex = playlists.findIndex((p) => p.id === playlistId);
      const wasOnDeletedPlaylist = currentView === `playlist:${playlistId}`;

      const command = {
        label: "Delete playlist",
        do: () => {
          setPlaylists((current) =>
            current.filter((p) => p.id !== playlistId)
          );
          if (wasOnDeletedPlaylist) {
            navigateToView("library");
          }
          deletePlaylist(resolvedDbPath, playlistId).catch((error) =>
            console.error("Failed to delete playlist:", error)
          );
        },
        undo: () => {
          setPlaylists((current) => {
            const next = [...current];
            const insertIndex = Math.min(removedIndex, next.length);
            next.splice(insertIndex, 0, removedPlaylist);
            return next;
          });
          if (wasOnDeletedPlaylist) {
            navigateToView(`playlist:${playlistId}` as LibraryView);
          }
          // Recreate playlist and restore tracks
          createPlaylist(
            resolvedDbPath,
            removedPlaylist.id,
            removedPlaylist.name
          )
            .then(() => {
              if (removedPlaylist.trackIds.length > 0) {
                return addTracksToPlaylist(
                  resolvedDbPath,
                  removedPlaylist.id,
                  removedPlaylist.trackIds
                );
              }
            })
            .catch((error) =>
              console.error("Failed to restore playlist:", error)
            );
        },
      };

      commandManager.execute(command);
    },
    [dbFileName, dbPath, navigateToView, playlists, setPlaylists, currentView]
  );

  const handlePlaylistEditSubmit = useCallback(() => {
    if (!playlistEditState) {
      return;
    }
    const trimmed = playlistEditState.name.trim();
    if (!trimmed) {
      return;
    }
    handleRenamePlaylist(playlistEditState.id, trimmed);
    handleClosePlaylistEdit();
  }, [handleRenamePlaylist, playlistEditState, handleClosePlaylistEdit]);

  return {
    // Edit modal state
    isPlaylistEditOpen: playlistEditState !== null,
    playlistEditName: playlistEditState?.name ?? "",
    setPlaylistEditName,
    // Handlers
    handleOpenPlaylistEdit,
    handleClosePlaylistEdit,
    handleRenamePlaylist,
    handleDeletePlaylist,
    handlePlaylistEditSubmit,
  };
};
