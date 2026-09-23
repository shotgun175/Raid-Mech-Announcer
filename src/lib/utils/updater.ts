import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { updateInfo } from "../stores.svelte";

export async function checkForUpdate(): Promise<Update | null> {
  try {
    const update = await check();
    if (update) {
      updateInfo.manifest = update;
      updateInfo.available = true;
      return update;
    }
    return null;
  } catch (e) {
    console.warn("update check failed:", e);
    return null;
  }
}

export async function installUpdate(update: Update): Promise<void> {
  await update.downloadAndInstall();
  await relaunch();
}
