pub mod backfill;
pub mod import;
pub mod playback;
pub mod search;

use playback::{AudioPlayer, CurrentTrack, PlaybackState};
use rusqlite::Connection;
use serde::Serialize;
use std::path::Path;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager, State, WindowEvent};

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

// Playback commands
#[tauri::command]
fn playback_play_file(
    player: State<'_, Arc<AudioPlayer>>,
    id: String,
    title: String,
    artist: String,
    album: String,
    source_path: String,
    duration_hint: f64,
) -> Result<(), String> {
    let track = CurrentTrack {
        id,
        title,
        artist,
        album,
        source_path,
    };
    player.play_file(track, duration_hint)
}

#[tauri::command]
fn playback_toggle(player: State<'_, Arc<AudioPlayer>>) -> bool {
    player.toggle_play()
}

#[tauri::command]
fn playback_play(player: State<'_, Arc<AudioPlayer>>) {
    player.play();
}

#[tauri::command]
fn playback_pause(player: State<'_, Arc<AudioPlayer>>) {
    player.pause();
}

#[tauri::command]
fn playback_stop(player: State<'_, Arc<AudioPlayer>>) {
    player.stop();
}

#[tauri::command]
fn playback_seek(player: State<'_, Arc<AudioPlayer>>, position_secs: f64) -> Result<(), String> {
    player.seek(position_secs)
}

#[tauri::command]
fn playback_set_volume(player: State<'_, Arc<AudioPlayer>>, volume: f64) {
    player.set_volume(volume);
}

#[tauri::command]
fn playback_get_state(player: State<'_, Arc<AudioPlayer>>) -> PlaybackState {
    player.get_state()
}

#[tauri::command]
fn playback_is_finished(player: State<'_, Arc<AudioPlayer>>) -> bool {
    player.is_finished()
}

#[tauri::command]
fn get_track_source_path(db_path: String, track_id: String) -> Result<Option<String>, String> {
    if !Path::new(&db_path).exists() {
        return Ok(None);
    }

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT source_path FROM tracks WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let path: Option<String> = stmt.query_row([&track_id], |row| row.get(0)).ok();

    Ok(path)
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
    let audio_player = Arc::new(AudioPlayer::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .manage(audio_player.clone())
        .setup(move |app| {
            // Initialize audio player with app handle
            audio_player.init(app.handle().clone());

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
            clear_tracks,
            playback_play_file,
            playback_toggle,
            playback_play,
            playback_pause,
            playback_stop,
            playback_seek,
            playback_set_volume,
            playback_get_state,
            playback_is_finished,
            get_track_source_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
