//! DuckDB-backed analytics engine.
//!
//! The engine wraps a single DuckDB connection and exposes a small, ergonomic
//! API built around `query_map` (row-by-row with a closure) and `execute` (DDL
//! or write statements).  All `read_json_auto` queries are built by the higher-
//! level `analytics` module; this layer stays query-agnostic.

use std::path::Path;

use crate::error::CoreError;

/// Normalizes a filesystem path into a forward-slash string suitable for
/// embedding inside a DuckDB SQL literal (e.g. `read_json_auto('…')`).
///
/// # Errors
///
/// Returns [`CoreError::Parse`] when the path contains non-UTF-8 bytes.
pub fn quote_path(path: &Path) -> Result<String, CoreError> {
    let s = path
        .to_str()
        .ok_or_else(|| CoreError::Parse(format!("non-UTF-8 path: {}", path.display())))?
        .replace('\\', "/");
    Ok(format!("'{s}'"))
}

/// A DuckDB connection wrapper that powers all analytics queries.
///
/// Create an in-memory instance with [`AnalyticsEngine::in_memory`] for
/// ephemeral analysis, or a file-based one with [`AnalyticsEngine::open`] for
/// results that should survive application restarts.
pub struct AnalyticsEngine {
    conn: duckdb::Connection,
}

impl AnalyticsEngine {
    /// Creates an in-memory DuckDB instance.  Fast and zero-overhead; data is
    /// lost when the engine is dropped.
    pub fn in_memory() -> Result<Self, CoreError> {
        let conn = duckdb::Connection::open_in_memory()?;
        Ok(Self { conn })
    }

    /// Opens or creates a file-backed DuckDB database at `path`.
    pub fn open(path: &Path) -> Result<Self, CoreError> {
        let conn = duckdb::Connection::open(path)?;
        Ok(Self { conn })
    }

    /// Executes `sql` and maps every result row through `f`, collecting the
    /// outputs into a `Vec<T>`.
    ///
    /// # Example
    ///
    /// ```ignore
    /// let rows = engine.query_map(
    ///     "SELECT 1 AS n, 'hello' AS s",
    ///     |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)),
    /// )?;
    /// ```
    pub fn query_map<T, F>(&self, sql: &str, f: F) -> Result<Vec<T>, CoreError>
    where
        F: Fn(&duckdb::Row) -> Result<T, duckdb::Error>,
    {
        let mut stmt = self.conn.prepare(sql)?;
        let mapped = stmt.query_map([], f)?;

        let mut results = Vec::new();
        for item in mapped {
            results.push(item?);
        }
        Ok(results)
    }

    /// Executes a single SQL statement that returns no rows (DDL, INSERT, …).
    /// Returns the number of rows affected.
    pub fn execute(&self, sql: &str) -> Result<usize, CoreError> {
        Ok(self.conn.execute(sql, [])?)
    }

    /// Returns a reference to the underlying [`duckdb::Connection`] for
    /// advanced operations (prepared statements, transactions, …).
    pub fn connection(&self) -> &duckdb::Connection {
        &self.conn
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn in_memory_engine_runs_scalar_query() {
        let engine = AnalyticsEngine::in_memory().unwrap();
        let result: Vec<i64> = engine
            .query_map("SELECT 42", |row| row.get(0))
            .unwrap();
        assert_eq!(result, vec![42]);
    }

    #[test]
    fn quote_path_replaces_backslashes() {
        let p = Path::new(r"C:\Users\foo\data.json");
        let q = quote_path(p).unwrap();
        assert!(q.contains('/'));
        assert!(q.starts_with('\'') && q.ends_with('\''));
    }
}
