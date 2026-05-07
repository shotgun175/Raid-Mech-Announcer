import { invoke } from "@tauri-apps/api/core";

/**
 * Speak text using Python edge-tts (neural) with SAPI fallback.
 * rate: 0.5 = half speed, 1.0 = normal, 2.0 = double speed.
 */
export async function speakTts(
  text: string,
  voice: string,
  volume: number,
  pitch: number,
  rate: number = 1.0
): Promise<void> {
  try {
    await invoke("speak_tts", {
      text,
      voice,
      volume: Math.round(Math.max(0, Math.min(100, volume))),
      pitch: Math.max(0.5, Math.min(2.0, pitch)),
      rate: Math.max(0.25, Math.min(4.0, rate))
    });
  } catch {
    // Fallback for browser dev mode (npm run dev)
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.volume = volume / 100;
      u.pitch = pitch;
      u.rate = rate;
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
