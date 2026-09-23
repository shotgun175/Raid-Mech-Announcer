import { toggleOverlayWindow } from "$lib/api";
import { settings } from "$lib/stores.svelte";
import { mechStore } from "$lib/mech-store.svelte";
import { emit } from "@tauri-apps/api/event";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";

export type Shortcut = {
  name: string;
  action: () => void | Promise<void>;
};
export const shortcuts: Record<string, Shortcut> = {
  hideOverlay: {
    name: "Hide Overlay",
    action: () => toggleOverlayWindow()
  }
};

// LOA Logs holds Ctrl+Up (Show Logs) by default. The old Hide Overlay default saved it as
// "Control+ArrowUp"; the Settings key recorder writes the same key as "Ctrl+ArrowUp".
const LOA_LOGS_SHOW_LOGS_KEYS = ["Control+ArrowUp", "Ctrl+ArrowUp"];

/** Red note shown under a hotkey that failed to register; names LOA Logs only for the key it holds. */
export function failedShortcutNote(key: string): string {
  const loaLogs = LOA_LOGS_SHOW_LOGS_KEYS.includes(key) ? " (LOA Logs uses Ctrl+Up for Show Logs by default)" : "";
  return `Couldn't register: another app is using this key${loaLogs}. Pick another.`;
}

// Single registration path for ALL global shortcuts. It begins with one unregisterAll(),
// so the confirm-pattern hotkey MUST be (re)registered here too — otherwise any
// registerShortcuts() call (app boot, leaving Settings, editing another shortcut) would
// silently strand it. The confirm hotkey lives in mechStore (MechSettings), not
// settings.app.shortcuts, so it's registered separately below. Its handler just emits
// mech:confirm; the overlay listens and resyncs the currently-active repeating mech.
export async function registerShortcuts() {
  settings.failedShortcuts = [];
  try {
    await unregisterAll();
    for (const sc of Object.entries(shortcuts)) {
      const shortcut = settings.app.shortcuts[sc[0] as keyof typeof settings.app.shortcuts];
      if (shortcut) {
        try {
          await register(shortcut, (event) => {
            if (event.state === "Pressed") {
              sc[1].action();
            }
          });
        } catch (e) {
          settings.failedShortcuts.push(shortcut);
          throw e;
        }
      }
    }
  } catch (e) {
    console.warn("shortcut registration failed:", e);
  }
  // Own try/catch so an app-shortcut failure (or a confirm-key OS conflict) can't take the other down.
  const confirmHotkey = mechStore.mechSettings.confirmHotkey;
  if (confirmHotkey) {
    try {
      await register(confirmHotkey, (event) => {
        if (event.state === "Pressed") emit("mech:confirm", null).catch(() => {});
      });
    } catch (e) {
      settings.failedShortcuts.push(confirmHotkey);
      console.warn("confirm hotkey registration failed:", e);
    }
  }
}
