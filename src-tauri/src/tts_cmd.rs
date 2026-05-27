use rodio::{Decoder, OutputStream, Sink};
use std::fs::OpenOptions;
use std::io::Cursor;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Instant, SystemTime};
use tauri::{State, command};
use uuid::Uuid;

use crate::context::AppContext;

const ANDREW: &str = "en-US-AndrewNeural";
const JENNY:  &str = "en-US-JennyNeural";

// Bumped by stop_tts() to cancel all queued/in-flight speech. Each speak_tts thread captures
// the epoch at spawn; if it changes before or during playback, that thread skips or stops.
static TTS_EPOCH: AtomicU64 = AtomicU64::new(0);

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

    // ---- Cache miss: synthesize, then publish to the cache ----
    let _ = std::fs::create_dir_all(cache_dir);
    // Generate to a unique temp first so concurrent identical calls don't read a half-written
    // file, then atomically rename it into the content-addressed cache path.
    let gen_tmp = cache_dir.join(format!(".gen_{}.mp3", Uuid::new_v4()));
    let gen_tmp_str = gen_tmp.to_string_lossy().to_string();

    let t0 = Instant::now();
    #[cfg(target_os = "windows")]
    let gen_ok = {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("python")
            .args([
                "-m", "edge_tts",
                "--voice", voice_id,
                "--text", text,
                "--rate", &rate_str,
                "--write-media", &gen_tmp_str,
            ])
            .creation_flags(0x08000000)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    };

    #[cfg(not(target_os = "windows"))]
    let gen_ok = std::process::Command::new("python")
        .args(["-m", "edge_tts", "--voice", voice_id, "--text", text, "--rate", &rate_str, "--write-media", &gen_tmp_str])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !gen_ok || !gen_tmp.exists() {
        let _ = std::fs::remove_file(&gen_tmp);
        return false;
    }
    log::info!("[tts] cache miss, synthesized in {} ms: \"{}\"", t0.elapsed().as_millis(), text);

    // Publish into the cache. If a concurrent call already produced this clip, keep theirs.
    let final_path = if cache_file.exists() {
        let _ = std::fs::remove_file(&gen_tmp);
        cache_file
    } else if std::fs::rename(&gen_tmp, &cache_file).is_ok() {
        cache_file
    } else {
        // Rename failed (rare, e.g. cross-volume) — play from the temp; a later miss re-publishes.
        gen_tmp
    };

    // A stop fired while generating: keep the cached clip for next time, just skip playback.
    if TTS_EPOCH.load(Ordering::SeqCst) != epoch {
        return true;
    }

    match std::fs::read(&final_path) {
        Ok(bytes) => play_clip(bytes, vol, epoch),
        Err(_) => false,
    }
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
