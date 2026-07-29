//! Thread-safe progress tracking and cancellation support.

use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;

/// Cheaply clonable handle to share progress state across threads.
#[derive(Clone)]
pub struct ProgressHandle {
    progress: Arc<AtomicUsize>,
    cancelled: Arc<AtomicBool>,
}

impl ProgressHandle {
    /// Returns the current progress value in the range `0..=100`.
    pub fn get(&self) -> usize {
        self.progress.load(Ordering::Relaxed)
    }

    /// Returns `true` if cancellation was requested.
    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::Relaxed)
    }
}

/// Owned progress tracker, usually held by the orchestrating task.
pub struct ProgressTracker {
    inner: ProgressHandle,
}

impl ProgressTracker {
    /// Creates a new tracker starting at `0%` with no cancellation.
    pub fn new() -> Self {
        Self {
            inner: ProgressHandle {
                progress: Arc::new(AtomicUsize::new(0)),
                cancelled: Arc::new(AtomicBool::new(false)),
            },
        }
    }

    /// Sets progress to `value`, clamped to `0..=100`.
    pub fn set(&self, value: usize) {
        self.inner
            .progress
            .store(value.min(100), Ordering::Relaxed);
    }

    /// Returns the current progress value in the range `0..=100`.
    pub fn get(&self) -> usize {
        self.inner.get()
    }

    /// Requests cancellation. Worker threads should poll [`Self::is_cancelled`].
    pub fn cancel(&self) {
        self.inner.cancelled.store(true, Ordering::Relaxed);
    }

    /// Returns `true` if cancellation was requested.
    pub fn is_cancelled(&self) -> bool {
        self.inner.is_cancelled()
    }

    /// Returns a cloneable handle for worker threads.
    pub fn handle(&self) -> ProgressHandle {
        self.inner.clone()
    }
}

impl Default for ProgressTracker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn progress_clamps_to_100() {
        let tracker = ProgressTracker::new();
        tracker.set(150);
        assert_eq!(tracker.get(), 100);
    }

    #[test]
    fn cancellation_propagates_to_handle() {
        let tracker = ProgressTracker::new();
        let handle = tracker.handle();
        tracker.cancel();
        assert!(handle.is_cancelled());
    }
}
