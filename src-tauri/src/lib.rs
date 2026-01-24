pub mod backfill;
pub mod search;

use serde::Serialize;
use std::path::Path;
use tauri::{Emitter, Manager, WindowEvent};

#[tauri::command]
fn import_files(paths: Vec<String>) -> Result<usize, String> {
    for path in &paths {
        let file_name = Path::new(path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(path.as_str());
        let stem = Path::new(path)
            .file_stem()
            .and_then(|name| name.to_str())
            .unwrap_or(file_name);
        let title = search::strip_leading_track_number(stem);
        let search_text = search::normalize_track_search_text(search::TrackSearchParts {
            title: Some(title),
            filename: Some(file_name),
            ..Default::default()
        });
        println!("Import stub prepared search text: {}", search_text);
    }
    println!("Import stub received {} paths", paths.len());
    Ok(paths.len())
}

#[tauri::command]
fn backfill_search_text(db_path: String) -> Result<usize, String> {
    backfill::run_backfill(&db_path)
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
        .invoke_handler(tauri::generate_handler![import_files, backfill_search_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
