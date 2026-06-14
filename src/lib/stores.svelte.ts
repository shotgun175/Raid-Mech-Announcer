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
  version = $state("");
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

      const updateVersion = async (newVersion: string | null) => {
        this.lockUpdate = true;
        if (newVersion) {
          this.version = newVersion;
        }
        this.lockUpdate = false;
      };

      updateSettings(localStorage.getItem("appSettings"), true);
      updateVersion(localStorage.getItem("version"));

      $effect.root(() => {
        $effect(() => {
          if (this.lockUpdate) return;
          localStorage.setItem("appSettings", JSON.stringify(this.app));
        });
        $effect(() => {
          if (this.lockUpdate) return;
          localStorage.setItem("version", this.version);
        });
      });

      window.addEventListener("storage", (e) => {
        if (this.lockUpdate) return;
        const { key, newValue, storageArea } = e;
        if (storageArea !== localStorage) return;
        if (key === "appSettings") updateSettings(newValue);
        else if (key === "version") updateVersion(newValue);
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
    logScale: "1",
    betaChannel: false
  },
  shortcuts: {
    hideOverlay: "Control+ArrowUp"
  }
};

class UpdateInfo {
  available = $state(false);
  manifest: Update | { body?: string } | undefined = $state(undefined);
}

export const settings = new Settings();
export const updateInfo = new UpdateInfo();

// Markdown rendering moved to $lib/markdown (pure module): markdownIt for
// bundled content, markdownItUntrusted for the updater's remote notes.
export { markdownIt, markdownItUntrusted } from "./markdown";
