import { emit } from "@tauri-apps/api/event";
import { buildDefaultRaids } from "./data/raid-library";
import type { BossStatusData, Gate, MechSettings } from "./mech-types";

async function broadcastBossStatus(payload: BossStatusData | null) {
  try {
    await emit("mech:boss-status", payload);
  } catch {}
}
async function broadcastOverlayControl(show: boolean) {
  try {
    await emit(show ? "mech:overlay-show" : "mech:overlay-hide", null);
  } catch {}
}
async function broadcastSettings(settings: MechSettings) {
  try {
    await emit("mech:settings-changed", settings);
  } catch {}
}

// Score-based boss matching: exact = 1.0, partial = overlap ratio, no match = 0.
// Picks the raid whose stored boss name most closely matches the live name,
// preventing short names like "Echidna" from matching long stored names like
// "Act 4: Covetous Master Echidna" over an exact-match entry.
function bestGateMatch(raids: Gate[], bossName: string): Gate | null {
  const live = bossName.toLowerCase().trim();
  let best: Gate | null = null;
  let bestScore = 0;
  for (const gate of raids) {
    const stored = gate.boss.split(",")[0].toLowerCase().trim();
    let score = 0;
    if (stored === live) {
      score = 1.0;
    } else if (stored.includes(live) || live.includes(stored)) {
      score = Math.min(stored.length, live.length) / Math.max(stored.length, live.length);
    }
    if (score > bestScore) {
      bestScore = score;
      best = gate;
    }
  }
  return bestScore > 0 ? best : null;
}

// Two-tier silence detection:
// - OVERLAY_HIDE_MS: hide the overlay and clear HP display (phase transition / stagger gap)
// - GATE_RESET_MS: full encounter reset — only after silence long enough to be a real wipe/clear
// Keeping liveGateId alive through short gaps prevents re-matching on mid-phase boss name changes.
const OVERLAY_HIDE_MS = 8_000;
const GATE_RESET_MS = 60_000;

let overlayHideTimer: ReturnType<typeof setTimeout> | null = null;
let gateResetTimer: ReturnType<typeof setTimeout> | null = null;

function startHeartbeat(onHide: () => void, onReset: () => void) {
  if (overlayHideTimer) clearTimeout(overlayHideTimer);
  if (gateResetTimer) clearTimeout(gateResetTimer);
  overlayHideTimer = setTimeout(onHide, OVERLAY_HIDE_MS);
  gateResetTimer = setTimeout(onReset, GATE_RESET_MS);
}

function stopHeartbeat() {
  if (overlayHideTimer) {
    clearTimeout(overlayHideTimer);
    overlayHideTimer = null;
  }
  if (gateResetTimer) {
    clearTimeout(gateResetTimer);
    gateResetTimer = null;
  }
}

const RAIDS_KEY = "mech-announcer-raids";
const SETTINGS_KEY = "mech-announcer-settings";

function loadRaids(): Gate[] {
  try {
    const raw = localStorage.getItem(RAIDS_KEY);
    return raw ? (JSON.parse(raw) as Gate[]) : buildDefaultRaids();
  } catch {
    return buildDefaultRaids();
  }
}

function loadSettings(): MechSettings {
  const defaults: MechSettings = {
    lead: 10,
    repeatLead: 5,
    vol: 80,
    pitch: 1,
    voice: "Andrew",
    confirmKey: "",
    overlayVariant: "combined",
    hook: "",
    opacity: 90,
    alwaysOnTop: true,
    clickThrough: false,
    autoShowHide: true,
    showPhaseLabels: true,
    showRepeatTicker: true
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
  // mechId → timestamp (ms) of the last user-confirmed fire for that mechanic
  let confirmedAt = $state<Record<string, number>>({});

  function saveRaids() {
    localStorage.setItem(RAIDS_KEY, JSON.stringify(raids));
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(mechSettings));
  }

  return {
    get raids() {
      return raids;
    },
    get selectedGateId() {
      return selectedGateId;
    },
    get liveGateId() {
      return liveGateId;
    },
    get liveBar() {
      return liveBar;
    },
    get liveTotalBars() {
      return liveTotalBars;
    },
    get liveBossName() {
      return liveBossName;
    },
    get isLive() {
      return liveBar !== null;
    },
    get mechSettings() {
      return mechSettings;
    },
    get confirmedAt() {
      return confirmedAt;
    },

    // Record that a repeating mechanic just visually fired — resets its cycle from now.
    confirmMech(mechId: string) {
      confirmedAt = { ...confirmedAt, [mechId]: Date.now() };
    },

    // Clear all confirmations (e.g. on encounter reset / gate change)
    clearConfirmed() {
      confirmedAt = {};
    },

    get selectedGate(): Gate | null {
      return raids.find((r) => r.id === selectedGateId) ?? raids[0] ?? null;
    },

    selectGate(id: string) {
      selectedGateId = id;
    },

    setLiveGate(id: string | null) {
      liveGateId = id;
    },

    upsertMechanic(gateId: string, mech: Gate["mechanics"][number]) {
      raids = raids.map((r) => {
        if (r.id !== gateId) return r;
        const exists = r.mechanics.some((m) => m.id === mech.id);
        return {
          ...r,
          mechanics: exists ? r.mechanics.map((m) => (m.id === mech.id ? mech : m)) : [...r.mechanics, mech]
        };
      });
      saveRaids();
    },

    deleteMechanic(gateId: string, mechId: string) {
      raids = raids.map((r) => (r.id !== gateId ? r : { ...r, mechanics: r.mechanics.filter((m) => m.id !== mechId) }));
      saveRaids();
    },

    addGate(gate: Gate) {
      raids = [...raids, gate];
      saveRaids();
    },

    removeGate(gateId: string) {
      raids = raids.filter((r) => r.id !== gateId);
      if (selectedGateId === gateId) selectedGateId = raids[0]?.id ?? "";
      saveRaids();
    },

    removeRaid(raidName: string) {
      const removedIds = new Set(raids.filter((r) => r.raid === raidName).map((r) => r.id));
      raids = raids.filter((r) => r.raid !== raidName);
      if (removedIds.has(selectedGateId)) selectedGateId = raids[0]?.id ?? "";
      saveRaids();
    },

    resetRaids() {
      const fresh = buildDefaultRaids();
      raids = fresh;
      selectedGateId = fresh[0]?.id ?? "";
      saveRaids();
    },

    updateSetting<K extends keyof MechSettings>(key: K, value: MechSettings[K]) {
      mechSettings = { ...mechSettings, [key]: value };
      saveSettings();
      broadcastSettings(mechSettings);
    },

    // Applied in the overlay window when it receives mech:settings-changed — no save/re-broadcast
    applyRemoteSettings(settings: MechSettings) {
      mechSettings = settings;
    },

    findBestGate(bossName: string): Gate | null {
      return bestGateMatch(raids, bossName);
    },

    reorderRaid(fromName: string, toName: string) {
      const names = Array.from(new Set(raids.map((r) => r.raid)));
      const fromIdx = names.indexOf(fromName);
      const toIdx = names.indexOf(toName);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
      const newNames = [...names];
      newNames.splice(fromIdx, 1);
      newNames.splice(toIdx, 0, fromName);
      raids = newNames.flatMap((n) => raids.filter((r) => r.raid === n));
      saveRaids();
    },

    setBossStatus(data: BossStatusData | null) {
      if (!data || data.isDead) {
        stopHeartbeat();
        liveBar = null;
        liveTotalBars = null;
        liveBossName = null;
        liveGateId = null;
        broadcastBossStatus(null);
        broadcastOverlayControl(false);
        return;
      }
      liveBar = data.currentBars;
      liveTotalBars = data.totalBars;
      liveBossName = data.name;

      // Only match on the first event of a new fight — once a gate is locked in,
      // keep it even if the boss name changes mid-phase (e.g. Echidna → Covetous Master Echidna).
      if (!liveGateId) {
        const matched = bestGateMatch(raids, data.name);
        if (matched) liveGateId = matched.id;
      }

      broadcastBossStatus({ ...data, gateId: liveGateId ?? null });
      broadcastOverlayControl(true);

      startHeartbeat(
        // Tier 1 (8s): hide overlay + clear HP display — covers phase transitions / stagger gaps.
        // liveGateId is kept so the sticky match survives the gap.
        () => {
          liveBar = null;
          liveTotalBars = null;
          liveBossName = null;
          broadcastBossStatus(null);
          broadcastOverlayControl(false);
        },
        // Tier 2 (60s): full reset — silence this long means a real wipe/clear/logout.
        () => {
          liveGateId = null;
        }
      );
    },

    moveRaidUp(raidName: string) {
      const names = Array.from(new Set(raids.map((r) => r.raid)));
      const idx = names.indexOf(raidName);
      if (idx <= 0) return;
      const swapWith = names[idx - 1];
      const reordered = [
        ...raids.filter((r) => r.raid !== raidName && r.raid !== swapWith),
        ...raids.filter((r) => r.raid === raidName),
        ...raids.filter((r) => r.raid === swapWith)
      ];
      raids = reordered;
      saveRaids();
    },

    moveRaidDown(raidName: string) {
      const names = Array.from(new Set(raids.map((r) => r.raid)));
      const idx = names.indexOf(raidName);
      if (idx < 0 || idx >= names.length - 1) return;
      const swapWith = names[idx + 1];
      const reordered = [
        ...raids.filter((r) => r.raid !== raidName && r.raid !== swapWith),
        ...raids.filter((r) => r.raid === swapWith),
        ...raids.filter((r) => r.raid === raidName)
      ];
      raids = reordered;
      saveRaids();
    }
  };
})();
