import { useCallback } from "react";
import { appDataDir, join } from "@tauri-apps/api/path";
import { commandManager } from "../command-manager/commandManager";
import { acceptTracks, rejectTracks, unacceptTracks } from "../utils/database";
import type { Track } from "../types/library";

type UseInboxOperationsArgs = {
  dbPath: string;
  dbFileName: string;
  inboxTracks: Track[];
  selectedIds: Set<string>;
  clearSelection: () => void;
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  setInboxTracks: React.Dispatch<React.SetStateAction<Track[]>>;
};

export const useInboxOperations = ({
  dbPath,
  dbFileName,
  inboxTracks,
  selectedIds,
  clearSelection,
  setTracks,
  setInboxTracks,
}: UseInboxOperationsArgs) => {
  const handleAcceptTracks = useCallback(async () => {
    const selectedTrackIds = Array.from(selectedIds);
    if (selectedTrackIds.length === 0) {
      return;
    }

    const tracksToAccept = inboxTracks.filter((t) => selectedIds.has(t.id));

    const trimmedDbPath = dbPath.trim();
    const resolvedDbPath = trimmedDbPath
      ? trimmedDbPath
      : await join(await appDataDir(), dbFileName || "muro.db");

    clearSelection();

    const command = {
      label: `Accept ${selectedTrackIds.length} tracks`,
      do: () => {
        setInboxTracks((current) =>
          current.filter((t) => !selectedTrackIds.includes(t.id))
        );
        setTracks((current) => [...tracksToAccept, ...current]);
        acceptTracks(resolvedDbPath, selectedTrackIds).catch((error) =>
          console.error("Failed to accept tracks:", error)
        );
      },
      undo: () => {
        setTracks((current) =>
          current.filter((t) => !selectedTrackIds.includes(t.id))
        );
        setInboxTracks((current) => [...tracksToAccept, ...current]);
        unacceptTracks(resolvedDbPath, selectedTrackIds).catch((error) =>
          console.error("Failed to unaccept tracks:", error)
        );
      },
    };

    commandManager.execute(command);
  }, [
    clearSelection,
    dbFileName,
    dbPath,
    inboxTracks,
    selectedIds,
    setInboxTracks,
    setTracks,
  ]);

  const handleRejectTracks = useCallback(async () => {
    const selectedTrackIds = Array.from(selectedIds);
    if (selectedTrackIds.length === 0) {
      return;
    }

    const tracksToReject = inboxTracks.filter((t) => selectedIds.has(t.id));

    const trimmedDbPath = dbPath.trim();
    const resolvedDbPath = trimmedDbPath
      ? trimmedDbPath
      : await join(await appDataDir(), dbFileName || "muro.db");

    clearSelection();

    const command = {
      label: `Reject ${selectedTrackIds.length} tracks`,
      do: () => {
        setInboxTracks((current) =>
          current.filter((t) => !selectedTrackIds.includes(t.id))
        );
        rejectTracks(resolvedDbPath, selectedTrackIds).catch((error) =>
          console.error("Failed to reject tracks:", error)
        );
      },
      undo: () => {
        // Note: DB deletion is permanent, this only restores frontend state
        setInboxTracks((current) => [...tracksToReject, ...current]);
      },
    };

    commandManager.execute(command);
  }, [clearSelection, dbFileName, dbPath, inboxTracks, selectedIds, setInboxTracks]);

  return {
    handleAcceptTracks,
    handleRejectTracks,
  };
};
