import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import type { AppSettings } from "./settings";

export const getAppVersion = async (): Promise<string> => `v${await getVersion()}`;

export const openUrl = (url: string): Promise<void> => invoke("open_url", { url });

export const checkStartOnBoot = (): Promise<boolean> => invoke("check_start_on_boot");

export const checkLoaRunning = (): Promise<boolean> => invoke("check_loa_running");

export const setClickthrough = (set: boolean): Promise<void> => invoke("set_clickthrough", { set });

export const saveSettings = (settings: AppSettings): Promise<void> => invoke("save_settings", { settings });

export const getSettings = (): Promise<AppSettings> => invoke("get_settings");

export const setStartOnBoot = (set: boolean): Promise<void> => invoke("set_start_on_boot", { set });

export const setAlwaysOnTop = (enabled: boolean): Promise<void> => {
  if (enabled) {
    return invoke("enable_aot");
  }

  return invoke("disable_aot");
};

export const writeLog = (message: string): Promise<void> => invoke("write_log", { message });

export const checkBetaUpdate = (): Promise<{ version: string; body?: string } | null> => invoke("check_beta_update");

export const installBetaUpdate = (): Promise<void> => invoke("install_beta_update");

export const installStableUpdate = (): Promise<void> => invoke("install_stable_update");

export const startLoaProcess = (): Promise<void> => invoke("start_loa_process");

export const listTtsVoices = (): Promise<string[]> => invoke("list_tts_voices");

export const getLOAMeterDataPath = (): Promise<string | null> => invoke("get_loa_meter_data_path");

export const setBlur = (enabled: boolean): Promise<void> => {
  if (enabled) {
    return invoke("enable_blur");
  }

  return invoke("disable_blur");
};

export const relaunchApp = async () => {
  await invoke("unload_driver");
  await invoke("remove_driver");
  await relaunch();
};

export const toggleOverlayWindow = (): Promise<void> => invoke("toggle_overlay_window");
