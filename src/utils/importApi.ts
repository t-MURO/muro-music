import { invoke } from "@tauri-apps/api/core";
import type { Track } from "../types/library";

// ============================================================================
// Types
// ============================================================================

export type ImportedTrack = {
  id: string;
  title: string;
  artist: string;
  artists?: string;
  album: string;
  track_number?: number;
  track_total?: number;
  key?: string;
  bpm?: number;
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
  last_played_at?: string;
  play_count: number;
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

// ============================================================================
// Import Operations
// ============================================================================

export const importFiles = (dbPath: string, paths: string[]) => {
  return invoke<ImportedTrack[]>("import_files", {
    paths,
    dbPath,
  });
};

// ============================================================================
// Type Conversion
// ============================================================================

/**
 * Converts snake_case ImportedTrack from Rust to camelCase Track for TypeScript.
 */
export const importedTrackToTrack = (imported: ImportedTrack): Track => ({
  id: imported.id,
  title: imported.title,
  artist: imported.artist,
  artists: imported.artists,
  album: imported.album,
  trackNumber: imported.track_number,
  trackTotal: imported.track_total,
  key: imported.key,
  bpm: imported.bpm,
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
  lastPlayedAt: imported.last_played_at,
  playCount: imported.play_count,
});
