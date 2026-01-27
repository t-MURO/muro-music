import { invoke } from "@tauri-apps/api/core";

export const backfillSearchText = (dbPath: string) => {
  return invoke<number>("backfill_search_text", { dbPath });
};

export const backfillCoverArt = (dbPath: string) => {
  return invoke<number>("backfill_cover_art", { dbPath });
};

export const createPlaylist = (dbPath: string, id: string, name: string) => {
  return invoke<void>("create_playlist", {
    dbPath,
    id,
    name,
  });
};

export const deletePlaylist = (dbPath: string, playlistId: string) => {
  return invoke<void>("delete_playlist", {
    dbPath,
    playlistId,
  });
};

export const addTracksToPlaylist = (dbPath: string, playlistId: string, trackIds: string[]) => {
  return invoke<void>("add_tracks_to_playlist", {
    dbPath,
    playlistId,
    trackIds,
  });
};

export const removeLastTracksFromPlaylist = (dbPath: string, playlistId: string, count: number) => {
  return invoke<void>("remove_last_tracks_from_playlist", {
    dbPath,
    playlistId,
    count,
  });
};

export type ImportedTrack = {
  id: string;
  title: string;
  artist: string;
  artists?: string;
  album: string;
  track_number?: number;
  track_total?: number;
  key?: string;
  year?: number;
  date?: string;
  date_added?: string;
  date_modified?: string;
  duration: string;
  duration_seconds: number;
  bitrate: string;
  rating: number;
  source_path: string;
  cover_art_path?: string;
  cover_art_thumb_path?: string;
};

// Convert snake_case ImportedTrack from Rust to camelCase Track for TypeScript
export const importedTrackToTrack = (imported: ImportedTrack) => ({
  id: imported.id,
  title: imported.title,
  artist: imported.artist,
  artists: imported.artists,
  album: imported.album,
  trackNumber: imported.track_number,
  trackTotal: imported.track_total,
  key: imported.key,
  year: imported.year,
  date: imported.date,
  dateAdded: imported.date_added,
  dateModified: imported.date_modified,
  duration: imported.duration,
  durationSeconds: imported.duration_seconds,
  bitrate: imported.bitrate,
  rating: imported.rating,
  sourcePath: imported.source_path,
  coverArtPath: imported.cover_art_path,
  coverArtThumbPath: imported.cover_art_thumb_path,
});

export type PlaybackState = {
  is_playing: boolean;
  current_position: number;
  duration: number;
  volume: number;
  current_track: {
    id: string;
    title: string;
    artist: string;
    album: string;
    source_path: string;
    cover_art_path?: string;
    cover_art_thumb_path?: string;
  } | null;
};

export const playbackPlayFile = (
  id: string,
  title: string,
  artist: string,
  album: string,
  sourcePath: string,
  durationHint: number,
  coverArtPath?: string,
  coverArtThumbPath?: string
) => {
  return invoke<void>("playback_play_file", {
    id,
    title,
    artist,
    album,
    sourcePath,
    durationHint,
    coverArtPath,
    coverArtThumbPath,
  });
};

export const playbackToggle = () => {
  return invoke<boolean>("playback_toggle");
};

export const playbackPlay = () => {
  return invoke<void>("playback_play");
};

export const playbackPause = () => {
  return invoke<void>("playback_pause");
};

export const playbackStop = () => {
  return invoke<void>("playback_stop");
};

export const playbackSeek = (positionSecs: number) => {
  return invoke<void>("playback_seek", { positionSecs });
};

export const playbackSetVolume = (volume: number) => {
  return invoke<void>("playback_set_volume", { volume });
};

export const playbackSetSeekMode = (mode: "fast" | "accurate") => {
  return invoke<void>("playback_set_seek_mode", { mode });
};

export const playbackGetState = () => {
  return invoke<PlaybackState>("playback_get_state");
};

export const playbackIsFinished = () => {
  return invoke<boolean>("playback_is_finished");
};

export type LibrarySnapshot = {
  library: ImportedTrack[];
  inbox: ImportedTrack[];
};

export type PlaylistSnapshot = {
  playlists: {
    id: string;
    name: string;
    track_ids: string[];
  }[];
};

export const importFiles = (dbPath: string, paths: string[]) => {
  return invoke<ImportedTrack[]>("import_files", {
    paths,
    dbPath,
  });
};

export const loadTracks = (dbPath: string) => {
  return invoke<LibrarySnapshot>("load_tracks", { dbPath });
};

export const loadPlaylists = (dbPath: string) => {
  return invoke<PlaylistSnapshot>("load_playlists", { dbPath });
};

export const clearTracks = (dbPath: string) => {
  return invoke<void>("clear_tracks", { dbPath });
};
