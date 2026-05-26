use rodio::{Decoder, OutputStream, Sink};
use std::io::Cursor;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::command;
use uuid::Uuid;

const ANDREW: &str = "en-US-AndrewNeural";
const JENNY:  &str = "en-US-JennyNeural";

// Bumped by stop_tts() to cancel all queued/in-flight speech. Each speak_tts thread captures
// the epoch at spawn; if it changes before or during playback, that thread skips or stops.
static TTS_EPOCH: AtomicU64 = AtomicU64::new(0);

fn voice_id(name: &str) -> &'static str {
    if name.to_lowercase().contains("jenny") { JENNY } else { ANDREW }
}

/// Speak text using Python edge-tts (neural voices) with SAPI fallback.
/// rate: 1.0 = normal, 1.5 = 50% faster, 0.5 = half speed.
#[command]
pub fn speak_tts(text: String, voice: String, volume: u8, rate: f64) {
    let vid = voice_id(&voice).to_string();
    let epoch = TTS_EPOCH.load(Ordering::SeqCst);
    std::thread::spawn(move || {
        if try_python_edge_tts(&text, &vid, volume, rate, epoch) {
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

/// Try Python edge-tts via subprocess.
fn try_python_edge_tts(text: &str, voice_id: &str, volume: u8, rate: f64, epoch: u64) -> bool {
    // Per-call unique filename so concurrent invocations don't clobber each other's MP3.
    // (A single shared path caused thread A to read thread B's audio when calls overlapped,
    // which the user heard as the same announcement playing twice.)
    let temp = std::env::temp_dir().join(format!("mech_tts_{}.mp3", Uuid::new_v4()));
    let temp_str = temp.to_string_lossy().to_string();

    // edge-tts rate format: "+50%" for 1.5x, "-25%" for 0.75x
    let rate_pct = (rate - 1.0) * 100.0;
    let rate_str = format!("{:+.0}%", rate_pct);

    #[cfg(target_os = "windows")]
    let gen_ok = {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("python")
            .args([
                "-m", "edge_tts",
                "--voice", voice_id,
                "--text", text,
                "--rate", &rate_str,
                "--write-media", &temp_str,
            ])
            .creation_flags(0x08000000)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    };

    #[cfg(not(target_os = "windows"))]
    let gen_ok = std::process::Command::new("python")
        .args(["-m", "edge_tts", "--voice", voice_id, "--text", text, "--rate", &rate_str, "--write-media", &temp_str])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !gen_ok || !temp.exists() {
        return false;
    }

    // A stop fired while we were generating — don't play this now-stale line, and report
    // "handled" so we don't fall through to the SAPI fallback and speak it anyway.
    if TTS_EPOCH.load(Ordering::SeqCst) != epoch {
        let _ = std::fs::remove_file(&temp);
        return true;
    }

    let vol = (volume as f32 / 100.0).clamp(0.0, 1.0);

    let played = (|| -> bool {
        let Ok(file) = std::fs::read(&temp) else { return false };
        let Ok((_stream, handle)) = OutputStream::try_default() else { return false };
        let Ok(sink) = Sink::try_new(&handle) else { return false };
        sink.set_volume(vol);
        let Ok(decoder) = Decoder::new(Cursor::new(file)) else { return false };
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
    })();

    let _ = std::fs::remove_file(&temp);
    played
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
