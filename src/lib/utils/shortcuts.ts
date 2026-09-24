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

// Labels for the action names in LOA Logs' settings.json "shortcuts" block (snoww/loa-logs).
const LOA_LOGS_ACTION_LABELS: Record<string, string> = {
  hideMeter: "Hide Meter",
  showLogs: "Show Logs",
  showLatestEncounter: "Show Latest Encounter",
  resetSession: "Reset Session",
  pauseSession: "Pause Session",
  manualSave: "Manual Save",
  disableClickthrough: "Disable Clickthrough"
};

/** "Control+ArrowUp" (old default), "Ctrl+ArrowUp" (both apps' recorders) and "ctrl+arrowup" are one key. */
export function normalizeKey(key: string): string {
  return key
    .split("+")
    .map((part) => (part.toLowerCase() === "control" ? "ctrl" : part.toLowerCase()))
    .join("+");
}

/** Display label for a LOA Logs action name ("hideMeter" -> "Hide Meter"); unknown names are split on case. */
export function loaLogsActionLabel(action: string): string {
  const humanized = action.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
  return LOA_LOGS_ACTION_LABELS[action] ?? humanized;
}

/** LOA Logs' bound keys as [label, key] pairs in a stable order; unbound actions (empty keys) are dropped. */
export function loaLogsKeyList(bindings: Record<string, string>): [string, string][] {
  return Object.entries(bindings)
    .filter(([, key]) => !!key)
    .map(([action, key]): [string, string] => [loaLogsActionLabel(action), key])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

/** The LOA Logs action bound to `key` in its saved settings (see api.getLoaLogsShortcuts), or null. */
export function loaLogsActionFor(key: string, bindings: Record<string, string>): string | null {
  if (!key) return null;
  const wanted = normalizeKey(key);
  for (const [action, bound] of Object.entries(bindings)) {
    if (bound && normalizeKey(bound) === wanted) return loaLogsActionLabel(action);
  }
  return null;
}

/** Amber note under a key LOA Logs also has bound: it registered here, but start order decides who gets it. */
export function loaLogsConflictNote(key: string, bindings: Record<string, string>): string | null {
  const action = loaLogsActionFor(key, bindings);
  return action ? `LOA Logs has this key bound to ${action}. Whichever app starts first gets it. Pick another.` : null;
}

/** Amber note under every shortcut: the clash wording when `key` is one LOA Logs holds, otherwise a plain list of
 *  the keys LOA Logs currently has bound so the user can steer clear of them. Null when LOA Logs has none (or its
 *  settings could not be read). LOA Logs normally starts first, so this note, not the red one, is what users see. */
export function loaLogsKeysNote(key: string, bindings: Record<string, string>): string | null {
  const clash = loaLogsConflictNote(key, bindings);
  if (clash) return clash;
  const list = loaLogsKeyList(bindings);
  if (!list.length) return null;
  return `LOA Logs currently uses ${list.map(([label, bound]) => `${bound} (${label})`).join(", ")}.`;
}

/** Red note under a hotkey that failed to register. Names the LOA Logs action when its settings hold the key;
 *  without those settings it falls back to naming LOA Logs only for its Ctrl+Up default. */
export function failedShortcutNote(key: string, bindings: Record<string, string> = {}): string {
  const action = loaLogsActionFor(key, bindings);
  if (action) return `Couldn't register: LOA Logs is using this key for ${action}. Pick another.`;
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
