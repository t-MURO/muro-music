import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { Track } from "../types/library";
import {
  playbackGetState,
  playbackPause,
  playbackPlay,
  playbackPlayFile,
  playbackSeek,
  playbackSetSeekMode,
  playbackSetVolume,
  playbackToggle,
  type PlaybackState,
} from "../utils/playbackApi";

export type CurrentTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  sourcePath: string;
  durationSeconds: number;
  coverArtPath?: string;
  coverArtThumbPath?: string;
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
  seekMode?: "fast" | "accurate";
};

export const useAudioPlayback = (options: UseAudioPlaybackOptions = {}) => {
  const { onTrackEnd, onMediaControl, seekMode } = options;

  const [state, setState] = useState<AudioPlaybackState>({
    isPlaying: false,
    currentPosition: 0,
    duration: 0,
    volume: 0.8,
    currentTrack: null,
  });

  // Use refs for callbacks to avoid effect re-runs
  const onTrackEndRef = useRef(onTrackEnd);
  const onMediaControlRef = useRef(onMediaControl);

  useEffect(() => {
    onTrackEndRef.current = onTrackEnd;
  }, [onTrackEnd]);

  useEffect(() => {
    onMediaControlRef.current = onMediaControl;
  }, [onMediaControl]);

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
            coverArtPath: rustState.current_track.cover_art_path,
            coverArtThumbPath: rustState.current_track.cover_art_thumb_path,
          }
        : null,
    }));
  }, []);

  // Listen for playback state updates from Rust
  const listenersSetupRef = useRef(false);

  useEffect(() => {
    if (listenersSetupRef.current) {
      return;
    }
    listenersSetupRef.current = true;

    let unlistenState: (() => void) | null = null;
    let unlistenPosition: (() => void) | null = null;
    let unlistenControl: (() => void) | null = null;
    let unlistenTrackEnded: (() => void) | null = null;

    const setup = async () => {
      unlistenState = await listen<PlaybackState>(
        "muro://playback-state",
        (event) => {
          updateFromRustState(event.payload);
        }
      );

      unlistenPosition = await listen<number>(
        "muro://playback-position",
        (event) => {
          setState((prev) => ({
            ...prev,
            currentPosition: event.payload,
          }));
        }
      );

      unlistenControl = await listen<string>("muro://media-control", (event) => {
        onMediaControlRef.current?.(event.payload);
      });

      unlistenTrackEnded = await listen("muro://track-ended", () => {
        onTrackEndRef.current?.();
      });

      // Get initial state
      try {
        const initialState = await playbackGetState();
        updateFromRustState(initialState);
      } catch (error) {
        console.error("Failed to get initial playback state:", error);
      }
    };

    void setup();

    return () => {
      unlistenState?.();
      unlistenPosition?.();
      unlistenControl?.();
      unlistenTrackEnded?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once, callbacks use refs
  }, []);



  useEffect(() => {
    if (!seekMode) {
      return;
    }
    playbackSetSeekMode(seekMode).catch(console.error);
  }, [seekMode]);

  const playTrack = useCallback(async (track: Track) => {
    try {
      await playbackPlayFile(
        track.id,
        track.title,
        track.artist,
        track.album,
        track.sourcePath,
        track.durationSeconds,
        track.coverArtPath,
        track.coverArtThumbPath
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
          coverArtPath: track.coverArtPath,
          coverArtThumbPath: track.coverArtThumbPath,
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
