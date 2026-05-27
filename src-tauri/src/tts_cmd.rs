use rodio::{Decoder, OutputStream, Sink};
use std::fs::OpenOptions;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::time::{Instant, SystemTime};
use tauri::{AppHandle, Emitter, State, command};
use uuid::Uuid;

use crate::context::AppContext;

const ANDREW: &str = "en-US-AndrewNeural";
const JENNY:  &str = "en-US-JennyNeural";

// Bumped by stop_tts() to cancel all queued/in-flight speech. Each speak_tts thread captures
// the epoch at spawn; if it changes before or during playback, that thread skips or stops.
static TTS_EPOCH: AtomicU64 = AtomicU64::new(0);

// Bulk pre-generation (cache warm) state. PREGEN_RUNNING guards against two runs at once;
// PREGEN_CANCEL lets the UI stop an in-flight run.
static PREGEN_RUNNING: AtomicBool = AtomicBool::new(false);
static PREGEN_CANCEL: AtomicBool = AtomicBool::new(false);
const PREGEN_WORKERS: usize = 4;

#[derive(Clone, serde::Serialize)]
struct PregenProgress {
    done: usize,
    total: usize,
}

#[derive(Clone, serde::Serialize)]
struct PregenDone {
    generated: usize,
    total: usize,
    cancelled: bool,
}

fn voice_id(name: &str) -> &'static str {
    if name.to_lowercase().contains("jenny") { JENNY } else { ANDREW }
}

// On-disk cache of synthesized clips, keyed by (voice, rate, text). edge-tts generation costs
// ~2s per line (Python spawn + network round-trip); a cache hit is a sub-millisecond file read,
// so a given callout is synthesized at most once and then replayed in perpetuity. Lives next to
// the exe (alongside settings) so it survives restarts and updates.
pub const TTS_CACHE_DIR: &str = "tts-cache";
const TTS_CACHE_CAP_BYTES: u64 = 25 * 1024 * 1024; // ~2,500 short clips; a safety valve, rarely hit

fn fnv1a(parts: &[&str]) -> u64 {
    let mut h: u64 = 0xcbf29ce484222325;
    for (i, part) in parts.iter().enumerate() {
        if i > 0 {
            // Separator so ("a","bc") and ("ab","c") don't collide.
            h ^= 0x1f;
            h = h.wrapping_mul(0x100000001b3);
        }
        for b in part.bytes() {
            h ^= b as u64;
            h = h.wrapping_mul(0x100000001b3);
        }
    }
    h
}

/// Stable cache filename for a clip. Voice + rate are part of the key, so changing either is a
/// clean miss (the old clip just ages out via the LRU sweep) rather than playing a stale voice.
fn cache_file_name(text: &str, voice_id: &str, rate_str: &str) -> String {
    format!("tts_{:016x}.mp3", fnv1a(&[voice_id, rate_str, text]))
}

/// Speak text using Python edge-tts (neural voices) with SAPI fallback.
/// rate: 1.0 = normal, 1.5 = 50% faster, 0.5 = half speed.
#[command]
pub fn speak_tts(ctx: State<AppContext>, text: String, voice: String, volume: u8, rate: f64) {
    let vid = voice_id(&voice).to_string();
    let epoch = TTS_EPOCH.load(Ordering::SeqCst);
    let cache_dir = ctx.current_dir.join(TTS_CACHE_DIR);
    std::thread::spawn(move || {
        if try_python_edge_tts(&text, &vid, volume, rate, epoch, &cache_dir) {
            return;
        }
        try_sapi(&text, &voice, volume, rate, epoch);
    });
}

/// Cancel all queued/in-flight TTS. Bumping the epoch makes every speak_tts thread skip
/// playback (if still generating its audio) or stop on its next poll (if already playing),
/// so a line generated just before a fight ended never leaks out after. Wired to stop / end.
#[command]
pub fn stop_tts() {
    TTS_EPOCH.fetch_add(1, Ordering::SeqCst);
}

/// Bulk-warm the cache: synthesize every line in `texts` (skipping any already cached) for the
/// given voice + rate, off the UI thread with a few workers. Emits `tts:pregen-progress`
/// ({done,total}) as clips complete and `tts:pregen-done` ({generated,total,cancelled}) at the
/// end. A no-op if a run is already in progress. Cancel via cancel_tts_pregen().
#[command]
pub fn pregenerate_tts(app: AppHandle, ctx: State<AppContext>, texts: Vec<String>, voice: String, rate: f64) {
    // Guard against overlapping runs.
    if PREGEN_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    PREGEN_CANCEL.store(false, Ordering::SeqCst);

    let vid = voice_id(&voice).to_string();
    let rate_str = format!("{:+.0}%", (rate - 1.0) * 100.0);
    let cache_dir = ctx.current_dir.join(TTS_CACHE_DIR);
    let texts: Vec<String> = texts.into_iter().filter(|t| !t.trim().is_empty()).collect();

    std::thread::spawn(move || {
        let total = texts.len();
        let texts = Arc::new(texts);
        let next = Arc::new(AtomicUsize::new(0)); // shared work index
        let done = Arc::new(AtomicUsize::new(0));
        let generated = Arc::new(AtomicUsize::new(0)); // actually synthesized (vs already cached)

        let mut handles = Vec::new();
        for _ in 0..PREGEN_WORKERS.min(total.max(1)) {
            let (texts, next, done, generated) = (texts.clone(), next.clone(), done.clone(), generated.clone());
            let (cache_dir, vid, rate_str, app) = (cache_dir.clone(), vid.clone(), rate_str.clone(), app.clone());
            handles.push(std::thread::spawn(move || {
                loop {
                    if PREGEN_CANCEL.load(Ordering::SeqCst) {
                        break;
                    }
                    let i = next.fetch_add(1, Ordering::SeqCst);
                    if i >= texts.len() {
                        break;
                    }
                    let text = &texts[i];
                    let cache_file = cache_dir.join(cache_file_name(text, &vid, &rate_str));
                    if !cache_file.is_file() && synthesize_to_cache(text, &vid, &rate_str, &cache_dir).is_some() {
                        generated.fetch_add(1, Ordering::SeqCst);
                    }
                    let d = done.fetch_add(1, Ordering::SeqCst) + 1;
                    let _ = app.emit("tts:pregen-progress", PregenProgress { done: d, total });
                }
            }));
        }
        for h in handles {
            let _ = h.join();
        }

        let cancelled = PREGEN_CANCEL.load(Ordering::SeqCst);
        let generated = generated.load(Ordering::SeqCst);
        log::info!("[tts] pre-generate done: {generated} new of {total} (cancelled={cancelled})");
        let _ = app.emit("tts:pregen-done", PregenDone { generated, total, cancelled });
        PREGEN_RUNNING.store(false, Ordering::SeqCst);
    });
}

/// Request cancellation of an in-flight pre-generate run. Workers stop after their current clip.
#[command]
pub fn cancel_tts_pregen() {
    PREGEN_CANCEL.store(true, Ordering::SeqCst);
}

/// Try Python edge-tts, cached. A cache hit replays the stored MP3 (no Python, no network); a
/// miss synthesizes via subprocess, publishes the clip to the cache, then plays it.
fn try_python_edge_tts(text: &str, voice_id: &str, volume: u8, rate: f64, epoch: u64, cache_dir: &Path) -> bool {
    // edge-tts rate format: "+50%" for 1.5x, "-25%" for 0.75x
    let rate_str = format!("{:+.0}%", (rate - 1.0) * 100.0);
    let vol = (volume as f32 / 100.0).clamp(0.0, 1.0);
    let cache_file = cache_dir.join(cache_file_name(text, voice_id, &rate_str));

    // ---- Cache hit: replay the stored clip ----
    if cache_file.is_file() {
        // Mark "used now" so the LRU sweep keeps actively-played clips. Best-effort.
        if let Ok(f) = OpenOptions::new().write(true).open(&cache_file) {
            let _ = f.set_modified(SystemTime::now());
        }
        // A stop fired before we started — report handled, don't play.
        if TTS_EPOCH.load(Ordering::SeqCst) != epoch {
            return true;
        }
        let t0 = Instant::now();
        match std::fs::read(&cache_file) {
            Ok(bytes) => {
                log::info!("[tts] cache hit, loaded in {} ms: \"{}\"", t0.elapsed().as_millis(), text);
                return play_clip(bytes, vol, epoch);
            }
            // Unreadable entry — drop it and fall through to regenerate.
            Err(_) => {
                let _ = std::fs::remove_file(&cache_file);
            }
        }
    }

    // ---- Cache miss: synthesize, publish to the cache, then play ----
    // Don't bother synthesizing a line that a stop already invalidated.
    if TTS_EPOCH.load(Ordering::SeqCst) != epoch {
        return true;
    }
    let t0 = Instant::now();
    let Some(final_path) = synthesize_to_cache(text, voice_id, &rate_str, cache_dir) else {
        return false;
    };
    log::info!("[tts] cache miss, synthesized in {} ms: \"{}\"", t0.elapsed().as_millis(), text);

    // A stop fired while generating: keep the cached clip for next time, just skip playback.
    if TTS_EPOCH.load(Ordering::SeqCst) != epoch {
        return true;
    }
    match std::fs::read(&final_path) {
        Ok(bytes) => play_clip(bytes, vol, epoch),
        Err(_) => false,
    }
}

/// Synthesize a clip with edge-tts and publish it into the content-addressed cache, returning the
/// final path. Generates to a unique temp first so concurrent identical calls never read a
/// half-written file, then renames it into place. No hit-check (callers do that) and no playback —
/// shared by the speak path and the bulk pre-generate command.
fn synthesize_to_cache(text: &str, voice_id: &str, rate_str: &str, cache_dir: &Path) -> Option<PathBuf> {
    let _ = std::fs::create_dir_all(cache_dir);
    let gen_tmp = cache_dir.join(format!(".gen_{}.mp3", Uuid::new_v4()));
    let gen_tmp_str = gen_tmp.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    let gen_ok = {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("python")
            .args([
                "-m", "edge_tts",
                "--voice", voice_id,
                "--text", text,
                "--rate", rate_str,
                "--write-media", &gen_tmp_str,
            ])
            .creation_flags(0x08000000)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    };

    #[cfg(not(target_os = "windows"))]
    let gen_ok = std::process::Command::new("python")
        .args(["-m", "edge_tts", "--voice", voice_id, "--text", text, "--rate", rate_str, "--write-media", &gen_tmp_str])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !gen_ok || !gen_tmp.exists() {
        let _ = std::fs::remove_file(&gen_tmp);
        return None;
    }

    // Publish into the cache. If a concurrent call already produced this clip, keep theirs.
    let cache_file = cache_dir.join(cache_file_name(text, voice_id, rate_str));
    let final_path = if cache_file.exists() {
        let _ = std::fs::remove_file(&gen_tmp);
        cache_file
    } else if std::fs::rename(&gen_tmp, &cache_file).is_ok() {
        cache_file
    } else {
        // Rename failed (rare, e.g. cross-volume) — return the temp; a later call re-publishes.
        gen_tmp
    };
    Some(final_path)
}

/// Decode an in-memory MP3 and play it to completion, stopping early if a stop (epoch bump) fires.
fn play_clip(bytes: Vec<u8>, vol: f32, epoch: u64) -> bool {
    let Ok((_stream, handle)) = OutputStream::try_default() else { return false };
    let Ok(sink) = Sink::try_new(&handle) else { return false };
    sink.set_volume(vol);
    let Ok(decoder) = Decoder::new(Cursor::new(bytes)) else { return false };
    sink.append(decoder);
    // Poll instead of sleep_until_end so a stop (epoch bump) interrupts playback promptly.
    while !sink.empty() {
        if TTS_EPOCH.load(Ordering::SeqCst) != epoch {
            sink.stop();
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(25));
    }
    true
}

/// LRU sweep of the clip cache: if it exceeds the cap, delete least-recently-played clips until
/// under it. Also clears any leftover `.gen_*` temp files from an interrupted synth. Run once at
/// startup, off the fight path.
pub fn prune_tts_cache(cache_dir: &Path) {
    prune_cache_to_cap(cache_dir, TTS_CACHE_CAP_BYTES);
}

fn prune_cache_to_cap(cache_dir: &Path, cap_bytes: u64) {
    let Ok(entries) = std::fs::read_dir(cache_dir) else { return };
    let mut clips: Vec<(std::path::PathBuf, u64, SystemTime)> = Vec::new();
    let mut total: u64 = 0;

    for entry in entries.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        let Ok(meta) = entry.metadata() else { continue };
        if !meta.is_file() {
            continue;
        }
        // Sweep abandoned temp files from a synth interrupted mid-write.
        if name.starts_with(".gen_") {
            let _ = std::fs::remove_file(entry.path());
            continue;
        }
        if !(name.starts_with("tts_") && name.ends_with(".mp3")) {
            continue;
        }
        let mtime = meta.modified().unwrap_or(SystemTime::UNIX_EPOCH);
        total += meta.len();
        clips.push((entry.path(), meta.len(), mtime));
    }

    if total <= cap_bytes {
        return;
    }
    clips.sort_by_key(|(_, _, mtime)| *mtime); // oldest-played first
    for (path, len, _) in clips {
        if total <= cap_bytes {
            break;
        }
        if std::fs::remove_file(&path).is_ok() {
            total = total.saturating_sub(len);
        }
    }
    log::info!("[tts] cache pruned to {} bytes", total);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn cache_name_is_stable_and_distinguishes_voice_and_rate() {
        let a = cache_file_name("Bomb in 3 bars", "en-US-AndrewNeural", "+0%");
        assert_eq!(a, cache_file_name("Bomb in 3 bars", "en-US-AndrewNeural", "+0%"));
        assert!(a.starts_with("tts_") && a.ends_with(".mp3"));
        // Different text, voice, or rate must all yield different files.
        assert_ne!(a, cache_file_name("Bomb in 4 bars", "en-US-AndrewNeural", "+0%"));
        assert_ne!(a, cache_file_name("Bomb in 3 bars", "en-US-JennyNeural", "+0%"));
        // Regression: +50% and -50% must not collide (they would under naive sanitization).
        assert_ne!(
            cache_file_name("Bomb in 3 bars", "en-US-AndrewNeural", "+50%"),
            cache_file_name("Bomb in 3 bars", "en-US-AndrewNeural", "-50%")
        );
    }

    fn write_clip(dir: &Path, name: &str, bytes: usize, mtime: SystemTime) {
        let path = dir.join(name);
        std::fs::write(&path, vec![0u8; bytes]).unwrap();
        let f = OpenOptions::new().write(true).open(&path).unwrap();
        f.set_modified(mtime).unwrap();
    }

    #[test]
    fn prune_evicts_oldest_until_under_cap_and_clears_temps() {
        let dir = std::env::temp_dir().join(format!("tts_prune_test_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let base = SystemTime::UNIX_EPOCH;
        // Three 100-byte clips, distinct play times: old < mid < new.
        write_clip(&dir, "tts_old.mp3", 100, base);
        write_clip(&dir, "tts_mid.mp3", 100, base + Duration::from_secs(10));
        write_clip(&dir, "tts_new.mp3", 100, base + Duration::from_secs(20));
        // A leftover temp and an unrelated file that prune must respect.
        write_clip(&dir, ".gen_abc.mp3", 100, base);
        write_clip(&dir, "settings.json", 100, base);

        // Cap of 250 bytes: must drop the single oldest clip (300 -> 200), keep the rest.
        prune_cache_to_cap(&dir, 250);

        assert!(!dir.join("tts_old.mp3").exists(), "oldest clip should be evicted");
        assert!(dir.join("tts_mid.mp3").exists(), "mid clip should survive");
        assert!(dir.join("tts_new.mp3").exists(), "newest clip should survive");
        assert!(!dir.join(".gen_abc.mp3").exists(), "leftover temp should be swept");
        assert!(dir.join("settings.json").exists(), "unrelated files must be left alone");

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn prune_keeps_everything_when_under_cap() {
        let dir = std::env::temp_dir().join(format!("tts_prune_under_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        write_clip(&dir, "tts_a.mp3", 100, SystemTime::UNIX_EPOCH);
        write_clip(&dir, "tts_b.mp3", 100, SystemTime::UNIX_EPOCH);

        prune_cache_to_cap(&dir, 10_000);

        assert!(dir.join("tts_a.mp3").exists());
        assert!(dir.join("tts_b.mp3").exists());
        std::fs::remove_dir_all(&dir).ok();
    }
}

/// Last-resort: Windows SAPI via PowerShell.
fn try_sapi(text: &str, voice: &str, volume: u8, rate: f64, epoch: u64) {
    // Best-effort cancel: skip if a stop already fired. Once SAPI is speaking via PowerShell
    // we can't easily interrupt it, but edge-tts is the normal path and is fully cancellable.
    if TTS_EPOCH.load(Ordering::SeqCst) != epoch {
        return;
    }
    let safe = text.replace('\'', "''");
    let safe_voice = voice.replace('\'', "''").replace('{', "{{").replace('}', "}}");
    // SAPI Rate: -10 (slowest) to +10 (fastest). Map 0.25-4.0 to -10..+10.
    let sapi_rate = ((rate - 1.0) * 8.0).round().clamp(-10.0, 10.0) as i32;
    let script = format!(
        r#"try {{
    Add-Type -AssemblyName System.Speech -ErrorAction Stop
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $v = $s.GetInstalledVoices() | Where-Object {{ $_.VoiceInfo.Name -like '*{safe_voice}*' }} | Select-Object -First 1
    if ($v) {{ $s.SelectVoice($v.VoiceInfo.Name) }}
    $s.Volume = {volume}; $s.Rate = {sapi_rate}; $s.Speak('{safe}')
}} catch {{}}"#
    );

    #[cfg(target_os = "windows")]
    {{
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(0x08000000)
            .spawn();
    }}
}

/// List voice sources available on this system.
#[command]
pub fn list_tts_voices() -> Vec<String> {
    let mut out = vec![];

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let py_check = std::process::Command::new("python")
            .args(["-m", "edge_tts", "--list-voices"])
            .creation_flags(0x08000000)
            .output();
        match py_check {
            Ok(o) if o.status.success() => {
                let count = String::from_utf8_lossy(&o.stdout)
                    .lines()
                    .filter(|l| l.contains("en-US"))
                    .count();
                out.push(format!("✓ Python edge-tts — {} en-US voices available", count));
                out.push("  en-US-AndrewNeural (Male) ← selected when Andrew".into());
                out.push("  en-US-JennyNeural  (Female) ← selected when Jenny".into());
            }
            _ => {
                out.push("✗ Python edge-tts — not installed (run: pip install edge-tts)".into());
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    out.push("✗ Python edge-tts — Windows only in this build".into());

    out.push("---".into());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let script = r#"Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ForEach-Object { "  " + $_.VoiceInfo.Name + " (local SAPI)" }"#;
        if let Ok(o) = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .creation_flags(0x08000000)
            .output()
        {
            for line in String::from_utf8_lossy(&o.stdout).lines() {
                let l = line.trim_end().to_string();
                if !l.is_empty() {
                    out.push(l);
                }
            }
        }
    }

    out
}
