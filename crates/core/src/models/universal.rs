//! Platform-agnostic message and metadata types.

use serde::{Deserialize, Serialize};

/// Supported social media and data export platforms.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum Platform {
    Telegram,
    WhatsApp,
    X,
    Google,
    Instagram,
    TikTok,
    Spotify,
    YouTube,
    LinkedIn,
    Unknown,
}

impl Platform {
    /// Returns a stable snake_case identifier for storage and logging.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Telegram => "telegram",
            Self::WhatsApp => "whatsapp",
            Self::X => "x",
            Self::Google => "google",
            Self::Instagram => "instagram",
            Self::TikTok => "tiktok",
            Self::Spotify => "spotify",
            Self::YouTube => "youtube",
            Self::LinkedIn => "linkedin",
            Self::Unknown => "unknown",
        }
    }
}

/// Normalized message type across all supported platforms.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    Text,
    Media,
    Sticker,
    Voice,
    Video,
    File,
    System,
    Unknown,
}

/// Attachment metadata extracted from a platform export.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Attachment {
    pub name: String,
    pub mime_type: Option<String>,
    pub size_bytes: Option<u64>,
}

/// Universal message representation used by all parsers and analytics queries.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UniversalMessage {
    pub platform: Platform,
    pub id: Option<String>,
    pub sender: String,
    pub content: Option<String>,
    /// Unix epoch timestamp in seconds.
    pub timestamp_secs: i64,
    pub conversation_id: Option<String>,
    pub conversation_name: Option<String>,
    pub message_type: MessageType,
    pub attachments: Vec<Attachment>,
    /// Original platform-specific JSON payload for debugging and future extraction.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw: Option<serde_json::Value>,
}

impl UniversalMessage {
    /// Creates a minimal text message for tests and stubs.
    pub fn text(platform: Platform, sender: impl Into<String>, content: impl Into<String>) -> Self {
        Self {
            platform,
            id: None,
            sender: sender.into(),
            content: Some(content.into()),
            timestamp_secs: 0,
            conversation_id: None,
            conversation_name: None,
            message_type: MessageType::Text,
            attachments: Vec::new(),
            raw: None,
        }
    }
}
