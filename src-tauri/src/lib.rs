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
        .invoke_handler(tauri::generate_handler![import_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
