import { useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import type { Track } from "../types/library";
import { usePlaybackStore, trackToCurrentTrack } from "../stores";
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

// Re-export CurrentTrack from store for backwards compatibility
export type { CurrentTrack } from "../stores";

export type AudioPlaybackState = {
  isPlaying: boolean;
  currentPosition: number;
  duration: number;
  volume: number;
  currentTrack: ReturnType<typeof usePlaybackStore.getState>["currentTrack"];
};

type UseAudioPlaybackOptions = {
  onTrackEnd?: () => void;
  onMediaControl?: (action: string) => void;
  seekMode?: "fast" | "accurate";
};

export const useAudioPlayback = (options: UseAudioPlaybackOptions = {}) => {
  const { onTrackEnd, onMediaControl, seekMode } = options;

  // Get state and actions from store
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const currentPosition = usePlaybackStore((s) => s.currentPosition);
  const duration = usePlaybackStore((s) => s.duration);
  const volume = usePlaybackStore((s) => s.volume);

  const setIsPlaying = usePlaybackStore((s) => s.setIsPlaying);
  const setCurrentTrack = usePlaybackStore((s) => s.setCurrentTrack);
  const setCurrentPosition = usePlaybackStore((s) => s.setCurrentPosition);
  const setDuration = usePlaybackStore((s) => s.setDuration);
  const setVolume = usePlaybackStore((s) => s.setVolume);

  // Use refs for callbacks to avoid effect re-runs
  const onTrackEndRef = useRef(onTrackEnd);
  const onMediaControlRef = useRef(onMediaControl);

  useEffect(() => {
    onTrackEndRef.current = onTrackEnd;
  }, [onTrackEnd]);

  useEffect(() => {
    onMediaControlRef.current = onMediaControl;
  }, [onMediaControl]);

  // Convert Rust PlaybackState to store format
  const updateFromRustState = useCallback(
    (rustState: PlaybackState) => {
      setIsPlaying(rustState.is_playing);
      setCurrentPosition(rustState.current_position);
      setDuration(rustState.duration);
      setVolume(rustState.volume);

      if (rustState.current_track) {
        setCurrentTrack({
          id: rustState.current_track.id,
          title: rustState.current_track.title,
          artist: rustState.current_track.artist,
          album: rustState.current_track.album,
          sourcePath: rustState.current_track.source_path,
          durationSeconds: rustState.duration,
          coverArtPath: rustState.current_track.cover_art_path,
          coverArtThumbPath: rustState.current_track.cover_art_thumb_path,
        });
      } else {
        setCurrentTrack(null);
      }
    },
    [setIsPlaying, setCurrentPosition, setDuration, setVolume, setCurrentTrack]
  );

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
          setCurrentPosition(event.payload);
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

  const playTrack = useCallback(
    async (track: Track) => {
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
        setIsPlaying(true);
        setCurrentPosition(0);
        setDuration(track.durationSeconds);
        setCurrentTrack(trackToCurrentTrack(track));
      } catch (error) {
        console.error("Failed to play track:", error);
      }
    },
    [setIsPlaying, setCurrentPosition, setDuration, setCurrentTrack]
  );

  const togglePlay = useCallback(async () => {
    try {
      const isNowPlaying = await playbackToggle();
      setIsPlaying(isNowPlaying);
    } catch (error) {
      console.error("Failed to toggle playback:", error);
    }
  }, [setIsPlaying]);

  const play = useCallback(async () => {
    try {
      await playbackPlay();
      setIsPlaying(true);
    } catch (error) {
      console.error("Failed to play:", error);
    }
  }, [setIsPlaying]);

  const pause = useCallback(async () => {
    try {
      await playbackPause();
      setIsPlaying(false);
    } catch (error) {
      console.error("Failed to pause:", error);
    }
  }, [setIsPlaying]);

  const seek = useCallback(
    async (positionSecs: number) => {
      try {
        await playbackSeek(positionSecs);
        setCurrentPosition(positionSecs);
      } catch (error) {
        console.error("Failed to seek:", error);
      }
    },
    [setCurrentPosition]
  );

  const handleSetVolume = useCallback(
    async (newVolume: number) => {
      try {
        const clamped = Math.max(0, Math.min(1, newVolume));
        await playbackSetVolume(clamped);
        setVolume(clamped);
      } catch (error) {
        console.error("Failed to set volume:", error);
      }
    },
    [setVolume]
  );

  return {
    isPlaying,
    currentPosition,
    duration,
    volume,
    currentTrack,
    playTrack,
    togglePlay,
    play,
    pause,
    seek,
    setVolume: handleSetVolume,
  };
};
