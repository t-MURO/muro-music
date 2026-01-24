use crate::cover_art;
use crate::search;
use lofty::probe::Probe;
use rusqlite::Connection;
use serde_json::Value;
use std::path::Path;

#[derive(Debug)]
struct TrackSearchRow {
    id: i64,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    album_artist: Option<String>,
    genres: Vec<String>,
    comments: Vec<String>,
    label: Option<String>,
    filename: Option<String>,
    year: Option<i32>,
    track_number: Option<i32>,
    disc_number: Option<i32>,
}

pub fn run_backfill(db_path: &str) -> Result<usize, String> {
    let mut conn = Connection::open(db_path).map_err(|error| error.to_string())?;
    let mut pending = Vec::new();

    {
        let mut stmt = conn
            .prepare(
                "SELECT id, title, artist, album, album_artist, genre_json, comment_json, label, filename, year, track_number, disc_number FROM tracks WHERE search_text IS NULL OR search_text = ''",
            )
            .map_err(|error| error.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(TrackSearchRow {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    artist: row.get(2)?,
                    album: row.get(3)?,
                    album_artist: row.get(4)?,
                    genres: parse_json_array(row.get(5)?),
                    comments: parse_json_array(row.get(6)?),
                    label: row.get(7)?,
                    filename: row.get(8)?,
                    year: row.get(9)?,
                    track_number: row.get(10)?,
                    disc_number: row.get(11)?,
                })
            })
            .map_err(|error| error.to_string())?;

        for row in rows {
            pending.push(row.map_err(|error| error.to_string())?);
        }
    }

    let tx = conn.transaction().map_err(|error| error.to_string())?;
    let mut updated = 0;

    for row in pending {
        let genre_refs: Vec<&str> = row.genres.iter().map(|value| value.as_str()).collect();
        let comment_refs: Vec<&str> = row.comments.iter().map(|value| value.as_str()).collect();

        let search_text = search::normalize_track_search_text(search::TrackSearchParts {
            title: row.title.as_deref(),
            artist: row.artist.as_deref(),
            album: row.album.as_deref(),
            album_artist: row.album_artist.as_deref(),
            genres: if genre_refs.is_empty() {
                None
            } else {
                Some(genre_refs.as_slice())
            },
            comments: if comment_refs.is_empty() {
                None
            } else {
                Some(comment_refs.as_slice())
            },
            label: row.label.as_deref(),
            filename: row.filename.as_deref(),
            year: row.year,
            track_number: row.track_number,
            disc_number: row.disc_number,
        });

        if search_text.is_empty() {
            continue;
        }

        tx.execute(
            "UPDATE tracks SET search_text = ?1 WHERE id = ?2",
            (&search_text, row.id),
        )
        .map_err(|error| error.to_string())?;
        updated += 1;
    }

    tx.commit().map_err(|error| error.to_string())?;
    Ok(updated)
}

fn parse_json_array(raw: Option<String>) -> Vec<String> {
    let Some(text) = raw else {
        return Vec::new();
    };

    match serde_json::from_str::<Value>(&text) {
        Ok(Value::Array(values)) => values
            .into_iter()
            .filter_map(|value| value.as_str().map(|item| item.to_string()))
            .collect(),
        Ok(Value::String(value)) => vec![value],
        _ => vec![text],
    }
}

/// Backfill cover art for tracks that don't have it cached yet
pub fn run_cover_art_backfill(db_path: &str, cache_dir: &Path) -> Result<usize, String> {
    // Ensure cache directory exists
    std::fs::create_dir_all(cache_dir).map_err(|e| e.to_string())?;

    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Find tracks without cover art but with source path
    let mut pending: Vec<(String, String)> = Vec::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT id, source_path FROM tracks 
                 WHERE source_path IS NOT NULL 
                 AND source_path != '' 
                 AND (cover_art_path IS NULL OR cover_art_path = '')",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                let id: String = row.get(0)?;
                let source_path: String = row.get(1)?;
                Ok((id, source_path))
            })
            .map_err(|e| e.to_string())?;

        for row in rows {
            pending.push(row.map_err(|e| e.to_string())?);
        }
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let mut updated = 0;

    for (id, source_path) in pending {
        let path = Path::new(&source_path);
        if !path.exists() {
            continue;
        }

        // Try to read the file and extract cover art
        let tagged = match Probe::open(path).and_then(|p| p.read()) {
            Ok(t) => t,
            Err(_) => continue,
        };

        if let Some(cached) = cover_art::process_cover_art(&tagged, cache_dir) {
            tx.execute(
                "UPDATE tracks SET cover_art_path = ?1, cover_art_thumb_path = ?2 WHERE id = ?3",
                (&cached.full_path, &cached.thumb_path, &id),
            )
            .map_err(|e| e.to_string())?;
            updated += 1;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(updated)
}
