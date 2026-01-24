import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef } from "react";
import { commandManager, type Command } from "../command-manager/commandManager";
import type { Playlist, Track } from "../types/library";

type UseLibraryCommandsArgs = {
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  setInboxTracks: React.Dispatch<React.SetStateAction<Track[]>>;
};

export const useLibraryCommands = ({
  setPlaylists,
  setInboxTracks,
}: UseLibraryCommandsArgs) => {
  const importSequenceRef = useRef(0);

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

  return { handleImportPaths, handlePlaylistDrop };
};
