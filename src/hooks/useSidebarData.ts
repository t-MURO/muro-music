import { useMemo } from "react";
import type { Playlist } from "../types/library";
import type { LibraryView } from "./useLibraryView";

type UseSidebarDataArgs = {
  view: LibraryView;
  tracksCount: number;
  inboxCount: number;
  playlists: Playlist[];
  draggingPlaylistId: string | null;
  onViewChange: (view: LibraryView) => void;
  onPlaylistDrop: (event: React.DragEvent<HTMLButtonElement>, id: string) => void;
  onPlaylistDragEnter: (id: string) => void;
  onPlaylistDragLeave: (id: string) => void;
  onPlaylistDragOver: (id: string) => void;
  onCreatePlaylist: () => void;
};

export const useSidebarData = ({
  view,
  tracksCount,
  inboxCount,
  playlists,
  draggingPlaylistId,
  onViewChange,
  onPlaylistDrop,
  onPlaylistDragEnter,
  onPlaylistDragLeave,
  onPlaylistDragOver,
  onCreatePlaylist,
}: UseSidebarDataArgs) => {
  return useMemo(
    () => ({
      currentView: view,
      trackCount: tracksCount,
      inboxCount,
      playlists,
      draggingPlaylistId,
      onViewChange,
      onPlaylistDrop,
      onPlaylistDragEnter,
      onPlaylistDragLeave,
      onPlaylistDragOver,
      onCreatePlaylist,
    }),
    [
      draggingPlaylistId,
      inboxCount,
      onPlaylistDragEnter,
      onPlaylistDragLeave,
      onPlaylistDragOver,
      onPlaylistDrop,
      onCreatePlaylist,
      onViewChange,
      playlists,
      tracksCount,
      view,
    ]
  );
};
