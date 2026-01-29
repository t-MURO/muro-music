use crate::cover_art;
use crate::search;
use chrono::{DateTime, Utc};
use lofty::file::FileType;
use lofty::file::TaggedFile;
use lofty::id3::v2::Popularimeter;
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::tag::{ItemValue, Tag, TagItem, TagType};
use rusqlite::{params, Connection};
use serde::Serialize;
use serde_json::json;
use std::collections::BTreeMap;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

const AUDIO_EXTENSIONS: [&str; 8] = ["mp3", "flac", "wav", "m4a", "aac", "ogg", "aiff", "alac"];
const STATUS_STAGED: &str = "staged";
const STATUS_ACCEPTED: &str = "accepted";
const DEFAULT_DURATION: &str = "--:--";
const DEFAULT_BITRATE: &str = "--";
const UNKNOWN_TITLE: &str = "Unknown Title";
const UNKNOWN_ARTIST: &str = "Unknown Artist";
const UNKNOWN_ALBUM: &str = "Unknown Album";

#[derive(Debug, Serialize, Clone)]
pub struct ImportedTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub artists: Option<String>,
    pub album: String,
    pub track_number: Option<i32>,
    pub track_total: Option<i32>,
    pub key: Option<String>,
    pub bpm: Option<f64>,
    pub year: Option<i32>,
    pub date: Option<String>,
    pub date_added: Option<String>,
    pub date_modified: Option<String>,
    pub duration: String,
    pub duration_seconds: f64,
    pub bitrate: String,
    pub rating: f32,
    pub source_path: String,
    pub cover_art_path: Option<String>,
    pub cover_art_thumb_path: Option<String>,
    pub last_played_at: Option<String>,
    pub play_count: i32,
}

#[derive(Debug, Serialize, Clone)]
pub struct ImportProgress {
    pub imported: usize,
    pub total: usize,
}

#[derive(Debug, Serialize, Clone)]
pub struct LibrarySnapshot {
    pub library: Vec<ImportedTrack>,
    pub inbox: Vec<ImportedTrack>,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlaylistSnapshot {
    pub playlists: Vec<PlaylistRow>,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlaylistRow {
    pub id: String,
    pub name: String,
    pub track_ids: Vec<String>,
}

#[derive(Debug, Default, Clone)]
struct NormalizedMetadata {
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    album_artist: Option<String>,
    genres: Vec<String>,
    comments: Vec<String>,
    label: Option<String>,
    filename: String,
    year: Option<i32>,
    date: Option<String>,
    original_date: Option<String>,
    original_year: Option<i32>,
    track_number: Option<i32>,
    track_total: Option<i32>,
    disc_number: Option<i32>,
    disc_total: Option<i32>,
    key: Option<String>,
    bpm: Option<f64>,
    rating: Option<f32>,
    isrc: Vec<String>,
    encoder: Option<String>,
    encoder_tag: Option<String>,
    encoder_tool: Option<String>,
    raw_tags: serde_json::Value,
    musicbrainz_albumid: Option<String>,
    musicbrainz_artistid: Option<String>,
    musicbrainz_albumartistid: Option<String>,
    musicbrainz_releasegroupid: Option<String>,
    musicbrainz_trackid: Option<String>,
    musicbrainz_releasetrackid: Option<String>,
    musicbrainz_albumstatus: Option<String>,
    musicbrainz_albumtype: Option<String>,
}

pub fn import_files(
    paths: Vec<String>,
    db_path: &str,
    cache_dir: &Path,
) -> Result<Vec<ImportedTrack>, String> {
    import_files_with_progress(paths, db_path, cache_dir, |_| {})
}

pub fn import_files_with_progress<F>(
    paths: Vec<String>,
    db_path: &str,
    cache_dir: &Path,
    mut on_progress: F,
) -> Result<Vec<ImportedTrack>, String>
where
    F: FnMut(ImportProgress),
{
    let mut file_paths = Vec::new();
    for path in paths {
        collect_audio_paths(Path::new(&path), &mut file_paths)?;
    }

    if file_paths.is_empty() {
        return Ok(Vec::new());
    }

    if let Some(parent) = Path::new(db_path).parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    // Ensure cover art cache directory exists
    std::fs::create_dir_all(cache_dir).map_err(|error| error.to_string())?;

    let mut conn = Connection::open(db_path).map_err(|error| error.to_string())?;
    ensure_schema(&conn)?;

    let tx = conn.transaction().map_err(|error| error.to_string())?;
    let mut imported = Vec::new();
    let now = current_timestamp();
    let total = file_paths.len();
    let mut processed = 0;
    on_progress(ImportProgress {
        imported: processed,
        total,
    });

    for path in file_paths {
        match import_single(&tx, &path, now, cache_dir) {
            Ok(Some(track)) => imported.push(track),
            Ok(None) => {} // Duplicate, silently skipped
            Err(error) => {
                eprintln!("Import failed for {}: {}", path.display(), error);
            }
        }
        processed += 1;
        on_progress(ImportProgress {
            imported: processed,
            total,
        });
    }

    tx.commit().map_err(|error| error.to_string())?;
    Ok(imported)
}

pub fn load_tracks(db_path: &str) -> Result<LibrarySnapshot, String> {
    if !Path::new(db_path).exists() {
        return Ok(LibrarySnapshot {
            library: Vec::new(),
            inbox: Vec::new(),
        });
    }

    let conn = Connection::open(db_path).map_err(|error| error.to_string())?;
    ensure_schema(&conn)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, artist, album_artist, album, track_number, track_total,
                    key, bpm, year, date, added_at, updated_at, rating, duration_seconds,
                    bitrate_kbps, import_status, source_path, cover_art_path,
                    cover_art_thumb_path, last_played_at, play_count
             FROM tracks ORDER BY added_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let title: Option<String> = row.get(1)?;
            let artist: Option<String> = row.get(2)?;
            let album_artist: Option<String> = row.get(3)?;
            let album: Option<String> = row.get(4)?;
            let track_number: Option<i32> = row.get(5)?;
            let track_total: Option<i32> = row.get(6)?;
            let key: Option<String> = row.get(7)?;
            let bpm: Option<f64> = row.get(8)?;
            let year: Option<i32> = row.get(9)?;
            let date: Option<String> = row.get(10)?;
            let added_at: Option<i64> = row.get(11)?;
            let updated_at: Option<i64> = row.get(12)?;
            let rating: Option<f64> = row.get(13)?;
            let duration_seconds: Option<f64> = row.get(14)?;
            let bitrate_kbps: Option<i32> = row.get(15)?;
            let import_status: Option<String> = row.get(16)?;
            let source_path: Option<String> = row.get(17)?;
            let cover_art_path: Option<String> = row.get(18)?;
            let cover_art_thumb_path: Option<String> = row.get(19)?;
            let last_played_at: Option<String> = row.get(20)?;
            let play_count: Option<i32> = row.get(21)?;

            let duration = duration_seconds
                .map(|value| format_duration(value as f32))
                .unwrap_or_else(|| DEFAULT_DURATION.to_string());
            let bitrate = bitrate_kbps
                .filter(|value| *value > 0)
                .map(|value| format!("{} kbps", value))
                .unwrap_or_else(|| DEFAULT_BITRATE.to_string());

            let date_added = added_at.map(format_timestamp);
            let date_modified = updated_at.map(format_timestamp);

            Ok((
                ImportedTrack {
                    id,
                    title: title.unwrap_or_else(|| UNKNOWN_TITLE.to_string()),
                    artist: artist.unwrap_or_else(|| UNKNOWN_ARTIST.to_string()),
                    artists: album_artist,
                    album: album.unwrap_or_else(|| UNKNOWN_ALBUM.to_string()),
                    track_number,
                    track_total,
                    key,
                    bpm,
                    year,
                    date,
                    date_added,
                    date_modified,
                    duration,
                    duration_seconds: duration_seconds.unwrap_or(0.0),
                    bitrate,
                    rating: rating.unwrap_or(0.0) as f32,
                    source_path: source_path.unwrap_or_default(),
                    cover_art_path,
                    cover_art_thumb_path,
                    last_played_at,
                    play_count: play_count.unwrap_or(0),
                },
                import_status.unwrap_or_else(|| STATUS_ACCEPTED.to_string()),
            ))
        })
        .map_err(|error| error.to_string())?;

    let mut library = Vec::new();
    let mut inbox = Vec::new();

    for row in rows {
        let (track, status) = row.map_err(|error| error.to_string())?;
        if status == STATUS_STAGED {
            inbox.push(track);
        } else {
            library.push(track);
        }
    }

    Ok(LibrarySnapshot { library, inbox })
}

pub fn ensure_playlist_schema(conn: &Connection) -> Result<(), String> {
    // Enable foreign key constraints
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|error| error.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL)",
        [],
    )
    .map_err(|error| error.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS playlist_tracks (
            playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
            track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
            position INTEGER NOT NULL
        )",
        [],
    )
    .map_err(|error| error.to_string())?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS playlist_tracks_playlist_idx ON playlist_tracks (playlist_id, position)",
        [],
    )
    .map_err(|error| error.to_string())?;

    Ok(())
}

pub fn load_playlists(db_path: &str) -> Result<PlaylistSnapshot, String> {
    if !Path::new(db_path).exists() {
        return Ok(PlaylistSnapshot {
            playlists: Vec::new(),
        });
    }

    let conn = Connection::open(db_path).map_err(|error| error.to_string())?;
    ensure_playlist_schema(&conn)?;

    // Load all playlists with their track IDs in a single query using LEFT JOIN
    // This avoids the N+1 query problem
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.name, p.created_at, pt.track_id
             FROM playlists p
             LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
             ORDER BY p.created_at DESC, pt.position ASC",
        )
        .map_err(|error| error.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let name: String = row.get(1)?;
            let track_id: Option<String> = row.get(3)?;
            Ok((id, name, track_id))
        })
        .map_err(|error| error.to_string())?;

    // Group results by playlist
    let mut playlist_map: std::collections::HashMap<String, PlaylistRow> =
        std::collections::HashMap::new();
    let mut playlist_order: Vec<String> = Vec::new();

    for row in rows {
        let (id, name, track_id) = row.map_err(|error| error.to_string())?;

        let playlist = playlist_map.entry(id.clone()).or_insert_with(|| {
            playlist_order.push(id.clone());
            PlaylistRow {
                id,
                name,
                track_ids: Vec::new(),
            }
        });

        if let Some(tid) = track_id {
            playlist.track_ids.push(tid);
        }
    }

    // Maintain original order (by created_at DESC)
    let playlists = playlist_order
        .into_iter()
        .filter_map(|id| playlist_map.remove(&id))
        .collect();

    Ok(PlaylistSnapshot { playlists })
}

pub fn load_recently_played(conn: &Connection, limit: i32) -> Result<Vec<ImportedTrack>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, artist, album_artist, album, track_number, track_total,
                    key, bpm, year, date, added_at, updated_at, rating, duration_seconds,
                    bitrate_kbps, import_status, source_path, cover_art_path,
                    cover_art_thumb_path, last_played_at, play_count
             FROM tracks
             WHERE last_played_at IS NOT NULL
             ORDER BY last_played_at DESC
             LIMIT ?1",
        )
        .map_err(|error| error.to_string())?;

    let rows = stmt
        .query_map([limit], |row| {
            let id: String = row.get(0)?;
            let title: Option<String> = row.get(1)?;
            let artist: Option<String> = row.get(2)?;
            let album_artist: Option<String> = row.get(3)?;
            let album: Option<String> = row.get(4)?;
            let track_number: Option<i32> = row.get(5)?;
            let track_total: Option<i32> = row.get(6)?;
            let key: Option<String> = row.get(7)?;
            let bpm: Option<f64> = row.get(8)?;
            let year: Option<i32> = row.get(9)?;
            let date: Option<String> = row.get(10)?;
            let added_at: Option<i64> = row.get(11)?;
            let updated_at: Option<i64> = row.get(12)?;
            let rating: Option<f64> = row.get(13)?;
            let duration_seconds: Option<f64> = row.get(14)?;
            let bitrate_kbps: Option<i32> = row.get(15)?;
            let source_path: Option<String> = row.get(17)?;
            let cover_art_path: Option<String> = row.get(18)?;
            let cover_art_thumb_path: Option<String> = row.get(19)?;
            let last_played_at: Option<String> = row.get(20)?;
            let play_count: Option<i32> = row.get(21)?;

            let duration = duration_seconds
                .map(|value| format_duration(value as f32))
                .unwrap_or_else(|| DEFAULT_DURATION.to_string());
            let bitrate = bitrate_kbps
                .filter(|value| *value > 0)
                .map(|value| format!("{} kbps", value))
                .unwrap_or_else(|| DEFAULT_BITRATE.to_string());

            let date_added = added_at.map(format_timestamp);
            let date_modified = updated_at.map(format_timestamp);

            Ok(ImportedTrack {
                id,
                title: title.unwrap_or_else(|| UNKNOWN_TITLE.to_string()),
                artist: artist.unwrap_or_else(|| UNKNOWN_ARTIST.to_string()),
                artists: album_artist,
                album: album.unwrap_or_else(|| UNKNOWN_ALBUM.to_string()),
                track_number,
                track_total,
                key,
                bpm,
                year,
                date,
                date_added,
                date_modified,
                duration,
                duration_seconds: duration_seconds.unwrap_or(0.0),
                bitrate,
                rating: rating.unwrap_or(0.0) as f32,
                source_path: source_path.unwrap_or_default(),
                cover_art_path,
                cover_art_thumb_path,
                last_played_at,
                play_count: play_count.unwrap_or(0),
            })
        })
        .map_err(|error| error.to_string())?;

    let mut tracks = Vec::new();
    for row in rows {
        tracks.push(row.map_err(|error| error.to_string())?);
    }

    Ok(tracks)
}

pub fn clear_tracks(db_path: &str, cache_dir: &Path) -> Result<(), String> {
    // Clear cover art cache directory
    if cache_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(cache_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let _ = std::fs::remove_file(path);
                }
            }
        }
    }

    // Clear database
    if !Path::new(db_path).exists() {
        return Ok(());
    }

    let conn = Connection::open(db_path).map_err(|error| error.to_string())?;
    ensure_schema(&conn)?;
    conn.execute("DELETE FROM tracks", [])
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn collect_audio_paths(path: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
    if path.is_dir() {
        for entry in std::fs::read_dir(path).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            collect_audio_paths(&entry.path(), files)?;
        }
        return Ok(());
    }

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if AUDIO_EXTENSIONS.iter().any(|item| *item == extension) {
        files.push(path.to_path_buf());
    }
    Ok(())
}

fn import_single(
    conn: &Connection,
    path: &Path,
    now: i64,
    cache_dir: &Path,
) -> Result<Option<ImportedTrack>, String> {
    let tagged = Probe::open(path)
        .map_err(|error| error.to_string())?
        .read()
        .map_err(|error| error.to_string())?;
    let properties = tagged.properties();
    let metadata = normalize_metadata(&tagged, path)?;

    let title = metadata
        .title
        .clone()
        .unwrap_or_else(|| fallback_title(path));
    let artist = metadata
        .artist
        .clone()
        .unwrap_or_else(|| UNKNOWN_ARTIST.to_string());
    let album = metadata
        .album
        .clone()
        .unwrap_or_else(|| UNKNOWN_ALBUM.to_string());
    let rating = metadata.rating.unwrap_or(0.0);

    // Extract and cache cover art
    let cached_cover = cover_art::process_cover_art(&tagged, cache_dir);
    let cover_art_path = cached_cover.as_ref().map(|c| c.full_path.clone());
    let cover_art_thumb_path = cached_cover.as_ref().map(|c| c.thumb_path.clone());

    let duration_seconds = properties.duration().as_secs_f32();
    let bitrate = properties.audio_bitrate().unwrap_or(0) as i32;
    let duration_text = format_duration(duration_seconds);
    let bitrate_text = if bitrate > 0 {
        format!("{} kbps", bitrate)
    } else {
        DEFAULT_BITRATE.to_string()
    };

    let id = Uuid::new_v4().to_string();
    let genre_refs: Vec<&str> = metadata.genres.iter().map(|value| value.as_str()).collect();
    let comment_refs: Vec<&str> = metadata
        .comments
        .iter()
        .map(|value| value.as_str())
        .collect();
    let search_text = search::normalize_track_search_text(search::TrackSearchParts {
        title: Some(&title),
        artist: metadata.artist.as_deref(),
        album: metadata.album.as_deref(),
        album_artist: metadata.album_artist.as_deref(),
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
        label: metadata.label.as_deref(),
        filename: Some(&metadata.filename),
        year: metadata.year,
        track_number: metadata.track_number,
        disc_number: metadata.disc_number,
    });

    let genre_json = serde_json::to_string(&metadata.genres).unwrap_or_else(|_| "[]".to_string());
    let comment_json =
        serde_json::to_string(&metadata.comments).unwrap_or_else(|_| "[]".to_string());
    let isrc_json = serde_json::to_string(&metadata.isrc).unwrap_or_else(|_| "[]".to_string());
    let raw_tags_json =
        serde_json::to_string(&metadata.raw_tags).unwrap_or_else(|_| "{}".to_string());

    conn.execute(
        "INSERT OR IGNORE INTO tracks (
            id, title, artist, album, album_artist, genre_json, comment_json, label, filename,
            year, date, original_date, original_year, track_number, track_total, disc_number,
            disc_total, key, bpm, rating, isrc_json, encoder, encoder_tag, encoder_tool, raw_tags_json,
            musicbrainz_albumid, musicbrainz_artistid, musicbrainz_albumartistid,
            musicbrainz_releasegroupid, musicbrainz_trackid, musicbrainz_releasetrackid,
            musicbrainz_albumstatus, musicbrainz_albumtype, source_path, search_text,
            import_status, duration_seconds, bitrate_kbps, added_at, updated_at, is_missing,
            cover_art_path, cover_art_thumb_path
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
            ?10, ?11, ?12, ?13, ?14, ?15, ?16,
            ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25,
            ?26, ?27, ?28, ?29, ?30, ?31,
            ?32, ?33, ?34, ?35,
            ?36, ?37, ?38, ?39, ?40, ?41, ?42, ?43
        )",
        params![
            id,
            title,
            artist,
            album,
            metadata.album_artist,
            genre_json,
            comment_json,
            metadata.label,
            metadata.filename,
            metadata.year,
            metadata.date,
            metadata.original_date,
            metadata.original_year,
            metadata.track_number,
            metadata.track_total,
            metadata.disc_number,
            metadata.disc_total,
            metadata.key,
            metadata.bpm,
            rating,
            isrc_json,
            metadata.encoder,
            metadata.encoder_tag,
            metadata.encoder_tool,
            raw_tags_json,
            metadata.musicbrainz_albumid,
            metadata.musicbrainz_artistid,
            metadata.musicbrainz_albumartistid,
            metadata.musicbrainz_releasegroupid,
            metadata.musicbrainz_trackid,
            metadata.musicbrainz_releasetrackid,
            metadata.musicbrainz_albumstatus,
            metadata.musicbrainz_albumtype,
            path.to_string_lossy().to_string(),
            search_text,
            STATUS_STAGED,
            duration_seconds,
            bitrate,
            now,
            now,
            0,
            cover_art_path,
            cover_art_thumb_path
        ],
    )
    .map_err(|error| error.to_string())?;

    // If no rows were inserted (duplicate source_path), return None
    if conn.changes() == 0 {
        return Ok(None);
    }

    let date_added = Some(format_timestamp(now));

    Ok(Some(ImportedTrack {
        id,
        title,
        artist,
        artists: metadata.album_artist.clone(),
        album,
        track_number: metadata.track_number,
        track_total: metadata.track_total,
        key: metadata.key.clone(),
        bpm: metadata.bpm,
        year: metadata.year,
        date: metadata.date.clone(),
        date_added: date_added.clone(),
        date_modified: date_added,
        duration: duration_text,
        duration_seconds: duration_seconds as f64,
        bitrate: bitrate_text,
        rating,
        source_path: path.to_string_lossy().to_string(),
        cover_art_path,
        cover_art_thumb_path,
        last_played_at: None,
        play_count: 0,
    }))
}

fn normalize_metadata(tagged: &TaggedFile, path: &Path) -> Result<NormalizedMetadata, String> {
    let tag = tagged.primary_tag().or_else(|| tagged.first_tag());
    let filename = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_string();

    if let Some(tag) = tag {
        let mut meta = NormalizedMetadata::default();
        meta.title = tag.get_string(&ItemKey::TrackTitle).map(str::to_string);
        meta.artist = tag.get_string(&ItemKey::TrackArtist).map(str::to_string);
        meta.album = tag.get_string(&ItemKey::AlbumTitle).map(str::to_string);
        meta.album_artist = tag.get_string(&ItemKey::AlbumArtist).map(str::to_string);
        meta.label = tag
            .get_string(&ItemKey::Label)
            .or_else(|| tag.get_string(&ItemKey::Publisher))
            .map(str::to_string);
        meta.date = tag.get_string(&ItemKey::RecordingDate).map(str::to_string);
        meta.original_date = tag
            .get_string(&ItemKey::OriginalReleaseDate)
            .map(str::to_string);
        meta.original_year = tag
            .get_string(&ItemKey::OriginalReleaseDate)
            .and_then(|value| parse_year(value));
        meta.year = tag
            .get_string(&ItemKey::Year)
            .and_then(|value| value.parse::<i32>().ok())
            .or_else(|| meta.date.as_ref().and_then(|value| parse_year(value)));
        meta.key = tag
            .get_string(&ItemKey::InitialKey)
            .map(|value| value.trim().to_string());
        // BPM can be in TBPM (ID3), BPM (generic), or tempo field
        meta.bpm = tag
            .get_string(&ItemKey::Bpm)
            .and_then(|value| value.trim().parse::<f64>().ok())
            .or_else(|| {
                tag.get_string(&ItemKey::Unknown("TBPM".to_string()))
                    .and_then(|value| value.trim().parse::<f64>().ok())
            })
            .or_else(|| {
                tag.get_string(&ItemKey::Unknown("BPM".to_string()))
                    .and_then(|value| value.trim().parse::<f64>().ok())
            });
        meta.encoder_tag = tag
            .get_string(&ItemKey::EncoderSoftware)
            .map(str::to_string)
            .or_else(|| {
                tag.get_string(&ItemKey::EncoderSettings)
                    .map(str::to_string)
            });
        meta.encoder = meta.encoder_tag.clone();

        meta.genres = collect_values(tag, ItemKey::Genre, split_genres);
        meta.comments = collect_values(tag, ItemKey::Comment, split_comments);
        meta.isrc = collect_values(tag, ItemKey::Isrc, split_passthrough);

        let track_value = tag.get_string(&ItemKey::TrackNumber).unwrap_or("");
        let (track_number, track_total_from_pair) = parse_number_pair(track_value);
        meta.track_number = track_number;
        // FLAC/Vorbis uses separate TRACKTOTAL field
        meta.track_total = tag
            .get_string(&ItemKey::TrackTotal)
            .and_then(|v| v.trim().parse::<i32>().ok())
            .or(track_total_from_pair);

        let disc_value = tag.get_string(&ItemKey::DiscNumber).unwrap_or("");
        let (disc_number, disc_total_from_pair) = parse_number_pair(disc_value);
        meta.disc_number = disc_number;
        // FLAC/Vorbis uses separate DISCTOTAL field
        meta.disc_total = tag
            .get_string(&ItemKey::DiscTotal)
            .and_then(|v| v.trim().parse::<i32>().ok())
            .or(disc_total_from_pair);

        let popm_rating = parse_popm_rating(tag);
        let rating_tag = tag
            .get_string(&ItemKey::Unknown("RATING".to_string()))
            .and_then(parse_rating_value);
        let is_mp3 = tagged.file_type() == FileType::Mpeg;
        meta.rating = if is_mp3 {
            popm_rating.or(rating_tag)
        } else {
            rating_tag.or(popm_rating)
        };

        meta.musicbrainz_albumid = tag
            .get_string(&ItemKey::MusicBrainzReleaseId)
            .map(str::to_string);
        meta.musicbrainz_artistid = tag
            .get_string(&ItemKey::MusicBrainzArtistId)
            .map(str::to_string);
        meta.musicbrainz_albumartistid = tag
            .get_string(&ItemKey::MusicBrainzReleaseArtistId)
            .map(str::to_string);
        meta.musicbrainz_releasegroupid = tag
            .get_string(&ItemKey::MusicBrainzReleaseGroupId)
            .map(str::to_string);
        meta.musicbrainz_trackid = tag
            .get_string(&ItemKey::MusicBrainzRecordingId)
            .map(str::to_string);
        meta.musicbrainz_releasetrackid = tag
            .get_string(&ItemKey::MusicBrainzTrackId)
            .map(str::to_string);
        meta.musicbrainz_albumstatus = tag
            .get_string(&ItemKey::Unknown("MusicBrainz Album Status".to_string()))
            .map(str::to_string);
        meta.musicbrainz_albumtype = tag
            .get_string(&ItemKey::Unknown("MusicBrainz Album Type".to_string()))
            .map(str::to_string);

        meta.filename = filename;
        meta.raw_tags = collect_raw_tags(tagged);
        return Ok(meta);
    }

    Ok(NormalizedMetadata {
        filename,
        raw_tags: json!({}),
        ..Default::default()
    })
}

fn collect_raw_tags(tagged: &TaggedFile) -> serde_json::Value {
    let mut map = BTreeMap::new();
    for tag in tagged.tags() {
        let mut tag_map = BTreeMap::new();
        for item in tag.items() {
            let key = format!("{:?}", item.key());
            let value = item_value_to_string(item);
            tag_map
                .entry(key)
                .and_modify(|entry: &mut Vec<String>| entry.push(value.clone()))
                .or_insert_with(|| vec![value]);
        }
        map.insert(tag_type_label(tag.tag_type()), tag_map);
    }
    json!(map)
}

fn tag_type_label(tag_type: TagType) -> String {
    format!("{:?}", tag_type).to_ascii_lowercase()
}

fn item_value_to_string(item: &TagItem) -> String {
    match item.value() {
        ItemValue::Text(text) => text.to_string(),
        ItemValue::Locator(text) => text.to_string(),
        ItemValue::Binary(data) => format!("{:?}", data),
    }
}

fn collect_values(tag: &Tag, key: ItemKey, split: fn(&str) -> Vec<String>) -> Vec<String> {
    let mut values = Vec::new();
    for item in tag.items().filter(|item| item.key() == &key) {
        let value = item_value_to_string(item);
        values.extend(split(&value));
    }
    values
}

fn split_genres(value: &str) -> Vec<String> {
    value
        .split(['/', ';', ','])
        .map(|item| item.trim())
        .filter(|item| !item.is_empty())
        .map(|item| item.to_string())
        .collect()
}

fn split_comments(value: &str) -> Vec<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        Vec::new()
    } else {
        vec![trimmed.to_string()]
    }
}

fn split_passthrough(value: &str) -> Vec<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        Vec::new()
    } else {
        vec![trimmed.to_string()]
    }
}

fn parse_number_pair(value: &str) -> (Option<i32>, Option<i32>) {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return (None, None);
    }

    let mut parts = trimmed.split('/');
    let first = parts
        .next()
        .and_then(|item| item.trim().parse::<i32>().ok());
    let second = parts
        .next()
        .and_then(|item| item.trim().parse::<i32>().ok());
    (first, second)
}

fn parse_year(value: &str) -> Option<i32> {
    value
        .chars()
        .filter(|ch| ch.is_ascii_digit())
        .collect::<String>()
        .get(0..4)
        .and_then(|slice| slice.parse::<i32>().ok())
}

fn parse_rating_value(value: &str) -> Option<f32> {
    let parsed = value.trim().parse::<f32>().ok()?;
    if parsed <= 5.0 {
        return Some(parsed);
    }
    Some((parsed / 100.0 * 5.0 * 2.0).round() / 2.0)
}

fn parse_popm_rating(tag: &Tag) -> Option<f32> {
    let mut best: Option<u8> = None;
    for item in tag
        .items()
        .filter(|item| item.key() == &ItemKey::Popularimeter)
    {
        let ItemValue::Binary(data) = item.value() else {
            continue;
        };
        let mut cursor = Cursor::new(data);
        if let Ok(popm) = Popularimeter::parse(&mut cursor) {
            if popm.rating > 0 {
                best = Some(best.map_or(popm.rating, |current| current.max(popm.rating)));
            }
        }
    }

    best.map(|rating| ((rating as f32 / 255.0) * 10.0).round() / 2.0)
}

fn format_duration(seconds: f32) -> String {
    if seconds <= 0.0 {
        return DEFAULT_DURATION.to_string();
    }
    let total = seconds.round() as i64;
    let minutes = total / 60;
    let secs = total % 60;
    format!("{}:{:02}", minutes, secs)
}

fn format_timestamp(timestamp: i64) -> String {
    DateTime::<Utc>::from_timestamp(timestamp, 0)
        .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
        .unwrap_or_default()
}

fn fallback_title(path: &Path) -> String {
    path.file_stem()
        .and_then(|value| value.to_str())
        .map(search::strip_leading_track_number)
        .unwrap_or(UNKNOWN_TITLE)
        .to_string()
}

fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs() as i64)
        .unwrap_or_default()
}

pub fn ensure_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS tracks (
            id TEXT PRIMARY KEY,
            title TEXT,
            artist TEXT,
            album TEXT,
            album_artist TEXT,
            genre_json TEXT,
            comment_json TEXT,
            label TEXT,
            filename TEXT,
            year INTEGER,
            date TEXT,
            original_date TEXT,
            original_year INTEGER,
            track_number INTEGER,
            track_total INTEGER,
            disc_number INTEGER,
            disc_total INTEGER,
            key TEXT,
            bpm REAL,
            rating REAL,
            isrc_json TEXT,
            encoder TEXT,
            encoder_tag TEXT,
            encoder_tool TEXT,
            raw_tags_json TEXT,
            musicbrainz_albumid TEXT,
            musicbrainz_artistid TEXT,
            musicbrainz_albumartistid TEXT,
            musicbrainz_releasegroupid TEXT,
            musicbrainz_trackid TEXT,
            musicbrainz_releasetrackid TEXT,
            musicbrainz_albumstatus TEXT,
            musicbrainz_albumtype TEXT,
            source_path TEXT UNIQUE,
            search_text TEXT,
            import_status TEXT,
            duration_seconds REAL,
            bitrate_kbps INTEGER,
            added_at INTEGER,
            updated_at INTEGER,
            last_write_error TEXT,
            is_missing INTEGER DEFAULT 0,
            cover_art_path TEXT,
            cover_art_thumb_path TEXT
        );",
    )
    .map_err(|error| error.to_string())?;

    // Add columns if they don't exist (for existing databases)
    let _ = conn.execute("ALTER TABLE tracks ADD COLUMN cover_art_path TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE tracks ADD COLUMN cover_art_thumb_path TEXT",
        [],
    );
    let _ = conn.execute("ALTER TABLE tracks ADD COLUMN bpm REAL", []);
    let _ = conn.execute("ALTER TABLE tracks ADD COLUMN last_played_at TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE tracks ADD COLUMN play_count INTEGER DEFAULT 0",
        [],
    );

    Ok(())
}
