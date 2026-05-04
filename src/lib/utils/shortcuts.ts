import { setClickthrough, toggleOverlayWindow } from "$lib/api";
import { misc, settings } from "$lib/stores.svelte";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";

export type Shortcut = {
  name: string;
  action: () => void | Promise<void>;
};
export const shortcuts: Record<string, Shortcut> = {
  hideMeter: {
    name: "Hide Meter",
    action: () => toggleOverlayWindow()
  },
  disableClickthrough: {
    name: "Toggle Clickthrough",
    action: async () => {
      await setClickthrough(!misc.clickthrough);
      misc.clickthrough = !misc.clickthrough;
    }
  }
};

export async function registerShortcuts() {
  if (misc.modifyingShortcuts) return;
  try {
    await unregisterAll();
    for (const sc of Object.entries(shortcuts)) {
      const shortcut = settings.app.shortcuts[sc[0] as keyof typeof settings.app.shortcuts];
      if (shortcut) {
        await register(shortcut, (event) => {
          if (event.state === "Pressed") {
            sc[1].action();
          }
        });
      }
    }
  } catch (e) {
    console.warn("shortcut registration failed:", e);
  }
}
