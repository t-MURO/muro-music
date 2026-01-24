import { invoke } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { useCallback, useEffect, useRef } from "react";
import { commandManager, type Command } from "../command-manager/commandManager";
import { createPlaylist } from "../utils/tauriDb";
import type { Playlist, Track } from "../types/library";

type UseLibraryCommandsArgs = {
  dbPath: string;
  dbFileName: string;
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  setInboxTracks: React.Dispatch<React.SetStateAction<Track[]>>;
};

export const useLibraryCommands = ({
  dbPath,
  dbFileName,
  setPlaylists,
  setInboxTracks,
}: UseLibraryCommandsArgs) => {
  const importSequenceRef = useRef(0);
  const playlistSequenceRef = useRef(0);

  const handlePlaylistDrop = useCallback(
    (playlistId: string, payload: string[] = []) => {
      if (payload.length === 0) {
        return;
      }

      let previousIds: string[] | null = null;
      const command: Command = {
        label: `Add ${payload.length} tracks to playlist`,
        do: () => {
          setPlaylists((current) =>
            current.map((playlist) => {
              if (playlist.id !== playlistId) {
                return playlist;
              }
              previousIds = playlist.trackIds;
              const nextIds = Array.from(
                new Set([...playlist.trackIds, ...payload])
              );
              return { ...playlist, trackIds: nextIds };
            })
          );
        },
        undo: () => {
          if (!previousIds) {
            return;
          }
          setPlaylists((current) =>
            current.map((playlist) =>
              playlist.id === playlistId
                ? { ...playlist, trackIds: previousIds ?? [] }
                : playlist
            )
          );
        },
      };

      commandManager.execute(command);
    },
    [setPlaylists]
  );

  const createImportedTracks = useCallback((paths: string[]) => {
    return paths.map((path) => {
      importSequenceRef.current += 1;
      const name = path.split("/").pop() ?? path;
      const title = name.replace(/\.[^/.]+$/, "");
      return {
        id: `import-${Date.now()}-${importSequenceRef.current}`,
        title,
        artist: "Unknown Artist",
        album: "Inbox Import",
        duration: "--:--",
        bitrate: "--",
        rating: 0,
      };
    });
  }, []);

  const handleImportPaths = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) {
        return;
      }

      const imported = createImportedTracks(paths);
      const command: Command = {
        label: `Import ${imported.length} tracks`,
        do: () => {
          setInboxTracks((current) => [...imported, ...current]);
        },
        undo: () => {
          const ids = new Set(imported.map((track) => track.id));
          setInboxTracks((current) =>
            current.filter((track) => !ids.has(track.id))
          );
        },
      };
      commandManager.execute(command);

      try {
        const count = await invoke<number>("import_files", { paths });
        console.info("Import stub accepted files:", count);
      } catch (error) {
        console.error("Import stub failed:", error);
      }
    },
    [createImportedTracks, setInboxTracks]
  );

  const handleCreatePlaylist = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }

      playlistSequenceRef.current += 1;
      const playlist: Playlist = {
        id: `playlist-${Date.now()}-${playlistSequenceRef.current}`,
        name: trimmed,
        trackIds: [],
      };

      const command: Command = {
        label: `Create playlist ${trimmed}`,
        do: () => {
          setPlaylists((current) => [...current, playlist]);
        },
        undo: () => {
          setPlaylists((current) =>
            current.filter((item) => item.id !== playlist.id)
          );
        },
      };

      commandManager.execute(command);

      try {
        let resolvedDbPath = dbPath.trim();
        if (!resolvedDbPath) {
          const baseDir = await appDataDir();
          resolvedDbPath = await join(baseDir, dbFileName || "muro.db");
        }

        await createPlaylist(resolvedDbPath, playlist.id, playlist.name);
      } catch (error) {
        console.error("Playlist create failed:", error);
      }
    },
    [dbFileName, dbPath, setPlaylists]
  );

  useEffect(() => {
    const handleUndoRedo = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") {
        return;
      }

      event.preventDefault();
      if (key === "y" || event.shiftKey) {
        commandManager.redo();
        return;
      }
      commandManager.undo();
    };

    window.addEventListener("keydown", handleUndoRedo);
    return () => window.removeEventListener("keydown", handleUndoRedo);
  }, []);

  return { handleImportPaths, handlePlaylistDrop, handleCreatePlaylist };
};
