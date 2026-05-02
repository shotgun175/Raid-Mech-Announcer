import { SAMPLE_RAIDS } from "./mech-constants";
import type { BossStatusData, Gate, MechSettings } from "./mech-types";

const RAIDS_KEY = "mech-announcer-raids";
const SETTINGS_KEY = "mech-announcer-settings";

function loadRaids(): Gate[] {
  try {
    const raw = localStorage.getItem(RAIDS_KEY);
    return raw ? (JSON.parse(raw) as Gate[]) : SAMPLE_RAIDS;
  } catch {
    return SAMPLE_RAIDS;
  }
}

function loadSettings(): MechSettings {
  const defaults: MechSettings = {
    lead: 10, vol: 80, pitch: 1, hook: "",
    opacity: 90, alwaysOnTop: true, clickThrough: true,
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<MechSettings>) } : defaults;
  } catch {
    return defaults;
  }
}

export const mechStore = (() => {
  const initialRaids = loadRaids();
  let raids = $state<Gate[]>(initialRaids);
  let selectedGateId = $state<string>(initialRaids[0]?.id ?? "");
  let liveGateId = $state<string | null>(null);
  let liveBar = $state<number | null>(null);
  let liveTotalBars = $state<number | null>(null);
  let liveBossName = $state<string | null>(null);
  let mechSettings = $state<MechSettings>(loadSettings());

  function saveRaids() {
    localStorage.setItem(RAIDS_KEY, JSON.stringify(raids));
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(mechSettings));
  }

  return {
    get raids() { return raids; },
    get selectedGateId() { return selectedGateId; },
    get liveGateId() { return liveGateId; },
    get liveBar() { return liveBar; },
    get liveTotalBars() { return liveTotalBars; },
    get liveBossName() { return liveBossName; },
    get isLive() { return liveBar !== null; },
    get mechSettings() { return mechSettings; },

    get selectedGate(): Gate | null {
      return raids.find(r => r.id === selectedGateId) ?? raids[0] ?? null;
    },

    selectGate(id: string) {
      selectedGateId = id;
    },

    setLiveGate(id: string | null) {
      liveGateId = id;
    },

    upsertMechanic(gateId: string, mech: Gate["mechanics"][number]) {
      raids = raids.map(r => {
        if (r.id !== gateId) return r;
        const exists = r.mechanics.some(m => m.id === mech.id);
        return {
          ...r,
          mechanics: exists
            ? r.mechanics.map(m => m.id === mech.id ? mech : m)
            : [...r.mechanics, mech],
        };
      });
      saveRaids();
    },

    deleteMechanic(gateId: string, mechId: string) {
      raids = raids.map(r =>
        r.id !== gateId ? r : { ...r, mechanics: r.mechanics.filter(m => m.id !== mechId) }
      );
      saveRaids();
    },

    addGate(gate: Gate) {
      raids = [...raids, gate];
      saveRaids();
    },

    updateSetting<K extends keyof MechSettings>(key: K, value: MechSettings[K]) {
      mechSettings = { ...mechSettings, [key]: value };
      saveSettings();
    },

    setBossStatus(data: BossStatusData | null) {
      if (!data || data.isDead) {
        liveBar = null;
        liveTotalBars = null;
        liveBossName = null;
        liveGateId = null;
        return;
      }
      liveBar = data.currentBars;
      liveTotalBars = data.totalBars;
      liveBossName = data.name;

      // Auto-select matching gate by boss name substring match
      const bossLower = data.name.toLowerCase();
      const matched = raids.find(r => {
        const bossFirst = r.boss.split(",")[0].toLowerCase();
        return bossFirst.includes(bossLower) || bossLower.includes(bossFirst);
      });
      if (matched) {
        selectedGateId = matched.id;
        liveGateId = matched.id;
      }
    },
  };
})();
