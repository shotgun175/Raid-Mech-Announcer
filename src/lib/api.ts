import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "./settings";

export const setClickthrough = (set: boolean): Promise<void> => invoke("set_clickthrough", { set });
export const saveSettings = (settings: AppSettings): Promise<void> => invoke("save_settings", { settings });
export const getSettings = (): Promise<AppSettings> => invoke("get_settings");
export const listTtsVoices = (): Promise<string[]> => invoke("list_tts_voices");
export const speakTtsCommand = (text: string, voice: string, volume: number, rate: number): Promise<void> =>
  invoke("speak_tts", { text, voice, volume, rate });
export const stopTts = (): Promise<void> => invoke("stop_tts");
// Bulk pre-generate (cache-warm) the given callout lines for a voice + rate. Progress arrives via
// the "tts:pregen-progress" / "tts:pregen-done" events; cancel with cancelTtsPregen().
export const pregenerateTts = (texts: string[], voice: string, rate: number): Promise<void> =>
  invoke("pregenerate_tts", { texts, voice, rate });
export const cancelTtsPregen = (): Promise<void> => invoke("cancel_tts_pregen");
export const getLOAMeterDataPath = (): Promise<string | null> => invoke("get_loa_meter_data_path");
// LOA Logs' saved global shortcuts (action -> key) from its settings.json; empty when unavailable.
export const getLoaLogsShortcuts = (): Promise<Record<string, string>> => invoke("get_loa_logs_shortcuts");
export const toggleOverlayWindow = (): Promise<void> => invoke("toggle_overlay_window");

// Fight-capture log (rolling JSONL of the raw boss-status feed, for replay/diagnostics)
export const captureAppend = (lines: string): Promise<void> => invoke("capture_append", { lines });
export const captureReadAll = (): Promise<string> => invoke("capture_read_all");
export const captureClear = (): Promise<void> => invoke("capture_clear");
export const capturePath = (): Promise<string> => invoke("capture_path");
