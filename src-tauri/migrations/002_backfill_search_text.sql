PRAGMA foreign_keys = ON;

UPDATE tracks
SET search_text = TRIM(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              LOWER(
                COALESCE(title, '') || ' ' ||
                COALESCE(artist, '') || ' ' ||
                COALESCE(album, '') || ' ' ||
                COALESCE(album_artist, '') || ' ' ||
                COALESCE(genre_json, '') || ' ' ||
                COALESCE(comment_json, '') || ' ' ||
                COALESCE(label, '') || ' ' ||
                COALESCE(filename, '') || ' ' ||
                COALESCE(year, '') || ' ' ||
                COALESCE(track_number, '') || ' ' ||
                COALESCE(disc_number, '')
              ),
              '.', ' '
            ),
            '-', ' '
          ),
          '_', ' '
        ),
        '/', ' '
      ),
      '\\', ' '
    ),
    ':', ' '
  )
)
WHERE search_text IS NULL OR search_text = '';
