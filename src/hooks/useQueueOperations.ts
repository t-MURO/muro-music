import { useCallback, useMemo, useState } from "react";
import type { Track } from "../types/library";

type UseQueueOperationsArgs = {
  allTracks: Track[];
};

export const useQueueOperations = ({ allTracks }: UseQueueOperationsArgs) => {
  const [queue, setQueue] = useState<string[]>([]);

  const addToQueue = useCallback((trackIds: string[]) => {
    setQueue((q) => [...q, ...trackIds]);
  }, []);

  const playNext = useCallback((trackIds: string[]) => {
    setQueue((q) => [...trackIds, ...q]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((q) => q.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((q) => {
      const newQueue = [...q];
      const [removed] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, removed);
      return newQueue;
    });
  }, []);

  const queueTracks = useMemo(() => {
    return queue
      .map((id) => allTracks.find((t) => t.id === id))
      .filter((t): t is Track => t !== undefined);
  }, [queue, allTracks]);

  return {
    queue,
    setQueue,
    queueTracks,
    addToQueue,
    playNext,
    removeFromQueue,
    clearQueue,
    reorderQueue,
  };
};
