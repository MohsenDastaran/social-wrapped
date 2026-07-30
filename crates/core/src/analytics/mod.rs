//! Analytics modules.
//!
//! `collectors` is always compiled — it is pure Rust with no external deps.
//! `queries` requires the `analytics` feature (DuckDB + rayon).

pub mod collectors;

#[cfg(feature = "analytics")]
pub mod queries;
