import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import type { AppSettings } from "./settings";

export const setClickthrough = (set: boolean): Promise<void> => invoke("set_clickthrough", { set });
export const saveSettings = (settings: AppSettings): Promise<void> => invoke("save_settings", { settings });
export const getSettings = (): Promise<AppSettings> => invoke("get_settings");
export const listTtsVoices = (): Promise<string[]> => invoke("list_tts_voices");
export const getLOAMeterDataPath = (): Promise<string | null> => invoke("get_loa_meter_data_path");
export const toggleOverlayWindow = (): Promise<void> => invoke("toggle_overlay_window");

export const relaunchApp = async () => {
  await invoke("unload_driver");
  await invoke("remove_driver");
  await relaunch();
};
