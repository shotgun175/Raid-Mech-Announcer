import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "./settings";

export const setClickthrough = (set: boolean): Promise<void> => invoke("set_clickthrough", { set });
export const saveSettings = (settings: AppSettings): Promise<void> => invoke("save_settings", { settings });
export const getSettings = (): Promise<AppSettings> => invoke("get_settings");
export const listTtsVoices = (): Promise<string[]> => invoke("list_tts_voices");
export const stopTts = (): Promise<void> => invoke("stop_tts");
export const getLOAMeterDataPath = (): Promise<string | null> => invoke("get_loa_meter_data_path");
export const toggleOverlayWindow = (): Promise<void> => invoke("toggle_overlay_window");

// WinDivert teardown — call before the updater replaces the bundled DLL/.sys.
export const unloadDriver = (): Promise<void> => invoke("unload_driver");
export const removeDriver = (): Promise<void> => invoke("remove_driver");

// Fight-capture log (rolling JSONL of the raw boss-status feed, for replay/diagnostics)
export const captureAppend = (lines: string): Promise<void> => invoke("capture_append", { lines });
export const captureReadAll = (): Promise<string> => invoke("capture_read_all");
export const captureClear = (): Promise<void> => invoke("capture_clear");
export const capturePath = (): Promise<string> => invoke("capture_path");
