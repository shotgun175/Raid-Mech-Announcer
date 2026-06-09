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

/// Spawns a background thread that tails the LOA Logs current log file.
/// Emits `loa:fight-end` on the given AppHandle whenever a fight-end line is detected.
/// Returns the watcher (caller must keep it alive for events to fire).
pub fn start_log_watcher(app: tauri::AppHandle) -> Option<RecommendedWatcher> {
    let log_path = loa_log_path()?;

    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();
    let mut watcher = notify::recommended_watcher(tx).ok()?;
    watcher.watch(&log_path, RecursiveMode::NonRecursive).ok()?;

    let path = log_path.clone();
    std::thread::spawn(move || {
        let mut file = match File::open(&path) {
            Ok(f) => f,
            Err(_) => return,
        };
        // Seek to end — only watch new lines written after startup.
        let _ = file.seek(SeekFrom::End(0));
        let mut buf = String::new();

        for event in rx.into_iter().flatten() {
            if !matches!(event.kind, EventKind::Modify(_)) {
                continue;
            }
            buf.clear();
            let _ = file.read_to_string(&mut buf);
            for line in buf.lines() {
                if let Some(evt) = parse_fight_end(line) {
                    let _ = app.emit("loa:fight-end", &evt);
                }
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
}
