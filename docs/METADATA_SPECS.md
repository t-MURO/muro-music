# Metadata Normalization Specs

## Scope
- Formats: MP3 (ID3v2.x + ID3v1), FLAC (Vorbis)
- Goal: normalize tags into a consistent schema with raw tag preservation
- All fields are optional (nullable)

## Canonical Identity
- `MUSICBRAINZ_TRACKID` is treated as the canonical recording identity.
- `MUSICBRAINZ_RELEASETRACKID` is stored as contextual metadata only.

## Core Normalized Fields
- `title`
- `artist`
- `album`
- `album_artist` (fallback to `artist` when missing)
- `genre` (array)
- `comment` (array)
- `key` (trimmed)
- `rating` (0–5, half steps)
- `track_number`, `track_total`
- `disc_number`, `disc_total`
- `date` (string, e.g. `YYYY-MM-DD`)
- `year` (int)
- `original_date` (string)
- `original_year` (int)
- `label`
- `isrc` (array)
- `encoder` (canonical: prefer tag value)
- `encoder_tag` (TSSE / Vorbis ENCODER)
- `encoder_tool` (container tool)
- `raw_tags` (JSON)
- `filename` (derived from `source_path` on import)
- `last_write_error`, `is_missing`, `added_at`, `updated_at`, `last_played_at`, `play_count`

## MusicBrainz Fields (1:1 names)
- `MUSICBRAINZ_ALBUMID`
- `MUSICBRAINZ_ARTISTID` (string or array)
- `MUSICBRAINZ_ALBUMARTISTID` (string or array)
- `MUSICBRAINZ_RELEASEGROUPID`
- `MUSICBRAINZ_TRACKID` (recording id)
- `MUSICBRAINZ_RELEASETRACKID`
- `MUSICBRAINZ_ALBUMSTATUS`
- `MUSICBRAINZ_ALBUMTYPE`

## Normalization Rules

### Track/Disc Parsing
- `TRCK`/`TRACKNUMBER`:
  - `n` -> `track_number=n`, `track_total=null`
  - `n/total` -> `track_number=n`, `track_total=total`
- `TPOS`/`DISCNUMBER`: same rule

### Rating
- MP3 `POPM` (0–255) -> `rating = round((value/255) * 10) / 2`
- Vorbis `RATING` (0–100) -> `rating = round((value/100) * 10) / 2`

### Genre (array)
- Split on `/`, `;`, `,`
- Trim whitespace and drop empties
- Preserve originals in `raw_tags`

### Key
- MP3 `TKEY` / Vorbis `INITIALKEY`
- Trim whitespace before storing

### Date/Year
- Prefer `TDRC` or `DATE` for `date`
- Derive `year` from `date` if present
- `ORIGINALDATE` -> `original_date`
- `ORIGINALYEAR` -> `original_year`
- If `TYER` + `TDAT` exist: build `date` as `YYYY-MM-DD` using `TDAT` (MMDD)

### Encoder
- `encoder` = tag encoder (`TSSE` or `ENCODER`) if present, else `encoder_tool`
- Always store both `encoder_tag` and `encoder_tool`

### Raw Tags
- Store all original tags per format in `raw_tags` (JSON)
- For MP3, store both ID3v2 and ID3v1 when present

## Format Mapping

### MP3 (ID3v2.x)
- `TIT2` -> `title`
- `TPE1` -> `artist`
- `TALB` -> `album`
- `TPE2` -> `album_artist`
- `TCON` -> `genre` (array)
- `TYER`/`TDRC` -> `year`/`date`
- `TRCK` -> `track_number`/`track_total`
- `TPOS` -> `disc_number`/`disc_total`
- `COMM` -> `comment` (array)
- `TKEY` -> `key`
- `POPM` -> `rating`
- `TSSE` -> `encoder_tag`
- `UFID` owner `http://musicbrainz.org` -> `MUSICBRAINZ_TRACKID` (recording id)
- `TXXX:MusicBrainz Album Status` -> `MUSICBRAINZ_ALBUMSTATUS`
- `TXXX:MusicBrainz Album Type` -> `MUSICBRAINZ_ALBUMTYPE`
- `TXXX:MusicBrainz Album Id` -> `MUSICBRAINZ_ALBUMID`
- `TXXX:MusicBrainz Artist Id` -> `MUSICBRAINZ_ARTISTID`
- `TXXX:MusicBrainz Album Artist Id` -> `MUSICBRAINZ_ALBUMARTISTID`
- `TXXX:MusicBrainz Release Group Id` -> `MUSICBRAINZ_RELEASEGROUPID`
- `TXXX:MusicBrainz Release Track Id` -> `MUSICBRAINZ_RELEASETRACKID`
- `TPUB` -> `label`
- `TMED` -> `media`

### FLAC (Vorbis)
- `TITLE` -> `title`
- `ARTIST` -> `artist`
- `ALBUM` -> `album`
- `ALBUMARTIST` -> `album_artist`
- `GENRE` -> `genre` (array, multiple tags allowed)
- `DATE` -> `date` and `year`
- `TRACKNUMBER` + `TRACKTOTAL` -> `track_number`/`track_total`
- `DISCNUMBER` + `DISCTOTAL` -> `disc_number`/`disc_total`
- `COMMENT` -> `comment` (array)
- `INITIALKEY` -> `key`
- `ISRC` -> `isrc` (array)
- `ORGANIZATION` or `LABEL` -> `label`
- `RATING` -> `rating` (0–100 scale)
- `ENCODER` / `ENCODER_SETTINGS` -> `encoder_tag`
- `MUSICBRAINZ_*` fields map 1:1 to columns above

## Write-Back Rules
- Track/disc values are written as `n/total` only if total exists.
- Ratings are written back to their native scales:
  - MP3 `POPM = round((rating/5) * 255)`
  - Vorbis `RATING = round((rating/5) * 100)`
- `genre` arrays are written as multiple Vorbis entries (FLAC) and semicolon-joined for ID3.
- `comment` arrays are written as multiple comment entries.
- `key` is written trimmed.

## Notes
- `filename` is derived from `source_path` and stored; it is not user-editable.
- All fields are optional; missing data should be handled gracefully in UI.
