import { useCallback } from "react";
import type { Track } from "../types/library";

type UseTrackRatingsArgs = {
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
};

export const useTrackRatings = ({ setTracks }: UseTrackRatingsArgs) => {
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
    },
    [setTracks]
  );

  return { handleRatingChange };
};
