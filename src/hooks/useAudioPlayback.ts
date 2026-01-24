import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { Track } from "../types/library";
import {
  playbackGetState,
  playbackIsFinished,
  playbackPause,
  playbackPlay,
  playbackPlayFile,
  playbackSeek,
  playbackSetVolume,
  playbackToggle,
  type PlaybackState,
} from "../utils/tauriDb";

export type CurrentTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  sourcePath: string;
  durationSeconds: number;
};

export type AudioPlaybackState = {
  isPlaying: boolean;
  currentPosition: number;
  duration: number;
  volume: number;
  currentTrack: CurrentTrack | null;
};

type UseAudioPlaybackOptions = {
  onTrackEnd?: () => void;
  onMediaControl?: (action: string) => void;
};

export const useAudioPlayback = (options: UseAudioPlaybackOptions = {}) => {
  const { onTrackEnd, onMediaControl } = options;

  const [state, setState] = useState<AudioPlaybackState>({
    isPlaying: false,
    currentPosition: 0,
    duration: 0,
    volume: 0.8,
    currentTrack: null,
  });

  // Convert Rust PlaybackState to our state format
  const updateFromRustState = useCallback((rustState: PlaybackState) => {
    setState((prev) => ({
      ...prev,
      isPlaying: rustState.is_playing,
      currentPosition: rustState.current_position,
      duration: rustState.duration,
      volume: rustState.volume,
      currentTrack: rustState.current_track
        ? {
            id: rustState.current_track.id,
            title: rustState.current_track.title,
            artist: rustState.current_track.artist,
            album: rustState.current_track.album,
            sourcePath: rustState.current_track.source_path,
            durationSeconds: rustState.duration,
          }
        : null,
    }));
  }, []);

  // Listen for playback state updates from Rust
  useEffect(() => {
    const unlistenState = listen<PlaybackState>(
      "muro://playback-state",
      (event) => {
        updateFromRustState(event.payload);
      }
    );

    // Listen for position updates (more frequent, just position number)
    const unlistenPosition = listen<number>(
      "muro://playback-position",
      (event) => {
        setState((prev) => ({
          ...prev,
          currentPosition: event.payload,
        }));
      }
    );

    const unlistenControl = listen<string>("muro://media-control", (event) => {
      onMediaControl?.(event.payload);
    });

    const unlistenTrackEnded = listen("muro://track-ended", () => {
      onTrackEnd?.();
    });

    // Get initial state
    playbackGetState().then(updateFromRustState).catch(console.error);

    return () => {
      unlistenState.then((fn) => fn());
      unlistenPosition.then((fn) => fn());
      unlistenControl.then((fn) => fn());
      unlistenTrackEnded.then((fn) => fn());
    };
  }, [updateFromRustState, onMediaControl, onTrackEnd]);

  // Check for track end periodically as backup
  useEffect(() => {
    if (!state.isPlaying || !state.currentTrack) return;

    const checkInterval = setInterval(async () => {
      try {
        const finished = await playbackIsFinished();
        if (finished) {
          setState((prev) => ({ ...prev, isPlaying: false }));
          onTrackEnd?.();
        }
      } catch {
        // Ignore errors
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [state.isPlaying, state.currentTrack, onTrackEnd]);

  const playTrack = useCallback(async (track: Track) => {
    try {
      await playbackPlayFile(
        track.id,
        track.title,
        track.artist,
        track.album,
        track.sourcePath,
        track.durationSeconds
      );
      setState((prev) => ({
        ...prev,
        isPlaying: true,
        currentPosition: 0,
        duration: track.durationSeconds,
        currentTrack: {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          sourcePath: track.sourcePath,
          durationSeconds: track.durationSeconds,
        },
      }));
    } catch (error) {
      console.error("Failed to play track:", error);
    }
  }, []);

  const togglePlay = useCallback(async () => {
    try {
      const isNowPlaying = await playbackToggle();
      setState((prev) => ({ ...prev, isPlaying: isNowPlaying }));
    } catch (error) {
      console.error("Failed to toggle playback:", error);
    }
  }, []);

  const play = useCallback(async () => {
    try {
      await playbackPlay();
      setState((prev) => ({ ...prev, isPlaying: true }));
    } catch (error) {
      console.error("Failed to play:", error);
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      await playbackPause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    } catch (error) {
      console.error("Failed to pause:", error);
    }
  }, []);

  const seek = useCallback(async (positionSecs: number) => {
    try {
      await playbackSeek(positionSecs);
      setState((prev) => ({ ...prev, currentPosition: positionSecs }));
    } catch (error) {
      console.error("Failed to seek:", error);
    }
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    try {
      const clamped = Math.max(0, Math.min(1, volume));
      await playbackSetVolume(clamped);
      setState((prev) => ({ ...prev, volume: clamped }));
    } catch (error) {
      console.error("Failed to set volume:", error);
    }
  }, []);

  return {
    ...state,
    playTrack,
    togglePlay,
    play,
    pause,
    seek,
    setVolume,
  };
};
