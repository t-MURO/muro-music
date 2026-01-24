import { appDataDir, join } from "@tauri-apps/api/path";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef } from "react";
import { commandManager, type Command } from "../command-manager/commandManager";
import { createPlaylist, importFiles, importedTrackToTrack } from "../utils/tauriDb";
import type { Playlist, Track } from "../types/library";

export type ImportProgress = {
  imported: number;
  total: number;
  phase: "scanning" | "importing";
};

type UseLibraryCommandsArgs = {
  dbPath: string;
  dbFileName: string;
  setImportProgress: React.Dispatch<React.SetStateAction<ImportProgress | null>>;
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  setInboxTracks: React.Dispatch<React.SetStateAction<Track[]>>;
};

export const useLibraryCommands = ({
  dbPath,
  dbFileName,
  setImportProgress,
  setPlaylists,
  setInboxTracks,
}: UseLibraryCommandsArgs) => {
  const playlistSequenceRef = useRef(0);
  const clearProgressTimerRef = useRef<number | null>(null);

  const resolveDbPath = useCallback(async () => {
    const trimmed = dbPath.trim();
    if (trimmed) {
      return trimmed;
    }
    const baseDir = await appDataDir();
    return join(baseDir, dbFileName || "muro.db");
  }, [dbFileName, dbPath]);

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

  const handleImportPaths = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) {
        return;
      }

      try {
        if (clearProgressTimerRef.current !== null && typeof window !== "undefined") {
          window.clearTimeout(clearProgressTimerRef.current);
          clearProgressTimerRef.current = null;
        }
        setImportProgress({ imported: 0, total: 0, phase: "scanning" });
        const resolvedDbPath = await resolveDbPath();
        const imported = await importFiles(resolvedDbPath, paths);
        if (imported.length === 0) {
          if (typeof window !== "undefined") {
            clearProgressTimerRef.current = window.setTimeout(() => {
              setImportProgress(null);
              clearProgressTimerRef.current = null;
            }, 500);
          } else {
            setImportProgress(null);
          }
          return;
        }

        const convertedTracks = imported.map(importedTrackToTrack);
        const command: Command = {
          label: `Import ${imported.length} tracks`,
          do: () => {
            setInboxTracks((current) => [...convertedTracks, ...current]);
          },
          undo: () => {
            const ids = new Set(imported.map((track) => track.id));
            setInboxTracks((current) =>
              current.filter((track) => !ids.has(track.id))
            );
          },
        };
        commandManager.execute(command);
        if (typeof window !== "undefined") {
          clearProgressTimerRef.current = window.setTimeout(() => {
            setImportProgress(null);
            clearProgressTimerRef.current = null;
          }, 800);
        } else {
          setImportProgress(null);
        }
      } catch (error) {
        console.error("Import failed:", error);
        setImportProgress(null);
      }
    },
    [resolveDbPath, setImportProgress, setInboxTracks]
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
        const resolvedDbPath = await resolveDbPath();
        await createPlaylist(resolvedDbPath, playlist.id, playlist.name);
      } catch (error) {
        console.error("Playlist create failed:", error);
      }
    },
    [resolveDbPath, setPlaylists]
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

  const importListenerSetupRef = useRef(false);
  const importUnlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (importListenerSetupRef.current) {
      return;
    }
    importListenerSetupRef.current = true;

    const setup = async () => {
      try {
        importUnlistenRef.current = await listen<ImportProgress>(
          "muro://import-progress",
          (event) => {
            const payload = event.payload;
            if (!payload) {
              return;
            }
            setImportProgress({
              imported: payload.imported,
              total: payload.total,
              phase: "importing",
            });
            if (payload.total > 0 && payload.imported >= payload.total) {
              if (clearProgressTimerRef.current !== null && typeof window !== "undefined") {
                window.clearTimeout(clearProgressTimerRef.current);
              }
              if (typeof window !== "undefined") {
                clearProgressTimerRef.current = window.setTimeout(() => {
                  setImportProgress(null);
                  clearProgressTimerRef.current = null;
                }, 800);
              } else {
                setImportProgress(null);
              }
            }
          }
        );
      } catch (error) {
        console.error("Failed to setup import progress listener:", error);
      }
    };

    void setup();

    return () => {
      importUnlistenRef.current?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setImportProgress is stable, only run once
  }, []);

  return { handleImportPaths, handlePlaylistDrop, handleCreatePlaylist };
};
