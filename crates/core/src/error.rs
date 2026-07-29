//! Centralized error types for the analytics core.

use thiserror::Error;

/// All recoverable errors produced by `app-core`.
#[derive(Debug, Error)]
pub enum CoreError {
    /// Filesystem or I/O failure.
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    /// JSON serialization or deserialization failure.
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    /// ZIP archive read or write failure.
    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),

    /// DuckDB query or connection failure.
    #[cfg(feature = "storage")]
    #[error("Database error: {0}")]
    Database(#[from] duckdb::Error),

    /// The input file or archive does not match any known platform format.
    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),

    /// A platform-specific parser failed to interpret the export data.
    #[error("Parse error: {0}")]
    Parse(String),

    /// The caller requested cancellation via [`crate::progress::ProgressTracker`].
    #[error("Operation cancelled")]
    Cancelled,
}
