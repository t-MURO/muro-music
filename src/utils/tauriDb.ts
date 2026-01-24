import { invoke } from "@tauri-apps/api/core";

export const backfillSearchText = (dbPath: string) => {
  return invoke<number>("backfill_search_text", { db_path: dbPath });
};
