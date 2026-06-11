use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::mpsc;

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::Emitter;

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct FightEndEvent {
    pub boss: String,
    pub difficulty: String,
    pub cleared: bool,
}

/// Returns the path to LOA Logs' active log file, or None if LOA Logs isn't installed.
pub fn loa_log_path() -> Option<PathBuf> {
    let base = dirs::data_local_dir()?;
    let path = base.join("LOA Logs").join("loa_logs_rCURRENT.log");
    if path.is_file() { Some(path) } else { None }
}

/// Parses a single log line. Returns Some(FightEndEvent) if it's a fight-end line.
/// Expected format: "... saving to db - cleared: [BOOL], difficulty: [DIFF] BOSS"
pub fn parse_fight_end(line: &str) -> Option<FightEndEvent> {
    let after = line.split("saving to db - cleared: ").nth(1)?;
    let cleared_str = after.split(']').next()?.trim_start_matches('[');
    let cleared = cleared_str == "true";

    let after_diff = after.split("difficulty: ").nth(1)?;
    let difficulty = after_diff
        .split(']')
        .next()?
        .trim_start_matches('[')
        .to_string();
    let boss = after_diff.split_once("] ")?.1.trim().to_string();

    if boss.is_empty() {
        return None;
    }
    Some(FightEndEvent {
        boss,
        difficulty,
        cleared,
    })
}

/// Incremental log reader. Two failure modes of the previous inline loop are
/// handled here: a fight-end line flushed in two chunks was lost (the read
/// position advanced past the partial line, so neither half ever parsed), and
/// a rotated/truncated file was tailed-at-the-old-offset forever (the held
/// handle also pinned the old file). The tailer carries incomplete trailing
/// lines between polls, re-opens the path on every poll, and restarts from
/// the top when the file shrank.
struct LogTailer {
    path: PathBuf,
    pos: u64,
    partial: String,
}

impl LogTailer {
    fn new(path: PathBuf, start_at_end: bool) -> Self {
        let pos = if start_at_end {
            std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0)
        } else {
            0
        };
        Self {
            path,
            pos,
            partial: String::new(),
        }
    }

    /// Read newly appended content; return every complete fight-end event.
    fn poll(&mut self) -> Vec<FightEndEvent> {
        let mut out = Vec::new();
        let Ok(mut file) = File::open(&self.path) else {
            return out;
        };
        let len = file.metadata().map(|m| m.len()).unwrap_or(0);
        if len < self.pos {
            // Shrunk: the file was rotated or truncated — start over.
            self.pos = 0;
            self.partial.clear();
        }
        if file.seek(SeekFrom::Start(self.pos)).is_err() {
            return out;
        }
        let mut bytes = Vec::new();
        if file.read_to_end(&mut bytes).is_err() {
            return out;
        }
        // UTF-8 handling must never stall the tailer at a fixed pos:
        // - a clean read consumes everything;
        // - an INCOMPLETE trailing sequence (writer flushed mid-char) is held
        //   back and re-read next poll, completed by the next flush;
        // - a genuinely INVALID byte mid-stream (e.g. the writer was killed
        //   mid-char and appended past it on restart) is consumed lossily
        //   (U+FFFD) — that one line won't parse, but tailing continues.
        let buf: String = match std::str::from_utf8(&bytes) {
            Ok(text) => {
                self.pos += bytes.len() as u64;
                text.to_string()
            }
            Err(err) if err.error_len().is_none() => {
                let valid_up_to = err.valid_up_to();
                self.pos += valid_up_to as u64;
                String::from_utf8_lossy(&bytes[..valid_up_to]).into_owned()
            }
            Err(_) => {
                self.pos += bytes.len() as u64;
                String::from_utf8_lossy(&bytes).into_owned()
            }
        };

        let combined = std::mem::take(&mut self.partial) + &buf;
        let mut rest = combined.as_str();
        while let Some(nl) = rest.find('\n') {
            let line = rest[..nl].trim_end_matches('\r');
            if let Some(evt) = parse_fight_end(line) {
                out.push(evt);
            }
            rest = &rest[nl + 1..];
        }
        // Whatever follows the last newline is an incomplete line: keep it
        // for the next poll instead of consuming-and-losing it.
        self.partial = rest.to_string();
        out
    }
}

/// Spawns a background thread that tails the LOA Logs current log file.
/// Emits `loa:fight-end` on the given AppHandle whenever a fight-end line is detected.
/// Returns the watcher (caller must keep it alive for events to fire).
pub fn start_log_watcher(app: tauri::AppHandle) -> Option<RecommendedWatcher> {
    let log_path = loa_log_path()?;

    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();
    let mut watcher = notify::recommended_watcher(tx).ok()?;
    watcher.watch(&log_path, RecursiveMode::NonRecursive).ok()?;

    std::thread::spawn(move || {
        // Start at the end — only watch new lines written after startup.
        let mut tailer = LogTailer::new(log_path, true);

        for event in rx.into_iter().flatten() {
            if !matches!(event.kind, EventKind::Modify(_)) {
                continue;
            }
            for evt in tailer.poll() {
                let _ = app.emit("loa:fight-end", &evt);
            }
        }
    });

    Some(watcher)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_wiped_fight() {
        let line = "[2026-05-03T15:30:06.978617Z] INFO [app::live::encounter_state] saving to db - cleared: [false], difficulty: [Solo] Echidna";
        let event = parse_fight_end(line).unwrap();
        assert_eq!(event.boss, "Echidna");
        assert_eq!(event.difficulty, "Solo");
        assert!(!event.cleared);
    }

    #[test]
    fn parses_cleared_fight() {
        let line = "[2026-05-03T18:00:00.000000Z] INFO [app::live::encounter_state] saving to db - cleared: [true], difficulty: [Hard] Thaemine G3";
        let event = parse_fight_end(line).unwrap();
        assert_eq!(event.boss, "Thaemine G3");
        assert_eq!(event.difficulty, "Hard");
        assert!(event.cleared);
    }

    #[test]
    fn returns_none_for_unrelated_line() {
        let line = "[2026-05-03T23:33:28Z] INFO [app::nineveh] Starting Nineveh IPC server process";
        assert!(parse_fight_end(line).is_none());
    }

    #[test]
    fn returns_none_for_empty_boss_name() {
        let line = "saving to db - cleared: [false], difficulty: [Normal] ";
        assert!(parse_fight_end(line).is_none());
    }

    const FIGHT_END: &str = "[2026-05-03T15:30:06Z] INFO [app::live::encounter_state] saving to db - cleared: [false], difficulty: [Solo] Echidna\n";

    fn temp_log(name: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "rma_log_watch_test_{name}_{}.log",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);
        std::fs::write(&path, b"").unwrap();
        path
    }

    fn append(path: &PathBuf, content: &str) {
        use std::io::Write;
        let mut f = std::fs::OpenOptions::new().append(true).open(path).unwrap();
        f.write_all(content.as_bytes()).unwrap();
    }

    #[test]
    fn carries_a_line_split_across_two_flushes() {
        let path = temp_log("split");
        let mut tailer = LogTailer::new(path.clone(), true);

        let (first, second) = FIGHT_END.split_at(60);
        append(&path, first);
        assert!(
            tailer.poll().is_empty(),
            "half a line must not parse or be consumed"
        );
        append(&path, second);
        let events = tailer.poll();
        assert_eq!(
            events.len(),
            1,
            "the two halves must reassemble into one event"
        );
        assert_eq!(events[0].boss, "Echidna");

        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn recovers_when_the_file_is_rotated() {
        let path = temp_log("rotate");
        let mut tailer = LogTailer::new(path.clone(), true);

        append(&path, FIGHT_END);
        assert_eq!(tailer.poll().len(), 1);

        // Rotation: the file is replaced and starts shorter than the old read
        // position (the shrink IS the rotation signal — a replacement that
        // instantly exceeds the old length is indistinguishable from an
        // append by size alone; accepted limitation of this heuristic).
        std::fs::write(&path, b"new file header\n").unwrap();
        assert_eq!(
            tailer.poll().len(),
            0,
            "the shrink resets the read position"
        );
        append(&path, FIGHT_END);
        assert_eq!(
            tailer.poll().len(),
            1,
            "content appended after the rotation must be picked up"
        );

        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn invalid_utf8_mid_stream_does_not_stall_the_tailer() {
        use std::io::Write;
        let path = temp_log("badutf8");
        let mut tailer = LogTailer::new(path.clone(), true);

        // A truncated multi-byte char (writer killed mid-flush)...
        let mut f = std::fs::OpenOptions::new()
            .append(true)
            .open(&path)
            .unwrap();
        f.write_all(b"broken line \xE2\x80").unwrap();
        drop(f);
        tailer.poll(); // held back as a possibly-incomplete trailing char

        // ...followed by normal lines appended after a restart. The bad bytes
        // are now provably invalid; they must be consumed (lossily), not
        // re-read at the same pos forever.
        append(&path, &format!("\n{FIGHT_END}"));
        let events = tailer.poll();
        assert_eq!(events.len(), 1, "tailing must continue past invalid bytes");
        assert_eq!(events[0].boss, "Echidna");

        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn parses_multiple_lines_in_one_flush() {
        let path = temp_log("multi");
        let mut tailer = LogTailer::new(path.clone(), true);

        append(&path, &format!("{FIGHT_END}unrelated line\n{FIGHT_END}"));
        assert_eq!(tailer.poll().len(), 2);

        let _ = std::fs::remove_file(&path);
    }
}
