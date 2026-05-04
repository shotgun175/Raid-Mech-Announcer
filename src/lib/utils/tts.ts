import { invoke } from "@tauri-apps/api/core";

/**
 * Speak text using Windows SAPI via Rust.
 * Voice: "Andrew" or "Jenny" — matched against installed SAPI voice descriptions.
 * Falls back to browser speechSynthesis if not in Tauri context.
 */
export async function speakTts(text: string, voice: string, volume: number, pitch: number): Promise<void> {
  try {
    await invoke("speak_tts", {
      text,
      voice,
      volume: Math.round(Math.max(0, Math.min(100, volume))),
      pitch: Math.max(0.5, Math.min(2.0, pitch))
    });
  } catch {
    // Fallback for browser dev mode (npm run dev)
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.volume = volume / 100;
      u.pitch = pitch;
      const voices = speechSynthesis.getVoices();
      const lc = voice.toLowerCase();
      const matched =
        voices.find((v) => v.name.toLowerCase().includes(lc) && v.name.toLowerCase().includes("natural")) ??
        voices.find((v) => v.name.toLowerCase().includes(lc)) ??
        null;
      if (matched) u.voice = matched;
      speechSynthesis.speak(u);
    } catch (e) {
      console.warn("TTS fallback error:", e);
    }
  }
}
