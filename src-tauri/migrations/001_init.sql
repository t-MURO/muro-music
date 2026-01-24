PRAGMA foreign_keys = ON;

CREATE TABLE tracks (
  id INTEGER PRIMARY KEY,
  source_path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  import_status TEXT NOT NULL DEFAULT 'staged' CHECK (import_status IN ('staged', 'accepted')),
  title TEXT,
  artist TEXT,
  album TEXT,
  album_artist TEXT,
  genre_json TEXT,
  comment_json TEXT,
  key TEXT,
  rating REAL CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  track_number INTEGER,
  track_total INTEGER,
  disc_number INTEGER,
  disc_total INTEGER,
  date TEXT,
  year INTEGER,
  original_date TEXT,
  original_year INTEGER,
  label TEXT,
  media TEXT,
  isrc_json TEXT,
  encoder TEXT,
  encoder_tag TEXT,
  encoder_tool TEXT,
  raw_tags TEXT,
  search_text TEXT,
  musicbrainz_album_id TEXT,
  musicbrainz_artist_id_json TEXT,
  musicbrainz_albumartist_id_json TEXT,
  musicbrainz_releasegroup_id TEXT,
  musicbrainz_track_id TEXT,
  musicbrainz_releasetrack_id TEXT,
  musicbrainz_albumstatus TEXT,
  musicbrainz_albumtype TEXT,
  last_write_error TEXT,
  is_missing INTEGER NOT NULL DEFAULT 0 CHECK (is_missing IN (0, 1)),
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_played_at TEXT,
  play_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX tracks_import_status_idx ON tracks (import_status);

CREATE VIRTUAL TABLE tracks_fts USING fts5(
  title,
  artist,
  album,
  album_artist,
  genre_json,
  comment_json,
  label,
  filename,
  search_text,
  content='tracks',
  content_rowid='id'
);

CREATE TABLE playlists (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE playlist_tracks (
  playlist_id INTEGER NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
  track_id INTEGER NOT NULL REFERENCES tracks (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (playlist_id, track_id),
  UNIQUE (playlist_id, position)
);

CREATE INDEX playlist_tracks_playlist_idx ON playlist_tracks (playlist_id, position);
CREATE INDEX playlist_tracks_track_idx ON playlist_tracks (track_id);

CREATE TABLE library_column_prefs (
  id INTEGER PRIMARY KEY,
  view TEXT NOT NULL,
  column_key TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
  width INTEGER,
  order_index INTEGER,
  UNIQUE (view, column_key)
);

CREATE TABLE theme_variables (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TRIGGER tracks_set_updated_at
AFTER UPDATE ON tracks
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE tracks
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER tracks_fts_insert
AFTER INSERT ON tracks
BEGIN
  INSERT INTO tracks_fts (
    rowid,
    title,
    artist,
    album,
    album_artist,
    genre_json,
    comment_json,
    label,
    filename,
    search_text
  )
  VALUES (
    NEW.id,
    NEW.title,
    NEW.artist,
    NEW.album,
    NEW.album_artist,
    NEW.genre_json,
    NEW.comment_json,
    NEW.label,
    NEW.filename,
    NEW.search_text
  );
END;

CREATE TRIGGER tracks_fts_delete
AFTER DELETE ON tracks
BEGIN
  INSERT INTO tracks_fts (tracks_fts, rowid)
  VALUES ('delete', OLD.id);
END;

CREATE TRIGGER tracks_fts_update
AFTER UPDATE ON tracks
BEGIN
  INSERT INTO tracks_fts (tracks_fts, rowid)
  VALUES ('delete', OLD.id);
  INSERT INTO tracks_fts (
    rowid,
    title,
    artist,
    album,
    album_artist,
    genre_json,
    comment_json,
    label,
    filename,
    search_text
  )
  VALUES (
    NEW.id,
    NEW.title,
    NEW.artist,
    NEW.album,
    NEW.album_artist,
    NEW.genre_json,
    NEW.comment_json,
    NEW.label,
    NEW.filename,
    NEW.search_text
  );
END;

CREATE TRIGGER playlists_set_updated_at
AFTER UPDATE ON playlists
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE playlists
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER theme_variables_set_updated_at
AFTER UPDATE ON theme_variables
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE theme_variables
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE name = OLD.name;
END;

CREATE TRIGGER app_settings_set_updated_at
AFTER UPDATE ON app_settings
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE app_settings
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE key = OLD.key;
END;
