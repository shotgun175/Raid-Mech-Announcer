import { emit } from "@tauri-apps/api/event";
import { buildDefaultRaids, buildLibraryGate, LIBRARY } from "./data/raid-library";
import type { BossStatusData, Gate, MechSettings } from "./mech-types";

// Fire-and-forget log into the in-app debug strip. Works from any window via
// the main window's "tts:debug" listener in (app)/+layout.svelte.
const dbg = (msg: string) => emit("tts:debug", msg).catch(() => {});

async function broadcastBossStatus(payload: BossStatusData | null) {
  try {
    await emit("mech:boss-status", payload);
  } catch {}
}
async function broadcastOverlayControl(show: boolean) {
  dbg(`[overlay] broadcast ${show ? "show" : "hide"}`);
  try {
    await emit(show ? "mech:overlay-show" : "mech:overlay-hide", null);
  } catch {}
}
async function broadcastSettings(settings: MechSettings) {
  dbg(`[sync] broadcast settings → variant=${settings.overlayVariant} clickThrough=${settings.clickThrough}`);
  try {
    await emit("mech:settings-changed", settings);
  } catch {}
}
async function broadcastRaids(payload: Gate[]) {
  dbg(`[sync] broadcast raids → ${payload.length} gate(s)`);
  try {
    await emit("mech:raids-changed", payload);
  } catch {}
}
async function broadcastDifficultyMap(map: Record<string, string>) {
  dbg(`[sync] broadcast difficulty map → ${JSON.stringify(map)}`);
  try {
    await emit("mech:difficulty-changed", map);
  } catch {}
}

const DIFFICULTY_KEY = "mech-difficulty-map";

function loadDifficultyMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DIFFICULTY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}
async function broadcastFightStart() {
  dbg(`[fight] start → broadcast mech:fight-start`);
  try {
    await emit("mech:fight-start", null);
  } catch {}
}

// Score-based boss matching: exact = 1.0, partial = overlap ratio, no match = 0.
// Minimum threshold of 0.25 prevents short names like "Echidna" from weakly
// matching unrelated long names like "Act 4: Covetous Master Echidna" (score ~0.23)
// while still allowing phase-name variants like "Desire in Full Bloom, Echidna"
// to match the "Echidna" gate (score ~0.24 — just above the cutoff).
const MATCH_THRESHOLD = 0.24;
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
  return bestScore >= MATCH_THRESHOLD ? best : null;
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
    ttsRate: 1.0,
    voice: "Andrew",
    confirmHotkey: "F9",
    overlayVariant: "standard",
    hook: "",
    opacity: 90,
    alwaysOnTop: true,
    clickThrough: false,
    autoShowHide: false,
    showPhaseLabels: true,
    showRepeatTicker: true
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const stored = JSON.parse(raw) as Partial<MechSettings> & { pitch?: number; confirmKey?: string };
    delete stored.pitch; // legacy: TTS pitch was a no-op control, removed
    delete stored.confirmKey; // legacy: renamed to confirmHotkey + reset to F9 default
    return { ...defaults, ...stored };
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
  let difficultyMap = $state<Record<string, string>>(loadDifficultyMap());

  function saveRaids() {
    localStorage.setItem(RAIDS_KEY, JSON.stringify(raids));
    broadcastRaids(raids);
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

    resetGate(gateId: string) {
      const gate = raids.find((r) => r.id === gateId);
      if (!gate) return;
      const entry = LIBRARY.find((e) => e.raid === gate.raid && e.gate === gate.gate);
      if (!entry) return; // custom gate — no library version, no-op
      const fresh = buildLibraryGate(entry);
      raids = raids.map((r) => (r.id === gateId ? { ...fresh, id: r.id } : r));
      saveRaids();
    },

    resetRaid(raidName: string) {
      raids = raids.map((r) => {
        if (r.raid !== raidName) return r;
        const entry = LIBRARY.find((e) => e.raid === r.raid && e.gate === r.gate);
        if (!entry) return r; // custom gate — preserve as-is
        return { ...buildLibraryGate(entry), id: r.id };
      });
      saveRaids();
    },

    updateSetting<K extends keyof MechSettings>(key: K, value: MechSettings[K]) {
      mechSettings = { ...mechSettings, [key]: value };
      saveSettings();
      broadcastSettings(mechSettings);
    },

    // Applied in the overlay window when it receives mech:settings-changed — no save/re-broadcast
    applyRemoteSettings(settings: MechSettings) {
      dbg(`[sync] received settings → variant=${settings.overlayVariant} clickThrough=${settings.clickThrough}`);
      mechSettings = settings;
    },

    // Applied in the overlay window when it receives mech:raids-changed — no save/re-broadcast
    applyRemoteRaids(updated: Gate[]) {
      dbg(`[sync] received raids → ${updated.length} gate(s)`);
      raids = updated;
    },

    get difficultyMap() {
      return difficultyMap;
    },

    setDifficulty(raidName: string, difficulty: string | null) {
      const prev = difficultyMap[raidName] ?? "All";
      dbg(`[difficulty] ${raidName}: "${prev}" → "${difficulty ?? "All"}"`);
      if (!difficulty) {
        const { [raidName]: _, ...rest } = difficultyMap;
        difficultyMap = rest;
      } else {
        difficultyMap = { ...difficultyMap, [raidName]: difficulty };
      }
      localStorage.setItem(DIFFICULTY_KEY, JSON.stringify(difficultyMap));
      broadcastDifficultyMap(difficultyMap);
    },

    applyRemoteDifficultyMap(map: Record<string, string>) {
      dbg(`[sync] received difficulty map → ${JSON.stringify(map)}`);
      difficultyMap = map;
    },

    findBestGate(bossName: string): Gate | null {
      return bestGateMatch(raids, bossName);
    },

    setBossStatus(data: BossStatusData | null) {
      // Tier 1 (8s): hide overlay + clear HP display — covers phase transitions / stagger gaps.
      // liveGateId is kept so the sticky match survives the gap.
      const onTier1Timeout = () => {
        dbg(`[fight] tier-1 timeout (8s) → hide overlay + clear HP (gateId kept)`);
        liveBar = null;
        liveTotalBars = null;
        liveBossName = null;
        broadcastBossStatus(null);
        if (mechSettings.autoShowHide) broadcastOverlayControl(false);
      };
      // Tier 2 (60s): full reset — silence this long means a real wipe/clear/logout.
      const onTier2Timeout = () => {
        dbg(`[fight] tier-2 timeout (60s) → liveGateId cleared`);
        liveGateId = null;
      };

      if (!data || data.isDead) {
        // If a gate is already locked in, ignore isDead events from unrelated bosses
        // (e.g. Alcaone dying during Echidna G2 stagger). Only process if the dying boss
        // matches the active gate, or if no gate is locked yet.
        if (liveGateId && data?.isDead) {
          const matchedGate = bestGateMatch(raids, data.name ?? "");
          if (!matchedGate || matchedGate.id !== liveGateId) {
            dbg(`[gate] ignored isDead from unrelated boss "${data.name}" (live gate stays)`);
            // Packets are still flowing → fight is alive (e.g. Aegir's Heart-DPS phase
            // where Pulsating Giant's Heart reports HP while Aegir is silent).
            // Push both heartbeats out so the overlay doesn't flicker.
            startHeartbeat(onTier1Timeout, onTier2Timeout);
            return;
          }
        }
        dbg(`[fight] end → boss "${data?.name ?? "null"}" cleared (gateId kept for 60s)`);
        liveBar = null;
        liveTotalBars = null;
        liveBossName = null;
        broadcastBossStatus(null);
        if (mechSettings.autoShowHide) broadcastOverlayControl(false);
        // Keep liveGateId — phase transitions send isDead=true but the fight continues.
        // The 60s tier-2 timer clears liveGateId if no HP data resumes.
        if (gateResetTimer) clearTimeout(gateResetTimer);
        gateResetTimer = setTimeout(onTier2Timeout, GATE_RESET_MS);
        return;
      }
      liveBar = data.currentBars;
      liveTotalBars = data.totalBars;
      liveBossName = data.name;

      // Only match on the first event of a new fight — once a gate is locked in,
      // keep it even if the boss name changes mid-phase (e.g. Echidna → Covetous Master Echidna).
      if (!liveGateId) {
        const matched = bestGateMatch(raids, data.name);
        if (matched) {
          liveGateId = matched.id;
          dbg(`[gate] matched boss "${data.name}" → ${matched.raid} G${matched.gate} (${matched.id})`);
          broadcastFightStart();
        } else {
          dbg(`[gate] NO MATCH for boss "${data.name}" — overlay won't fire mechs`);
        }
      }

      broadcastBossStatus({ ...data, gateId: liveGateId ?? null });
      if (mechSettings.autoShowHide) broadcastOverlayControl(true);

      startHeartbeat(onTier1Timeout, onTier2Timeout);
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
