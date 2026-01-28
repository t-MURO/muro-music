import { create } from "zustand";
import type { Playlist, Track } from "../types/library";

type LibraryState = {
  tracks: Track[];
  inboxTracks: Track[];
  playlists: Playlist[];
};

type LibraryActions = {
  // Tracks
  setTracks: (tracks: Track[] | ((prev: Track[]) => Track[])) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;

  // Inbox
  setInboxTracks: (tracks: Track[] | ((prev: Track[]) => Track[])) => void;
  moveToLibrary: (trackIds: string[]) => void;
  moveToInbox: (trackIds: string[]) => void;

  // Playlists
  setPlaylists: (playlists: Playlist[] | ((prev: Playlist[]) => Playlist[])) => void;
  addPlaylist: (playlist: Playlist) => void;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;
  addTracksToPlaylist: (playlistId: string, trackIds: string[]) => void;
  removeTracksFromPlaylist: (playlistId: string, count: number) => void;
};

export type LibraryStore = LibraryState & LibraryActions;

export const useLibraryStore = create<LibraryStore>((set) => ({
  // State
  tracks: [],
  inboxTracks: [],
  playlists: [],

  // Track Actions
  setTracks: (tracks) =>
    set((state) => ({
      tracks: typeof tracks === "function" ? tracks(state.tracks) : tracks,
    })),

  updateTrack: (id, updates) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      inboxTracks: state.inboxTracks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  // Inbox Actions
  setInboxTracks: (tracks) =>
    set((state) => ({
      inboxTracks:
        typeof tracks === "function" ? tracks(state.inboxTracks) : tracks,
    })),

  moveToLibrary: (trackIds) => {
    const idSet = new Set(trackIds);
    set((state) => {
      const tracksToMove = state.inboxTracks.filter((t) => idSet.has(t.id));
      return {
        inboxTracks: state.inboxTracks.filter((t) => !idSet.has(t.id)),
        tracks: [...tracksToMove, ...state.tracks],
      };
    });
  },

  moveToInbox: (trackIds) => {
    const idSet = new Set(trackIds);
    set((state) => {
      const tracksToMove = state.tracks.filter((t) => idSet.has(t.id));
      return {
        tracks: state.tracks.filter((t) => !idSet.has(t.id)),
        inboxTracks: [...tracksToMove, ...state.inboxTracks],
      };
    });
  },

  // Playlist Actions
  setPlaylists: (playlists) =>
    set((state) => ({
      playlists:
        typeof playlists === "function" ? playlists(state.playlists) : playlists,
    })),

  addPlaylist: (playlist) =>
    set((state) => ({ playlists: [...state.playlists, playlist] })),

  updatePlaylist: (id, updates) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  deletePlaylist: (id) =>
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id),
    })),

  addTracksToPlaylist: (playlistId, trackIds) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, trackIds: [...p.trackIds, ...trackIds] }
          : p
      ),
    })),

  removeTracksFromPlaylist: (playlistId, count) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, trackIds: p.trackIds.slice(0, -count) }
          : p
      ),
    })),
}));

// Selectors
export const selectAllTracks = (state: LibraryStore) => [
  ...state.tracks,
  ...state.inboxTracks,
];

export const selectPlaylistTracks = (state: LibraryStore, playlistId: string) => {
  const playlist = state.playlists.find((p) => p.id === playlistId);
  if (!playlist) return [];
  const allTracks = [...state.tracks, ...state.inboxTracks];
  return playlist.trackIds
    .map((id) => allTracks.find((t) => t.id === id))
    .filter((t): t is Track => t !== undefined);
};
