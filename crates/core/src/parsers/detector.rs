//! Platform detection and parser trait definitions.

use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;

use crate::error::CoreError;
use crate::io::archive::{collect_files, peek_zip, zip_contains};
use crate::models::universal::{Platform, UniversalMessage};
use crate::progress::ProgressTracker;

/// Type alias for heap-allocated parser implementations.
pub type BoxedParser = Box<dyn PlatformParser>;

/// Contract implemented by every platform-specific parser.
pub trait PlatformParser: Send + Sync {
    /// Returns the platform handled by this parser.
    fn platform(&self) -> Platform;

    /// Returns `true` when this parser can handle the given export path.
    fn detect(&self, path: &Path) -> bool;

    /// Parses the export into normalized [`UniversalMessage`] values.
    fn parse(
        &self,
        path: &Path,
        progress: &ProgressTracker,
    ) -> Result<Vec<UniversalMessage>, CoreError>;
}

/// Returns the first parser that recognizes the given export path.
pub fn detect_platform<'a>(
    path: &Path,
    parsers: &'a [BoxedParser],
) -> Option<&'a dyn PlatformParser> {
    parsers
        .iter()
        .find(|parser| parser.detect(path))
        .map(|parser| parser.as_ref())
}

/// Returns the default registry of Tier-1 platform parsers.
pub fn default_parsers() -> Vec<BoxedParser> {
    vec![
        Box::new(TelegramParser),
        Box::new(WhatsAppParser),
        Box::new(XParser),
        Box::new(GoogleParser),
        Box::new(InstagramParser),
        Box::new(TikTokParser),
        Box::new(SpotifyParser),
        Box::new(YouTubeParser),
    ]
}

fn path_matches_any(path: &Path, needles: &[&str]) -> bool {
    let normalized = path.to_string_lossy().replace('\\', "/");
    needles.iter().any(|needle| normalized.contains(needle))
}

fn file_name_matches(path: &Path, names: &[&str]) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| names.iter().any(|candidate| name.eq_ignore_ascii_case(candidate)))
        .unwrap_or(false)
}

fn first_line(path: &Path) -> Option<String> {
    let file = fs::File::open(path).ok()?;
    let mut reader = BufReader::new(file);
    let mut line = String::new();
    reader.read_line(&mut line).ok()?;
    Some(line)
}

fn json_has_key(path: &Path, key: &str) -> bool {
    let content = match fs::read_to_string(path) {
        Ok(content) => content,
        Err(_) => return false,
    };

    let value: serde_json::Value = match serde_json::from_str(&content) {
        Ok(value) => value,
        Err(_) => return false,
    };

    match value {
        serde_json::Value::Object(map) => map.contains_key(key),
        serde_json::Value::Array(items) => items
            .first()
            .and_then(|item| item.as_object())
            .map(|object| object.contains_key(key))
            .unwrap_or(false),
        _ => false,
    }
}

fn zip_or_dir_contains(path: &Path, needles: &[&str]) -> bool {
    if path.is_file() && path.extension().and_then(|ext| ext.to_str()) == Some("zip") {
        return peek_zip(path)
            .map(|entries| entries.iter().any(|entry| path_matches_any(Path::new(entry), needles)))
            .unwrap_or(false);
    }

    collect_files(path)
        .map(|files| files.iter().any(|file| path_matches_any(file, needles)))
        .unwrap_or(false)
}

fn unsupported_parse(platform: Platform, path: &Path) -> Result<Vec<UniversalMessage>, CoreError> {
    Err(CoreError::UnsupportedFormat(format!(
        "{} parser detected {:?} but full parsing is not implemented yet",
        platform.as_str(),
        path
    )))
}

macro_rules! stub_parser {
    ($name:ident, $platform:expr, $detect_body:expr) => {
        struct $name;

        impl PlatformParser for $name {
            fn platform(&self) -> Platform {
                $platform
            }

            fn detect(&self, path: &Path) -> bool {
                $detect_body(path)
            }

            fn parse(
                &self,
                path: &Path,
                progress: &ProgressTracker,
            ) -> Result<Vec<UniversalMessage>, CoreError> {
                if progress.is_cancelled() {
                    return Err(CoreError::Cancelled);
                }

                unsupported_parse(self.platform(), path)
            }
        }
    };
}

stub_parser!(TelegramParser, Platform::Telegram, |path: &Path| {
    if file_name_matches(path, &["result.json"]) {
        return true;
    }

    if path.extension().and_then(|ext| ext.to_str()) == Some("zip") {
        return zip_contains(path, "result.json").unwrap_or(false);
    }

    zip_or_dir_contains(path, &["/result.json", "result.json"])
});

stub_parser!(WhatsAppParser, Platform::WhatsApp, |path: &Path| {
    if path.extension().and_then(|ext| ext.to_str()) != Some("txt") {
        return false;
    }

    first_line(path)
        .map(|line| {
            let trimmed = line.trim_start_matches('[');
            trimmed.chars().take(16).any(|ch| ch.is_ascii_digit())
                && (trimmed.contains('/') || trimmed.contains('.') || trimmed.contains('-'))
        })
        .unwrap_or(false)
});

stub_parser!(XParser, Platform::X, |path: &Path| {
    zip_or_dir_contains(path, &["data/tweet.js", "data/account.js"])
});

stub_parser!(GoogleParser, Platform::Google, |path: &Path| {
    zip_or_dir_contains(
        path,
        &["Takeout/", "semantic_location_history", "My Activity"],
    )
});

stub_parser!(InstagramParser, Platform::Instagram, |path: &Path| {
    zip_or_dir_contains(
        path,
        &["messages/inbox/", "messages/message_1.json", "your_instagram_activity"],
    )
});

stub_parser!(TikTokParser, Platform::TikTok, |path: &Path| {
    if path.is_file() {
        if file_name_matches(path, &["user_data.json"]) {
            return true;
        }

        return json_has_key(path, "Activity");
    }

    zip_or_dir_contains(path, &["user_data.json", "Activity"])
});

stub_parser!(SpotifyParser, Platform::Spotify, |path: &Path| {
    if !path.is_file() {
        return zip_or_dir_contains(path, &["Streaming_History", "endsong"]);
    }

    if !file_name_matches(path, &["Streaming_History_Audio", "endsong"]) {
        return false;
    }

    json_has_key(path, "master_metadata_track_artist_name")
});

stub_parser!(YouTubeParser, Platform::YouTube, |path: &Path| {
    if file_name_matches(path, &["watch-history.json", "search-history.json"]) {
        return true;
    }

    if path.is_file() {
        let content = fs::read_to_string(path).unwrap_or_default();
        return content.contains("\"header\"") && content.contains("YouTube");
    }

    zip_or_dir_contains(path, &["watch-history.json", "search-history.json"])
});

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_platform_finds_telegram_json() {
        let dir = tempfile::tempdir().unwrap();
        let export = dir.path().join("result.json");
        fs::write(&export, r#"{"messages":[]}"#).unwrap();

        let parsers = default_parsers();
        let detected = detect_platform(&export, &parsers).unwrap();
        assert_eq!(detected.platform(), Platform::Telegram);
    }

    #[test]
    fn whatsapp_detects_chat_export_txt() {
        let dir = tempfile::tempdir().unwrap();
        let export = dir.path().join("WhatsApp Chat.txt");
        fs::write(&export, "12/01/24, 10:00 - Alice: Hello").unwrap();

        let parser = WhatsAppParser;
        assert!(parser.detect(&export));
    }
}
