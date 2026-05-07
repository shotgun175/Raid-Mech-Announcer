import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "./settings";

export const setClickthrough = (set: boolean): Promise<void> => invoke("set_clickthrough", { set });
export const saveSettings = (settings: AppSettings): Promise<void> => invoke("save_settings", { settings });
export const getSettings = (): Promise<AppSettings> => invoke("get_settings");
export const listTtsVoices = (): Promise<string[]> => invoke("list_tts_voices");
export const getLOAMeterDataPath = (): Promise<string | null> => invoke("get_loa_meter_data_path");
export const toggleOverlayWindow = (): Promise<void> => invoke("toggle_overlay_window");

// WinDivert teardown — call before the updater replaces the bundled DLL/.sys.
export const unloadDriver = (): Promise<void> => invoke("unload_driver");
export const removeDriver = (): Promise<void> => invoke("remove_driver");
