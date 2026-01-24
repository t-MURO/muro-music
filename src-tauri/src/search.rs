use unicode_normalization::UnicodeNormalization;

pub fn normalize_search_text(parts: &[&str]) -> String {
    let mut out = String::new();

    for part in parts {
        let normalized = normalize_fragment(part);
        if normalized.is_empty() {
            continue;
        }

        if !out.is_empty() {
            out.push(' ');
        }
        out.push_str(&normalized);
    }

    out
}

#[derive(Debug, Default, Clone)]
pub struct TrackSearchParts<'a> {
    pub title: Option<&'a str>,
    pub artist: Option<&'a str>,
    pub album: Option<&'a str>,
    pub album_artist: Option<&'a str>,
    pub genres: Option<&'a [&'a str]>,
    pub comments: Option<&'a [&'a str]>,
    pub label: Option<&'a str>,
    pub filename: Option<&'a str>,
    pub year: Option<i32>,
    pub track_number: Option<i32>,
    pub disc_number: Option<i32>,
}

pub fn normalize_track_search_text(parts: TrackSearchParts<'_>) -> String {
    let mut values: Vec<String> = Vec::new();

    if let Some(title) = parts.title {
        let trimmed = strip_leading_track_number(title);
        push_normalized(&mut values, trimmed);
    }

    for artist in [parts.artist, parts.album_artist].into_iter().flatten() {
        for token in split_artist_tokens(artist) {
            push_normalized(&mut values, token);
        }
    }

    if let Some(album) = parts.album {
        push_normalized(&mut values, album);
    }

    if let Some(genres) = parts.genres {
        for genre in genres {
            push_normalized(&mut values, genre);
        }
    }

    if let Some(comments) = parts.comments {
        for comment in comments {
            push_normalized(&mut values, comment);
        }
    }

    if let Some(label) = parts.label {
        push_normalized(&mut values, label);
    }

    if let Some(filename) = parts.filename {
        push_normalized(&mut values, filename);
    }

    if let Some(year) = parts.year {
        values.push(year.to_string());
    }

    if let Some(track_number) = parts.track_number {
        values.push(track_number.to_string());
    }

    if let Some(disc_number) = parts.disc_number {
        values.push(disc_number.to_string());
    }

    values.join(" ")
}

fn push_normalized(values: &mut Vec<String>, value: &str) {
    let normalized = normalize_fragment(value);
    if !normalized.is_empty() {
        values.push(normalized);
    }
}

fn split_artist_tokens(value: &str) -> Vec<&str> {
    let mut tokens = Vec::new();
    let mut start = 0;
    let mut index = 0;

    while index < value.len() {
        let slice = &value[index..];
        let split_len =
            if slice.starts_with('&') || slice.starts_with(',') || slice.starts_with(';') {
                1
            } else if slice.to_ascii_lowercase().starts_with(" feat ") {
                6
            } else if slice.to_ascii_lowercase().starts_with(" ft ") {
                4
            } else if slice.to_ascii_lowercase().starts_with(" featuring ") {
                11
            } else {
                0
            };

        if split_len > 0 {
            let chunk = value[start..index].trim();
            if !chunk.is_empty() {
                tokens.push(chunk);
            }
            index += split_len;
            start = index;
            continue;
        }

        index += slice.chars().next().map(|ch| ch.len_utf8()).unwrap_or(1);
    }

    let chunk = value[start..].trim();
    if !chunk.is_empty() {
        tokens.push(chunk);
    }

    if tokens.is_empty() {
        tokens.push(value);
    }

    tokens
}

pub fn normalize_fragment(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    let mut last_was_space = true;

    for ch in value.nfkd() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
            last_was_space = false;
            continue;
        }

        if ch.is_ascii_punctuation() || ch.is_whitespace() || ch.is_ascii_control() {
            if !last_was_space {
                out.push(' ');
                last_was_space = true;
            }
        }
    }

    out.trim().to_string()
}

pub fn strip_leading_track_number(value: &str) -> &str {
    let bytes = value.as_bytes();
    let mut index = 0;

    while index < bytes.len() && bytes[index].is_ascii_whitespace() {
        index += 1;
    }

    let digits_start = index;
    while index < bytes.len() && bytes[index].is_ascii_digit() {
        index += 1;
    }

    if index == digits_start {
        return value;
    }

    while index < bytes.len() && bytes[index].is_ascii_whitespace() {
        index += 1;
    }

    if index < bytes.len() && matches!(bytes[index], b'-' | b'.' | b'_') {
        index += 1;
        while index < bytes.len() && bytes[index].is_ascii_whitespace() {
            index += 1;
        }
        return &value[index..];
    }

    value
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_unicode_and_punctuation() {
        let value = "Bjor\u{308}k - Hyper-Ballad";
        assert_eq!(normalize_fragment(value), "bjork hyper ballad");
    }

    #[test]
    fn collapses_spaces_between_parts() {
        let parts = ["  The  Cure ", "Disintegration", "1989"];
        assert_eq!(
            normalize_search_text(&parts),
            "the cure disintegration 1989"
        );
    }

    #[test]
    fn strips_leading_track_number() {
        let value = "01 - Intro";
        assert_eq!(strip_leading_track_number(value), "Intro");
    }

    #[test]
    fn builds_track_search_text() {
        let parts = TrackSearchParts {
            title: Some("01 - Intro"),
            artist: Some("The Cure feat Siouxsie"),
            album: Some("Disintegration"),
            album_artist: None,
            genres: Some(&["Goth", "Alt Rock"]),
            comments: None,
            label: Some("Fiction"),
            filename: Some("01 - Intro.flac"),
            year: Some(1989),
            track_number: Some(1),
            disc_number: None,
        };

        let text = normalize_track_search_text(parts);
        assert!(text.contains("intro"));
        assert!(text.contains("the cure"));
        assert!(text.contains("siouxsie"));
        assert!(text.contains("disintegration"));
        assert!(text.contains("goth"));
        assert!(text.contains("fiction"));
        assert!(text.contains("1989"));
    }

    #[test]
    fn splits_artist_tokens() {
        let tokens = split_artist_tokens("A & B, C feat D");
        assert_eq!(tokens, vec!["A", "B", "C", "D"]);
    }
}
