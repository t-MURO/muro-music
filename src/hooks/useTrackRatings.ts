import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLibraryStore, useSettingsStore } from "../stores";

export const useTrackRatings = () => {
  const setTracks = useLibraryStore((s) => s.setTracks);
  const dbPath = useSettingsStore((s) => s.dbPath);

  const clampRating = (value: number) =>
    Math.max(0, Math.min(5, Math.round(value * 2) / 2));

  const handleRatingChange = useCallback(
    (id: string, rating: number) => {
      const nextRating = clampRating(rating);
      setTracks((current) =>
        current.map((track) =>
          track.id === id ? { ...track, rating: nextRating } : track
        )
      );

      invoke("update_track_metadata", {
        dbPath,
        trackIds: [id],
        updates: { rating: nextRating },
      }).catch((err) => console.error("Failed to persist rating:", err));
    },
    [setTracks, dbPath]
  );

  return { handleRatingChange };
};
