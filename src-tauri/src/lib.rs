use tauri::{Emitter, Manager};

#[tauri::command]
fn import_files(paths: Vec<String>) -> Result<usize, String> {
    println!("Import stub received {} paths", paths.len());
    Ok(paths.len())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let window_for_events = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::DragDrop(drag_event) = event {
                        println!("DragDrop event: {drag_event:?}");
                        let payload = format!("{drag_event:?}");
                        let _ = window_for_events.emit("muro://drag-drop-debug", payload);
                    }
                });
            } else {
                eprintln!("No main window found to enable drag drop.");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![import_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
