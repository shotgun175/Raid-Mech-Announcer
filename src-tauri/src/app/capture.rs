use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

use anyhow::{Context, Result};

use crate::app;

const MAX_BYTES: u64 = 5_000_000;
const BASENAME: &str = "raid_mech_announcer_capture";

fn current_path() -> PathBuf {
    app::path::log_dir().join(format!("{BASENAME}.jsonl"))
}

fn archive_path() -> PathBuf {
    app::path::log_dir().join(format!("{BASENAME}.1.jsonl"))
}

/// Append a batch of JSONL (one capture record per line) to the rolling capture file.
/// Rotates to a single archive when the current file passes MAX_BYTES, so disk use is
/// bounded at ~2x MAX_BYTES. Best-effort: directory and rotation failures are swallowed.
pub fn append(lines: &str) -> Result<()> {
    if lines.is_empty() {
        return Ok(());
    }
    let path = current_path();
    if let Some(dir) = path.parent() {
        let _ = fs::create_dir_all(dir);
    }
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .with_context(|| format!("opening capture file {}", path.display()))?;
    f.write_all(lines.as_bytes()).context("writing capture batch")?;
    if !lines.ends_with('\n') {
        let _ = f.write_all(b"\n");
    }
    drop(f);

    let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    if size > MAX_BYTES {
        let _ = fs::rename(&path, archive_path());
    }
    Ok(())
}

/// Absolute path to the current capture file, so the UI can reveal it for bug reports.
pub fn path() -> PathBuf {
    current_path()
}

/// Returns all capture content, oldest first (archive then current). Empty string if none.
pub fn read_all() -> Result<String> {
    let mut out = String::new();
    if let Ok(s) = fs::read_to_string(archive_path()) {
        out.push_str(&s);
    }
    if let Ok(s) = fs::read_to_string(current_path()) {
        out.push_str(&s);
    }
    Ok(out)
}

/// Deletes the capture file(s).
pub fn clear() -> Result<()> {
    let _ = fs::remove_file(current_path());
    let _ = fs::remove_file(archive_path());
    Ok(())
}
