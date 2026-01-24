import type { ColumnConfig, Track } from "../types/library";

export const themes = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "graphite", label: "Graphite" },
  { id: "sage", label: "Sage" },
  { id: "ember", label: "Ember" },
  { id: "midnight", label: "Midnight" },
  { id: "ocean", label: "Ocean" },
  { id: "terminal", label: "Terminal" },
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
