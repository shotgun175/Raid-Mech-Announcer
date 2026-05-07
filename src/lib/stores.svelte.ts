import { browser } from "$app/environment";
import type { Update } from "@tauri-apps/plugin-updater";
import MarkdownIt from "markdown-it";
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

export const defaultSettings: AppSettings = {
  general: {
    showNames: true,
    showGearScore: true,
    hideNames: false,
    showEsther: true,
    hideLogo: false,
    showDate: true,
    showDifficulty: true,
    showGate: false,
    showDetails: false,
    showShields: true,
    showTanked: false,
    showBosses: false,
    showRaidsOnly: true,
    splitLines: true,
    underlineHovered: false,
    accentColor: "theme-violet",
    autoIface: true,
    port: 6040,
    blur: true,
    blurWin11: false,
    isWin11: false,
    transparent: true,
    scale: "1",
    logScale: "1",
    alwaysOnTop: true,
    bossOnlyDamage: true,
    keepFavorites: true,
    hideLogsOnStart: false,
    constantLocalPlayerColor: false,
    startOnBoot: false,
    hideMeterOnStart: false,
    logsPerPage: 10,
    experimentalFeatures: false,
    autoShow: false,
    autoHideDelay: 5,
    betaChannel: false
  },
  shortcuts: {
    hideMeter: "Control+ArrowDown",
    showLogs: "Control+ArrowUp",
    showLatestEncounter: "",
    resetSession: "",
    pauseSession: "",
    manualSave: "",
    disableClickthrough: ""
  },
  meter: {
    bossInfo: true,
    bossHpBar: true,
    splitBossHpBar: false,
    showTimeUntilKill: false,
    splitPartyBuffs: true,
    showClassColors: true,
    profileShortcut: false,
    damage: false,
    dps: true,
    unbuffedDamage: false,
    unbuffedDps: false,
    damagePercent: true,
    deathTime: false,
    incapacitatedTime: false,
    critRate: true,
    critDmg: false,
    frontAtk: true,
    backAtk: true,
    counters: false,
    pinSelfParty: false,
    positionalDmgPercent: true,
    percentBuffBySup: true,
    percentIdentityBySup: true,
    percentBrand: true,
    percentHatBySup: true,
    supportContrib: false,
    stagger: false,
    breakdown: {
      damage: true,
      dps: true,
      unbuffedDamage: false,
      unbuffedDps: false,
      damagePercent: true,
      critRate: true,
      critDmg: false,
      frontAtk: true,
      backAtk: true,
      avgDamage: false,
      maxDamage: true,
      casts: true,
      cpm: true,
      hits: false,
      hpm: false,
      percentBuffBySup: false,
      percentIdentityBySup: false,
      percentBrand: false,
      percentHatBySup: false,
      supportContrib: false
    }
  },
  logs: {
    abbreviateHeader: false,
    splitPartyDamage: true,
    splitPartyBuffs: true,
    profileShortcut: true,
    damage: true,
    dps: true,
    unbuffedDamage: true,
    unbuffedDps: true,
    damagePercent: true,
    deathTime: true,
    incapacitatedTime: true,
    critRate: true,
    critDmg: false,
    frontAtk: true,
    backAtk: true,
    counters: true,
    minEncounterDuration: 30,
    positionalDmgPercent: true,
    percentBuffBySup: true,
    percentIdentityBySup: true,
    percentHatBySup: true,
    percentBrand: true,
    supportContrib: true,
    stagger: true,
    breakdown: {
      damage: true,
      dps: true,
      unbuffedDamage: true,
      unbuffedDps: true,
      damagePercent: true,
      critRate: true,
      adjustedCritRate: true,
      critDmg: false,
      frontAtk: true,
      backAtk: true,
      avgDamage: true,
      maxDamage: true,
      casts: true,
      cpm: true,
      hits: true,
      hpm: true,
      percentBuffBySup: false,
      percentIdentityBySup: false,
      percentBrand: false,
      percentHatBySup: false,
      supportContrib: false
    }
  },
  buffs: {
    default: true
  }
};

class Misc {
  clickthrough = $state(false);
}

class UpdateInfo {
  available = $state(false);
  isBeta = $state(false);
  manifest: Update | { body?: string } | undefined = $state(undefined);
}

export const settings = new Settings();
export const misc = new Misc();
export const updateInfo = new UpdateInfo();

const md = new MarkdownIt({
  html: true
});

// Remember the old renderer if overridden, or proxy to the default renderer.
const defaultRender =
  md.renderer.rules.link_open ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  // Add a new `target` attribute, or replace the value of the existing one.
  tokens[idx].attrSet("target", "_blank");

  // Pass the token to the default renderer.
  return defaultRender(tokens, idx, options, env, self);
};

export const markdownIt = md;
