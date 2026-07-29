//! [`MockDataProvider`] — loads real export files from `crates/core/mock/`
//! for headless integration tests.
//!
//! # Directory convention
//!
//! ```text
//! crates/core/mock/
//! ├── telegram/
//! │   └── result.json
//! ├── whatsapp/
//! │   └── _chat.txt
//! ├── spotify/
//! │   └── Streaming_History_Audio_2024.json
//! └── …
//! ```
//!
//! Place your own exported files there.  The entire directory is in
//! `.gitignore`, so nothing personal ever reaches version control.

use std::fs;
use std::path::{Path, PathBuf};

use serde::de::DeserializeOwned;

use crate::error::CoreError;

/// Resolves and exposes files under `crates/core/mock/`.
///
/// All path resolution happens at call-time using the `CARGO_MANIFEST_DIR`
/// environment variable, which Cargo sets to the directory of the crate being
/// compiled.  This means the helper works correctly inside `cargo test`,
/// `cargo run`, and integration test binaries without any additional
/// configuration.
pub struct MockDataProvider {
    /// Absolute path to the `crates/core/mock/` directory.
    pub base_path: PathBuf,
}

impl MockDataProvider {
    /// Creates a provider whose [`base_path`](Self::base_path) is resolved
    /// from `CARGO_MANIFEST_DIR` at compile time.
    ///
    /// Call this inside unit tests:
    ///
    /// ```rust
    /// use app_core::mock::provider::MockDataProvider;
    ///
    /// let mock = MockDataProvider::from_manifest_dir();
    /// // mock.base_path == …/crates/core/mock
    /// ```
    pub fn from_manifest_dir() -> Self {
        Self {
            base_path: PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("mock"),
        }
    }

    /// Creates a provider pointing at an arbitrary directory.  Useful in
    /// integration tests that manage their own fixture directory.
    pub fn from_path(base_path: impl Into<PathBuf>) -> Self {
        Self {
            base_path: base_path.into(),
        }
    }

    /// Returns the path to a platform's mock subdirectory without checking
    /// whether it exists.
    pub fn platform_dir(&self, platform: &str) -> PathBuf {
        self.base_path.join(platform)
    }

    /// Lists all files inside `mock/<platform>/` recursively.
    ///
    /// Returns an empty `Vec` (not an error) when the directory does not exist,
    /// so tests that have not yet populated a given platform continue to compile
    /// and run without failing.
    pub fn platform_files(&self, platform: &str) -> Result<Vec<PathBuf>, CoreError> {
        let dir = self.platform_dir(platform);
        if !dir.exists() {
            return Ok(Vec::new());
        }
        collect_files_recursive(&dir)
    }

    /// Loads raw bytes from a file at `mock/<relative_path>`.
    ///
    /// # Errors
    ///
    /// Returns [`CoreError::Io`] when the file does not exist or cannot be
    /// read.
    pub fn load_bytes(&self, relative_path: &str) -> Result<Vec<u8>, CoreError> {
        let path = self.base_path.join(relative_path);
        Ok(fs::read(&path)?)
    }

    /// Deserializes a JSON fixture file at `mock/<relative_path>` into `T`.
    ///
    /// # Errors
    ///
    /// Returns [`CoreError::Io`] on read failure or [`CoreError::Json`] on
    /// deserialization failure.
    pub fn load_json<T: DeserializeOwned>(&self, relative_path: &str) -> Result<T, CoreError> {
        let bytes = self.load_bytes(relative_path)?;
        Ok(serde_json::from_slice(&bytes)?)
    }

    /// Returns `true` when a file or directory exists at
    /// `mock/<relative_path>`.
    pub fn exists(&self, relative_path: &str) -> bool {
        self.base_path.join(relative_path).exists()
    }

    /// Resolves an absolute path for `mock/<relative_path>`.  Useful when
    /// you need to pass a path directly to a parser or the analytics engine.
    pub fn resolve(&self, relative_path: &str) -> PathBuf {
        self.base_path.join(relative_path)
    }
}

fn collect_files_recursive(dir: &Path) -> Result<Vec<PathBuf>, CoreError> {
    let mut files = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            files.extend(collect_files_recursive(&path)?);
        } else {
            files.push(path);
        }
    }
    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn from_manifest_dir_resolves_path() {
        let mock = MockDataProvider::from_manifest_dir();
        // The path should end with "mock" regardless of whether the directory
        // has been populated yet.
        assert_eq!(mock.base_path.file_name().unwrap(), "mock");
    }

    #[test]
    fn platform_files_returns_empty_when_dir_missing() {
        let dir = tempfile::tempdir().unwrap();
        let mock = MockDataProvider::from_path(dir.path());
        // "nonexistent" subdirectory does not exist → empty vec, not an error
        let files = mock.platform_files("nonexistent").unwrap();
        assert!(files.is_empty());
    }

    #[test]
    fn load_bytes_reads_file() {
        let dir = tempfile::tempdir().unwrap();
        let mock = MockDataProvider::from_path(dir.path());
        std::fs::write(dir.path().join("test.json"), b"{}").unwrap();
        let bytes = mock.load_bytes("test.json").unwrap();
        assert_eq!(bytes, b"{}");
    }

    #[test]
    fn load_json_deserializes_fixture() {
        use serde_json::Value;
        let dir = tempfile::tempdir().unwrap();
        let mock = MockDataProvider::from_path(dir.path());
        std::fs::write(dir.path().join("data.json"), br#"{"key":"value"}"#).unwrap();
        let v: Value = mock.load_json("data.json").unwrap();
        assert_eq!(v["key"], "value");
    }
}
