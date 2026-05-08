import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { removeDriver, unloadDriver } from "../api";
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
  // Release WinDivert before the installer replaces the bundled binaries.
  // Failures here are non-fatal — the installer may still succeed if the driver
  // wasn't running. Don't block the install.
  await unloadDriver().catch(() => {});
  await removeDriver().catch(() => {});
  await update.downloadAndInstall();
  await relaunch();
}
