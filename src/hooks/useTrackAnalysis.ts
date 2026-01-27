import { useCallback, useState } from "react";
import type { Track } from "../types/library";

type UseTrackAnalysisArgs = {
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  setInboxTracks: React.Dispatch<React.SetStateAction<Track[]>>;
};

export const useTrackAnalysis = ({
  setTracks,
  setInboxTracks,
}: UseTrackAnalysisArgs) => {
  const [analysisTrackIds, setAnalysisTrackIds] = useState<string[]>([]);

  const openAnalysisModal = useCallback((trackIds: string[]) => {
    setAnalysisTrackIds(trackIds);
  }, []);

  const closeAnalysisModal = useCallback(() => {
    setAnalysisTrackIds([]);
  }, []);

  const handleAnalysisComplete = useCallback(
    (results: Map<string, { bpm: number; camelot: string }>) => {
      const updateTrackList = (trackList: Track[]) =>
        trackList.map((track) => {
          const result = results.get(track.id);
          if (result) {
            return {
              ...track,
              bpm: result.bpm > 0 ? result.bpm : track.bpm,
              key: result.camelot !== "?" ? result.camelot : track.key,
            };
          }
          return track;
        });

      setTracks(updateTrackList);
      setInboxTracks(updateTrackList);
    },
    [setTracks, setInboxTracks]
  );

  return {
    analysisTrackIds,
    isAnalysisModalOpen: analysisTrackIds.length > 0,
    openAnalysisModal,
    closeAnalysisModal,
    handleAnalysisComplete,
  };
};
