import type { ColumnConfig, Track, Playlist } from "../types/library";

export const themes = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "compact-light", label: "Compact Light" },
  { id: "compact-dark", label: "Compact Dark" },
  { id: "terminal", label: "Terminal" },
  { id: "compact-terminal", label: "Compact Terminal" },
];

export const initialPlaylists: Playlist[] = [
  { id: "playlist-1", name: "Favorites", trackIds: [] },
  { id: "playlist-2", name: "Synthwave Vibes", trackIds: [] },
  { id: "playlist-3", name: "Coding Sessions", trackIds: [] },
  { id: "playlist-4", name: "Chill Mix", trackIds: [] },
  { id: "playlist-5", name: "High Energy", trackIds: [] },
];

export const baseColumns: ColumnConfig[] = [
  { key: "title", labelKey: "columns.title", visible: true, width: 240 },
  { key: "artist", labelKey: "columns.artist", visible: true, width: 180 },
  { key: "album", labelKey: "columns.album", visible: true, width: 200 },
  { key: "duration", labelKey: "columns.duration", visible: true, width: 120 },
  { key: "bitrate", labelKey: "columns.bitrate", visible: true, width: 120 },
  { key: "rating", labelKey: "columns.rating", visible: true, width: 110 },
];

export const initialTracks: Track[] = [];

export const initialInboxTracks: Track[] = [];
