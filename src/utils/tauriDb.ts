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
