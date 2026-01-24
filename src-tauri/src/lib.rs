pub mod backfill;
pub mod import;
pub mod search;

use rusqlite::Connection;
use serde::Serialize;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager, WindowEvent};

#[tauri::command]
fn import_files(
    app: tauri::AppHandle,
    paths: Vec<String>,
    db_path: String,
) -> Result<Vec<import::ImportedTrack>, String> {
    if paths.is_empty() {
        return Ok(Vec::new());
    }

    import::import_files_with_progress(paths, &db_path, |progress| {
        let _ = app.emit("muro://import-progress", progress);
    })
}

#[tauri::command]
fn load_tracks(db_path: String) -> Result<import::LibrarySnapshot, String> {
    import::load_tracks(&db_path)
}

#[tauri::command]
fn load_playlists(db_path: String) -> Result<import::PlaylistSnapshot, String> {
    import::load_playlists(&db_path)
}

#[tauri::command]
fn clear_tracks(db_path: String) -> Result<(), String> {
    import::clear_tracks(&db_path)
}

#[tauri::command]
fn backfill_search_text(db_path: String) -> Result<usize, String> {
    backfill::run_backfill(&db_path)
}

#[tauri::command]
fn create_playlist(db_path: String, id: String, name: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&db_path).parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let conn = Connection::open(&db_path).map_err(|error| error.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL)",
        [],
    )
    .map_err(|error| error.to_string())?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO playlists (id, name, created_at) VALUES (?1, ?2, ?3)",
        (&id, &name, timestamp),
    )
    .map_err(|error| error.to_string())?;

    Ok(())
}

#[derive(Clone, Serialize)]
struct DragDropPayload {
    kind: &'static str,
    paths: Vec<String>,
}

fn emit_drag_event(window: &tauri::WebviewWindow, kind: &'static str, paths: Vec<String>) {
    let payload = DragDropPayload { kind, paths };
    let _ = window.emit("muro://native-drag", payload);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .ok_or_else(|| "No main window found to enable drag drop.")?;
            let window_for_events = window.clone();

            window.on_window_event(move |event| {
                let WindowEvent::DragDrop(drag_event) = event else {
                    return;
                };

                match drag_event {
                    tauri::DragDropEvent::Enter { .. } => {
                        emit_drag_event(&window_for_events, "over", Vec::new());
                    }
                    tauri::DragDropEvent::Leave { .. } => {
                        emit_drag_event(&window_for_events, "leave", Vec::new());
                    }
                    tauri::DragDropEvent::Drop { paths, .. } => {
                        let string_paths = paths
                            .iter()
                            .map(|path| path.to_string_lossy().to_string())
                            .collect::<Vec<String>>();
                        emit_drag_event(&window_for_events, "drop", string_paths);
                    }
                    _ => {}
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            import_files,
            backfill_search_text,
            create_playlist,
            load_tracks,
            load_playlists,
            clear_tracks
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
