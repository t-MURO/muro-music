use std::env;

fn main() {
    let mut args = env::args().skip(1);
    let Some(db_path) = args.next() else {
        eprintln!("Usage: backfill_search_text <path-to-db>");
        std::process::exit(1);
    };

    match tauri_app_lib::backfill::run_backfill(&db_path) {
        Ok(updated) => {
            println!("Backfilled search_text for {} tracks", updated);
        }
        Err(error) => {
            eprintln!("Backfill failed: {}", error);
            std::process::exit(1);
        }
    }
}
