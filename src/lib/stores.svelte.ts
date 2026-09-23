import { browser } from "$app/environment";
import type { Update } from "@tauri-apps/plugin-updater";
import type { AppSettings } from "./settings";
import { saveSettings } from "./api";

const mergeSettings = (defaultSettings: any, storageSettings: any) => {
  for (const key of Object.keys(storageSettings)) {
    if (key in defaultSettings) {
      if (typeof storageSettings[key] === "object" && storageSettings[key] !== null) {
        mergeSettings(defaultSettings[key], storageSettings[key]);
      } else {
        defaultSettings[key] = storageSettings[key];
      }
    }
  }
};

class Settings {
  app = $state(defaultSettings);
  // Keys the OS refused at the last registerShortcuts() (another app holds them). Not persisted.
  failedShortcuts: string[] = $state([]);
  lockUpdate = false;

  constructor() {
    if (!browser) return;

    if (localStorage) {
      const updateSettings = (settings: string | null, init = false) => {
        this.lockUpdate = true;
        if (settings) {
          try {
            const settingsFromStorage = JSON.parse(settings) as AppSettings;
            mergeSettings(this.app, settingsFromStorage);
            if (!init) {
              saveSettings(this.app);
            }
          } catch (e) {
            console.error(e);
          }
        }
        this.lockUpdate = false;
      };

      updateSettings(localStorage.getItem("appSettings"), true);

      $effect.root(() => {
        $effect(() => {
          if (this.lockUpdate) return;
          localStorage.setItem("appSettings", JSON.stringify(this.app));
        });
      });

      window.addEventListener("storage", (e) => {
        if (this.lockUpdate) return;
        const { key, newValue, storageArea } = e;
        if (storageArea !== localStorage) return;
        if (key === "appSettings") updateSettings(newValue);
      });
    } else {
      console.warn("localStorage not available?");
    }
  }
}

const defaultSettings: AppSettings = {
  general: {
    accentColor: "theme-violet",
    scale: "1",
    logScale: "1"
  },
  shortcuts: {
    hideOverlay: "Control+Shift+ArrowUp"
  }
};

class UpdateInfo {
  available = $state(false);
  manifest: Update | { body?: string } | undefined = $state(undefined);
}

export const settings = new Settings();
export const updateInfo = new UpdateInfo();
