//! Platform-agnostic analytics core for social media data exports.
//!
//! This crate is consumed by the Tauri shell (`src-tauri`) and the WASM
//! bindings (`crates/wasm`). It must remain free of any UI or Tauri
//! dependencies.

pub mod error;
pub mod greet;
pub mod io;
pub mod mock;
pub mod models;
pub mod parsers;
pub mod progress;

#[cfg(feature = "analytics")]
pub mod analytics;

#[cfg(feature = "storage")]
pub mod storage;

pub use error::CoreError;
pub use greet::greet;
pub use models::universal::{Attachment, MessageType, Platform, UniversalMessage};
pub use progress::{ProgressHandle, ProgressTracker};
