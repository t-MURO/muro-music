import { invoke } from "@tauri-apps/api/core";

export const backfillSearchText = (dbPath: string) => {
  return invoke<number>("backfill_search_text", { db_path: dbPath });
};

export const createPlaylist = (dbPath: string, id: string, name: string) => {
  return invoke<void>("create_playlist", {
    dbPath,
    id,
    name,
  });
};

export type ImportedTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  bitrate: string;
  rating: number;
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
    dbPath,
    paths,
  });
};

export const loadTracks = (dbPath: string) => {
  return invoke<LibrarySnapshot>("load_tracks", { dbPath });
};

export const loadPlaylists = (dbPath: string) => {
  return invoke<PlaylistSnapshot>("load_playlists", { dbPath });
};
