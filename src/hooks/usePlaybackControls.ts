import { useCallback, useEffect, useRef } from "react";
import type { Track } from "../types/library";
import type { CurrentTrack } from "./useAudioPlayback";

export type RepeatMode = "off" | "all" | "one";

type UsePlaybackControlsArgs = {
  allTracks: Track[];
  currentTrack: CurrentTrack | null;
  currentPosition: number;
  queue: string[];
  setQueue: React.Dispatch<React.SetStateAction<string[]>>;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  playTrack: (track: Track) => void;
  seek: (positionSecs: number) => void;
};

/**
 * Determines the next track to play based on queue, shuffle, and repeat settings.
 * Returns the next track and updated queue (with first item removed if queue was used).
 *
 * @param respectRepeatOne - If true, repeat "one" mode will return the current track.
 *                           Set to true for auto-advance (track end), false for manual skip.
 */
export const getNextPlayableTrack = (
  tracks: Track[],
  currentQueue: string[],
  currentTrackId: string | null,
  repeat: RepeatMode,
  shuffle: boolean,
  respectRepeatOne: boolean
): { nextTrack: Track | null; nextQueue: string[] } => {
  // If there's a track in the queue, use it
  if (currentQueue.length > 0) {
    const nextTrackId = currentQueue[0];
    const nextTrack = tracks.find((t) => t.id === nextTrackId);
    if (nextTrack) {
      return { nextTrack, nextQueue: currentQueue.slice(1) };
    }
  }

  // No queue - fall back to normal progression
  if (tracks.length === 0) {
    return { nextTrack: null, nextQueue: currentQueue };
  }

  const currentIndex = currentTrackId
    ? tracks.findIndex((t) => t.id === currentTrackId)
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
};

export const usePlaybackControls = ({
  allTracks,
  currentTrack,
  currentPosition,
  queue,
  setQueue,
  shuffleEnabled,
  repeatMode,
  playTrack,
  seek,
}: UsePlaybackControlsArgs) => {
  // Refs for track-end handler to avoid stale closures
  const allTracksRef = useRef(allTracks);
  const repeatModeRef = useRef(repeatMode);
  const shuffleEnabledRef = useRef(shuffleEnabled);
  const currentTrackIdRef = useRef<string | null>(null);
  const playTrackRef = useRef<((track: Track) => void) | null>(null);
  const queueRef = useRef(queue);
  const setQueueRef = useRef(setQueue);

  // Keep refs in sync
  useEffect(() => {
    allTracksRef.current = allTracks;
  }, [allTracks]);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);
  useEffect(() => {
    shuffleEnabledRef.current = shuffleEnabled;
  }, [shuffleEnabled]);
  useEffect(() => {
    currentTrackIdRef.current = currentTrack?.id ?? null;
  }, [currentTrack]);
  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    setQueueRef.current = setQueue;
  }, [setQueue]);

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
      tracks,
      currentQueue,
      trackId,
      repeat,
      shuffle,
      true
    );

    if (nextTrack) {
      if (nextQueue !== currentQueue) {
        updateQueue(nextQueue);
      }
      play(nextTrack);
    }
  }, []);

  const handleSkipPrevious = useCallback(() => {
    if (currentPosition > 3) {
      seek(0);
      return;
    }
    const currentIndex = currentTrack
      ? allTracks.findIndex((t) => t.id === currentTrack.id)
      : -1;
    if (currentIndex > 0) {
      playTrack(allTracks[currentIndex - 1]);
    }
  }, [currentPosition, currentTrack, allTracks, seek, playTrack]);

  const handleSkipNext = useCallback(() => {
    const { nextTrack, nextQueue } = getNextPlayableTrack(
      allTracks,
      queue,
      currentTrack?.id ?? null,
      repeatMode,
      shuffleEnabled,
      false
    );

    if (nextTrack) {
      if (nextQueue !== queue) {
        setQueue(nextQueue);
      }
      playTrack(nextTrack);
    }
  }, [
    allTracks,
    queue,
    currentTrack,
    repeatMode,
    shuffleEnabled,
    playTrack,
    setQueue,
  ]);

  const handlePlayTrack = useCallback(
    (trackId: string) => {
      const track = allTracks.find((t) => t.id === trackId);
      if (track) {
        playTrack(track);
      }
    },
    [allTracks, playTrack]
  );

  return {
    handleTrackEnd,
    handleSkipPrevious,
    handleSkipNext,
    handlePlayTrack,
  };
};
