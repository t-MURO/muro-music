# Cover Art Implementation Plan

This document outlines the implementation plan for extracting embedded cover art from music files and caching it to disk for efficient display in the UI.

## Overview

**Current state:** Cover art is extracted as base64 and stored directly in the SQLite database.

**Target state:** Extract cover art once on import, resize to standard dimensions, cache to disk as image files, and store only file paths in the database.

## Why This Approach?

- **Performance:** Avoids giant base64 blobs in SQLite (reduces DB size and query time).
- **Faster UI rendering:** Native image decoding from files instead of parsing data URLs.
- **Deduplication:** Identical covers across albums/tracks reuse the same cached file (hash-based naming).
- **Scalability:** Works well for large libraries (10k+ tracks).

## Implementation Plan

### 1. Rust: Add Dependencies

Add to `src-tauri/Cargo.toml`:

```toml
image = "0.25"
sha2 = "0.10"
hex = "0.4"
```

### 2. Rust: Cover Art Extraction & Caching

Create a new module `src-tauri/src/cover_art.rs`:

```rust
// Responsibilities:
// - Extract cover art bytes + mime from Lofty (prefer CoverFront, fallback to first picture)
// - Compute SHA-256 hash of image bytes for stable filenames
// - Resize to standard dimensions using `image` crate
// - Write to cache directory as JPEG (or PNG if alpha needed)
// - Return paths to cached files
```

**Functions to implement:**

| Function | Description |
|----------|-------------|
| `extract_cover_bytes(tagged: &TaggedFile) -> Option<(Vec<u8>, MimeType)>` | Extract raw cover art bytes from tags |
| `compute_hash(bytes: &[u8]) -> String` | SHA-256 hash, hex-encoded (first 16 chars) |
| `cache_cover_art(bytes: &[u8], cache_dir: &Path) -> Result<CachedCover>` | Resize, write to disk, return paths |

**Output struct:**

```rust
pub struct CachedCover {
    pub full_path: String,    // 512x512
    pub thumb_path: String,   // 128x128
    pub hash: String,
}
```

### 3. Rust: Update Import Flow

Modify `src-tauri/src/import.rs`:

- Add `cache_dir: &Path` parameter to `import_files_with_progress` and `import_single`.
- Call `cache_cover_art()` during import.
- Store `cover_art_path` and `cover_art_thumb_path` instead of base64.
- Skip caching if file with same hash already exists (deduplication).

### 4. Rust: Pass Cache Dir from Tauri

Modify `src-tauri/src/lib.rs`:

```rust
#[tauri::command]
fn import_files(
    app: tauri::AppHandle,
    paths: Vec<String>,
    db_path: String,
) -> Result<Vec<import::ImportedTrack>, String> {
    // Resolve cache dir
    let cache_dir = app.path().app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("covers");
    
    // Create dir if needed
    std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    
    import::import_files_with_progress(paths, &db_path, &cache_dir, |progress| {
        let _ = app.emit("muro://import-progress", progress);
    })
}
```

### 5. Database Schema Update

Modify `ensure_schema()` in `import.rs`:

```sql
-- New columns
cover_art_path TEXT,
cover_art_thumb_path TEXT,
cover_art_hash TEXT

-- Migration for existing databases
ALTER TABLE tracks ADD COLUMN cover_art_path TEXT;
ALTER TABLE tracks ADD COLUMN cover_art_thumb_path TEXT;
ALTER TABLE tracks ADD COLUMN cover_art_hash TEXT;
```

Update the `SELECT` query in `load_tracks()` to include new columns.

### 6. Rust Type Updates

**`ImportedTrack` struct:**

```rust
pub struct ImportedTrack {
    // ... existing fields ...
    pub cover_art_path: Option<String>,
    pub cover_art_thumb_path: Option<String>,
    // Remove: pub cover_art: Option<String>,
}
```

**`CurrentTrack` struct (playback.rs):**

```rust
pub struct CurrentTrack {
    // ... existing fields ...
    pub cover_art_path: Option<String>,
    pub cover_art_thumb_path: Option<String>,
}
```

### 7. TypeScript Type Updates

**`src/utils/tauriDb.ts`:**

```typescript
export type ImportedTrack = {
  // ... existing fields ...
  cover_art_path?: string;
  cover_art_thumb_path?: string;
};

// Update importedTrackToTrack mapping
export const importedTrackToTrack = (imported: ImportedTrack) => ({
  // ... existing mappings ...
  coverArtPath: imported.cover_art_path,
  coverArtThumbPath: imported.cover_art_thumb_path,
});
```

**`src/types/library.ts`:**

```typescript
export type Track = {
  // ... existing fields ...
  coverArtPath?: string;
  coverArtThumbPath?: string;
};
```

**`src/hooks/useAudioPlayback.ts`:**

```typescript
export type CurrentTrack = {
  // ... existing fields ...
  coverArtPath?: string;
  coverArtThumbPath?: string;
};
```

### 8. Playback Wiring

Update `playback_play_file` in `lib.rs`:

```rust
fn playback_play_file(
    // ... existing params ...
    cover_art_path: Option<String>,
    cover_art_thumb_path: Option<String>,
) -> Result<(), String> {
    let track = CurrentTrack {
        // ... existing fields ...
        cover_art_path,
        cover_art_thumb_path,
    };
    // ...
}
```

Update `playbackPlayFile` in `tauriDb.ts` accordingly.

### 9. UI: Use Tauri Asset Protocol

Use `convertFileSrc()` to convert local file paths to Tauri asset URLs:

**`src/components/layout/PlayerBar.tsx`:**

```tsx
import { convertFileSrc } from "@tauri-apps/api/core";

// In component:
const coverSrc = currentTrack?.coverArtThumbPath
  ? convertFileSrc(currentTrack.coverArtThumbPath)
  : null;

// In JSX:
{coverSrc ? (
  <img src={coverSrc} alt="Cover" className="..." />
) : (
  <Music2 className="..." />
)}
```

**`src/components/layout/DetailPanel.tsx`:**

```tsx
// Use full-size cover for sidebar
const coverSrc = currentTrack?.coverArtPath
  ? convertFileSrc(currentTrack.coverArtPath)
  : null;
```

### 10. Image Sizing

| Context | Size | Field |
|---------|------|-------|
| Sidebar (Now Playing) | 512x512 | `coverArtPath` |
| Bottom Bar | 128x128 | `coverArtThumbPath` |
| Track List (future) | 128x128 | `coverArtThumbPath` |

### 11. Cache Directory Structure

```
{appCacheDir}/
  covers/
    {hash}_full.jpg    # 512x512
    {hash}_thumb.jpg   # 128x128
```

**Hash:** First 16 characters of SHA-256 hex digest of original image bytes.

### 12. Optional: Backfill Migration

For users who already imported tracks with base64 art:

```rust
#[tauri::command]
fn backfill_cover_art(db_path: String, cache_dir: String) -> Result<usize, String> {
    // 1. Query all tracks where cover_art IS NOT NULL AND cover_art_path IS NULL
    // 2. For each: decode base64, cache to disk, update row
    // 3. Return count of migrated tracks
}
```

This can be exposed as a button in Settings or run automatically on first load.

## File Changes Summary

| File | Changes |
|------|---------|
| `src-tauri/Cargo.toml` | Add `image`, `sha2`, `hex` deps |
| `src-tauri/src/cover_art.rs` | New module for extraction/caching |
| `src-tauri/src/lib.rs` | Export module, update `import_files`, add `backfill_cover_art` |
| `src-tauri/src/import.rs` | Add cache_dir param, store paths, update schema |
| `src-tauri/src/playback.rs` | Add cover path fields to `CurrentTrack` |
| `src/utils/tauriDb.ts` | Update types, add path fields |
| `src/types/library.ts` | Add `coverArtPath`, `coverArtThumbPath` |
| `src/hooks/useAudioPlayback.ts` | Update `CurrentTrack` type |
| `src/components/layout/PlayerBar.tsx` | Use `convertFileSrc()` for thumb |
| `src/components/layout/DetailPanel.tsx` | Use `convertFileSrc()` for full art |

## Implementation Order

1. Add Rust dependencies
2. Create `cover_art.rs` module
3. Update `import.rs` (schema + import flow)
4. Update `lib.rs` (wire cache dir)
5. Update `playback.rs` (add path fields)
6. Update TypeScript types
7. Update UI components
8. Test with fresh imports
9. (Optional) Implement backfill for existing libraries
