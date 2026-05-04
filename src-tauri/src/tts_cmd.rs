use rodio::{Decoder, OutputStream, Sink};
use std::io::Cursor;
use tauri::command;

const ANDREW: &str = "en-US-AndrewNeural";
const JENNY:  &str = "en-US-JennyNeural";

fn voice_id(name: &str) -> &'static str {
    if name.to_lowercase().contains("jenny") { JENNY } else { ANDREW }
}

/// Speak text using Python edge-tts (neural voices) with SAPI fallback.
#[command]
pub fn speak_tts(text: String, voice: String, volume: u8, pitch: f64) {
    let vid = voice_id(&voice).to_string();
    std::thread::spawn(move || {
        if try_python_edge_tts(&text, &vid, volume) {
            return;
        }
        try_sapi(&text, &voice, volume, pitch);
    });
}

/// Try Python edge-tts via subprocess (same method Dark Rotation Manager uses).
fn try_python_edge_tts(text: &str, voice_id: &str, volume: u8) -> bool {
    let temp = std::env::temp_dir().join("mech_tts.mp3");
    let temp_str = temp.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    let gen_ok = {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("python")
            .args(["-m", "edge_tts", "--voice", voice_id, "--text", text, "--write-media", &temp_str])
            .creation_flags(0x08000000)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    };

    #[cfg(not(target_os = "windows"))]
    let gen_ok = std::process::Command::new("python")
        .args(["-m", "edge_tts", "--voice", voice_id, "--text", text, "--write-media", &temp_str])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !gen_ok || !temp.exists() {
        return false;
    }

    let vol = (volume as f32 / 100.0).clamp(0.0, 1.0);

    if let Ok(file) = std::fs::read(&temp) {
        if let Ok((_stream, handle)) = OutputStream::try_default() {
            if let Ok(sink) = Sink::try_new(&handle) {
                sink.set_volume(vol);
                if let Ok(decoder) = Decoder::new(Cursor::new(file)) {
                    sink.append(decoder);
                    sink.sleep_until_end();
                    return true;
                }
            }
        }
    }

    false
}

/// Last-resort: Windows SAPI via PowerShell (uses David/Zira desktop voices).
fn try_sapi(text: &str, voice: &str, volume: u8, pitch: f64) {
    let safe = text.replace('\'', "''");
    let safe_voice = voice.replace('\'', "''").replace('{', "{{").replace('}', "}}");
    let rate  = ((pitch - 1.0) * 5.0).round() as i32;
    let script = format!(
        r#"try {{
    Add-Type -AssemblyName System.Speech -ErrorAction Stop
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $v = $s.GetInstalledVoices() | Where-Object {{ $_.VoiceInfo.Name -like '*{safe_voice}*' }} | Select-Object -First 1
    if ($v) {{ $s.SelectVoice($v.VoiceInfo.Name) }}
    $s.Volume = {volume}; $s.Rate = {rate}; $s.Speak('{safe}')
}} catch {{}}"#
    );

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(0x08000000)
            .spawn();
    }
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
