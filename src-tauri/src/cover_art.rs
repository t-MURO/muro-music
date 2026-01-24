use image::imageops::FilterType;
use image::ImageFormat;
use lofty::file::TaggedFile;
use lofty::picture::{MimeType, PictureType};
use lofty::prelude::*;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Cursor;
use std::path::Path;

/// Size for full cover art (sidebar/now playing)
const FULL_SIZE: u32 = 512;
/// Size for thumbnail (bottom bar/lists)
const THUMB_SIZE: u32 = 128;

/// Result of caching cover art to disk
#[derive(Debug, Clone)]
pub struct CachedCover {
    pub full_path: String,
    pub thumb_path: String,
    pub hash: String,
}

/// Extract cover art bytes and mime type from a tagged file
/// Prefers CoverFront, falls back to first available picture
pub fn extract_cover_bytes(tagged: &TaggedFile) -> Option<(Vec<u8>, MimeType)> {
    for tag in tagged.tags() {
        // First pass: look for front cover
        for picture in tag.pictures() {
            if picture.pic_type() == PictureType::CoverFront {
                let mime = picture.mime_type().cloned().unwrap_or(MimeType::Jpeg);
                return Some((picture.data().to_vec(), mime));
            }
        }
        // Second pass: take any picture
        if let Some(picture) = tag.pictures().first() {
            let mime = picture.mime_type().cloned().unwrap_or(MimeType::Jpeg);
            return Some((picture.data().to_vec(), mime));
        }
    }
    None
}

/// Compute SHA-256 hash of bytes, return first 16 hex characters
pub fn compute_hash(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let result = hasher.finalize();
    hex::encode(&result[..8]) // 16 hex chars = 8 bytes
}

/// Cache cover art to disk, creating full and thumbnail versions
/// Returns None if caching fails, Some(CachedCover) on success
/// Skips processing if files with the same hash already exist
pub fn cache_cover_art(bytes: &[u8], cache_dir: &Path) -> Option<CachedCover> {
    let hash = compute_hash(bytes);

    let full_path = cache_dir.join(format!("{}_full.jpg", hash));
    let thumb_path = cache_dir.join(format!("{}_thumb.jpg", hash));

    // Check if already cached (deduplication)
    if full_path.exists() && thumb_path.exists() {
        return Some(CachedCover {
            full_path: full_path.to_string_lossy().to_string(),
            thumb_path: thumb_path.to_string_lossy().to_string(),
            hash,
        });
    }

    // Decode image
    let img = match image::load_from_memory(bytes) {
        Ok(img) => img,
        Err(err) => {
            eprintln!("Failed to decode cover art: {}", err);
            return None;
        }
    };

    // Ensure cache directory exists
    if let Err(err) = fs::create_dir_all(cache_dir) {
        eprintln!("Failed to create cache directory: {}", err);
        return None;
    }

    // Create full-size version (512x512)
    if !full_path.exists() {
        let full_img = img.resize_to_fill(FULL_SIZE, FULL_SIZE, FilterType::Lanczos3);
        let mut full_bytes = Cursor::new(Vec::new());
        if let Err(err) = full_img.write_to(&mut full_bytes, ImageFormat::Jpeg) {
            eprintln!("Failed to encode full cover art: {}", err);
            return None;
        }
        if let Err(err) = fs::write(&full_path, full_bytes.into_inner()) {
            eprintln!("Failed to write full cover art: {}", err);
            return None;
        }
    }

    // Create thumbnail version (128x128)
    if !thumb_path.exists() {
        let thumb_img = img.resize_to_fill(THUMB_SIZE, THUMB_SIZE, FilterType::Lanczos3);
        let mut thumb_bytes = Cursor::new(Vec::new());
        if let Err(err) = thumb_img.write_to(&mut thumb_bytes, ImageFormat::Jpeg) {
            eprintln!("Failed to encode thumbnail: {}", err);
            return None;
        }
        if let Err(err) = fs::write(&thumb_path, thumb_bytes.into_inner()) {
            eprintln!("Failed to write thumbnail: {}", err);
            return None;
        }
    }

    Some(CachedCover {
        full_path: full_path.to_string_lossy().to_string(),
        thumb_path: thumb_path.to_string_lossy().to_string(),
        hash,
    })
}

/// Extract and cache cover art from a tagged file
/// Convenience function combining extract + cache
pub fn process_cover_art(tagged: &TaggedFile, cache_dir: &Path) -> Option<CachedCover> {
    let (bytes, _mime) = extract_cover_bytes(tagged)?;
    cache_cover_art(&bytes, cache_dir)
}
