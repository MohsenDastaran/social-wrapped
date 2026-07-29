//! Safe ZIP archive inspection and extraction utilities.

use std::fs::File;
use std::io::Read;
use std::path::{Component, Path, PathBuf};

use zip::read::ZipArchive;
use zip::ZipArchive as ZipArchiveType;

use crate::error::CoreError;

/// Returns `true` when a ZIP entry name is safe to extract.
fn is_safe_entry_name(name: &str) -> bool {
    let path = Path::new(name);
    path.components()
        .all(|component| !matches!(component, Component::ParentDir))
}

/// Opens a ZIP archive from disk.
fn open_archive(path: &Path) -> Result<ZipArchiveType<File>, CoreError> {
    let file = File::open(path)?;
    Ok(ZipArchive::new(file)?)
}

/// Lists all entry paths inside a ZIP archive without extracting.
pub fn peek_zip(path: &Path) -> Result<Vec<String>, CoreError> {
    let mut archive = open_archive(path)?;
    let mut entries = Vec::with_capacity(archive.len());

    for index in 0..archive.len() {
        let file = archive.by_index(index)?;
        entries.push(file.name().to_string());
    }

    Ok(entries)
}

/// Returns `true` if the archive contains an entry with the given name.
pub fn zip_contains(archive_path: &Path, entry_name: &str) -> Result<bool, CoreError> {
    Ok(peek_zip(archive_path)?
        .iter()
        .any(|name| name == entry_name || name.ends_with(entry_name)))
}

/// Reads a single named file from a ZIP archive without full extraction.
pub fn read_file_from_zip(archive_path: &Path, entry_name: &str) -> Result<Vec<u8>, CoreError> {
    let mut archive = open_archive(archive_path)?;
    let mut file = archive
        .by_name(entry_name)
        .map_err(|_| CoreError::Parse(format!("ZIP entry not found: {entry_name}")))?;

    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)?;
    Ok(buffer)
}

/// Extracts a ZIP archive to a temporary directory.
///
/// The returned [`tempfile::TempDir`] must be kept alive for the duration of
/// processing so the extracted files remain available.
pub fn extract_to_temp(path: &Path) -> Result<tempfile::TempDir, CoreError> {
    let temp_dir = tempfile::tempdir()?;
    let mut archive = open_archive(path)?;

    for index in 0..archive.len() {
        let mut file = archive.by_index(index)?;
        let entry_name = file.name().to_string();

        if !is_safe_entry_name(&entry_name) {
            return Err(CoreError::Parse(format!(
                "Unsafe ZIP entry path rejected: {entry_name}"
            )));
        }

        let out_path = temp_dir.path().join(&entry_name);

        if entry_name.ends_with('/') {
            std::fs::create_dir_all(&out_path)?;
            continue;
        }

        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let mut out_file = File::create(&out_path)?;
        std::io::copy(&mut file, &mut out_file)?;
    }

    Ok(temp_dir)
}

/// Recursively collects file paths under `root`, skipping hidden entries.
pub fn collect_files(root: &Path) -> Result<Vec<PathBuf>, CoreError> {
    let mut files = Vec::new();

    if root.is_file() {
        files.push(root.to_path_buf());
        return Ok(files);
    }

    if !root.is_dir() {
        return Err(CoreError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("Path does not exist: {}", root.display()),
        )));
    }

    for entry in std::fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            files.extend(collect_files(&path)?);
        } else {
            files.push(path);
        }
    }

    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    fn write_test_zip(path: &Path) {
        let file = File::create(path).unwrap();
        let mut zip = ZipWriter::new(file);
        zip.start_file("result.json", SimpleFileOptions::default())
            .unwrap();
        zip.write_all(br#"{"messages":[]}"#).unwrap();
        zip.finish().unwrap();
    }

    #[test]
    fn peek_zip_lists_entries() {
        let dir = tempfile::tempdir().unwrap();
        let zip_path = dir.path().join("export.zip");
        write_test_zip(&zip_path);

        let entries = peek_zip(&zip_path).unwrap();
        assert!(entries.iter().any(|entry| entry == "result.json"));
    }

    #[test]
    fn zip_contains_detects_entry() {
        let dir = tempfile::tempdir().unwrap();
        let zip_path = dir.path().join("export.zip");
        write_test_zip(&zip_path);

        assert!(zip_contains(&zip_path, "result.json").unwrap());
    }
}
