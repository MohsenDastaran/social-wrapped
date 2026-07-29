//! High-level analytics queries built on top of DuckDB's `read_json_auto`.
//!
//! Every function in this module pushes all heavy computation into DuckDB — no
//! row-by-row Rust iteration occurs.  Add a new function here when you need a
//! new aggregation; the [`crate::storage::engine::AnalyticsEngine`] stays
//! query-agnostic.

pub mod queries;
