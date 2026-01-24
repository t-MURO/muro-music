import type { MessageKey } from "../i18n";

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSeconds: number;
  bitrate: string;
  rating: number;
  sourcePath: string;
  coverArt?: string;
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
};

export type ColumnKey =
  | "title"
  | "artist"
  | "album"
  | "duration"
  | "bitrate"
  | "rating";

export type ColumnConfig = {
  key: ColumnKey;
  labelKey: MessageKey;
  visible: boolean;
  width: number;
};
