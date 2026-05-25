import { emit } from "@tauri-apps/api/event";
import { buildDefaultRaids, buildLibraryGate, LIBRARY } from "./data/raid-library";
import type { BossStatusData, Difficulty, Gate, MechSettings } from "./mech-types";
import { filterByDifficulty } from "./utils/difficulty";

// Fire-and-forget log into the in-app debug strip. Works from any window via
// the main window's "tts:debug" listener in (app)/+layout.svelte.
const dbg = (msg: string) => emit("tts:debug", msg).catch(() => {});

async function broadcastBossStatus(payload: BossStatusData | null) {
  try {
    await emit("mech:boss-status", payload);
  } catch {}
}
// Tells the overlay to drop per-fight state (gate id, fired-mech keys, repeat timer).
// Fired alongside broadcastBossStatus(null) on any path that clears liveGateId.
async function broadcastEncounterEnd() {
  try {
    await emit("mech:encounter-end", null);
  } catch {}
}
async function broadcastOverlayControl(show: boolean) {
  dbg(`[overlay] broadcast ${show ? "show" : "hide"}`);
  try {
    await emit(show ? "mech:overlay-show" : "mech:overlay-hide", null);
  } catch {}
}
// Tells the overlay to stop showing the "phase transition…" placeholder after prolonged
// silence, WITHOUT tearing down per-fight state (gate id, fired keys). HP resuming before
// GATE_RESET_MS restores the live display cleanly. broadcastEncounterEnd is the full teardown.
async function broadcastOverlayQuiet() {
  try {
    await emit("mech:overlay-quiet", null);
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

// Three-tier silence detection (no instant wipe signal exists — on a wipe the boss stays
// alive and simply stops sending HP, so end-of-fight is inferred from silence):
// - OVERLAY_HIDE_MS (8s): clear HP display; the overlay keeps showing a "phase transition…"
//   placeholder via the preserved gateId (covers brief stagger / transition gaps).
// - PLACEHOLDER_HIDE_MS (20s): hide that placeholder (and, with autoShowHide, the window) via
//   mech:overlay-quiet, but KEEP liveGateId + fired-mech keys so HP resuming before 60s picks
//   up without a re-match / re-fire. Stops a wipe sitting on "phase transition…" for the full 60s.
// - GATE_RESET_MS (60s): full encounter reset — safety net for when isDead/loa:fight-end never fire.
// Keeping liveGateId alive through short gaps prevents re-matching on mid-phase boss name changes.
const OVERLAY_HIDE_MS = 8_000;
const PLACEHOLDER_HIDE_MS = 20_000;
const GATE_RESET_MS = 60_000;

// Shown in the overlay's primary slot once every mech in the live gate has fired and the
// fight is still going (execute phase). One line is picked per fight; cleared on encounter end.
const ENCOURAGE_POOL = [
  "Push! Kill the boss.",
  "Burn it down.",
  "Execute phase, go go go!",
  "Finish it!",
  "Hit it 'til it dies."
];

let overlayHideTimer: ReturnType<typeof setTimeout> | null = null;
let placeholderQuietTimer: ReturnType<typeof setTimeout> | null = null;
let gateResetTimer: ReturnType<typeof setTimeout> | null = null;

function startHeartbeat(onHide: () => void, onQuiet: () => void, onReset: () => void) {
  if (overlayHideTimer) clearTimeout(overlayHideTimer);
  if (placeholderQuietTimer) clearTimeout(placeholderQuietTimer);
  if (gateResetTimer) clearTimeout(gateResetTimer);
  overlayHideTimer = setTimeout(onHide, OVERLAY_HIDE_MS);
  placeholderQuietTimer = setTimeout(onQuiet, PLACEHOLDER_HIDE_MS);
  gateResetTimer = setTimeout(onReset, GATE_RESET_MS);
}

function stopHeartbeat() {
  if (overlayHideTimer) {
    clearTimeout(overlayHideTimer);
    overlayHideTimer = null;
  }
  if (placeholderQuietTimer) {
    clearTimeout(placeholderQuietTimer);
    placeholderQuietTimer = null;
  }
  if (gateResetTimer) {
    clearTimeout(gateResetTimer);
    gateResetTimer = null;
  }
}

const RAIDS_KEY = "mech-announcer-raids";
const SETTINGS_KEY = "mech-announcer-settings";
const CHANGED_GATES_KEY = "mech-announcer-changed-gates";
const CHANGED_MECHS_KEY = "mech-announcer-changed-mechs";

function loadRaids(): Gate[] {
  try {
    const raw = localStorage.getItem(RAIDS_KEY);
    return raw ? (JSON.parse(raw) as Gate[]) : buildDefaultRaids();
  } catch {
    return buildDefaultRaids();
  }
}

function loadChangedGateIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CHANGED_GATES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function saveChangedGateIds(s: Set<string>) {
  try {
    localStorage.setItem(CHANGED_GATES_KEY, JSON.stringify([...s]));
  } catch {}
}

function loadChangedMechIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CHANGED_MECHS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function saveChangedMechIds(s: Set<string>) {
  try {
    localStorage.setItem(CHANGED_MECHS_KEY, JSON.stringify([...s]));
  } catch {}
}

function loadSettings(): MechSettings {
  const defaults: MechSettings = {
    lead: 10,
    repeatLead: 5,
    vol: 80,
    ttsRate: 1.0,
    voice: "Andrew",
    announcementsEnabled: true,
    webhookEnabled: true,
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
  // Set once per fight when every mech has fired and HP is still ticking down.
  let liveEncourageMessage = $state<string | null>(null);
  // Gates that received library updates in the last reconciliation pass, surfaced
  // as a small dot in the sidebar. Persists across app restarts until user opens
  // that gate. Cleared by selectGate.
  let changedGateIds = $state<Set<string>>(loadChangedGateIds());
  let changedMechIds = $state<Set<string>>(loadChangedMechIds());

  // Recompute the "all mechs past" state for a given (gate, currentBars) pair.
  // Called both from the live path (setBossStatus) and from the Overlay Preview panel.
  // Picks one line from the pool on transition INTO the empty-upcoming state and
  // clears on transition OUT, so dragging the preview slider back and forth doesn't
  // strand a stale message.
  function recomputeEncourage(currentBars: number | null, gateId: string | null) {
    if (gateId == null || currentBars == null || currentBars <= 0) {
      if (liveEncourageMessage != null) liveEncourageMessage = null;
      return;
    }
    const gate = raids.find((r) => r.id === gateId);
    const activeDifficulty = gate ? ((difficultyMap[gate.raid] as Difficulty | undefined) ?? null) : null;
    const mechs = gate ? filterByDifficulty(gate.mechanics, activeDifficulty) : [];
    const hasMechs = mechs.some((m) => m.hpBar != null);
    const anyUpcoming = mechs.some((m) => m.hpBar != null && (m.hpBar ?? 0) <= currentBars);
    if (hasMechs && !anyUpcoming) {
      if (liveEncourageMessage == null) {
        liveEncourageMessage = ENCOURAGE_POOL[Math.floor(Math.random() * ENCOURAGE_POOL.length)];
        dbg(`[overlay] encouragement → "${liveEncourageMessage}"`);
      }
    } else if (liveEncourageMessage != null) {
      liveEncourageMessage = null;
    }
  }

  function saveRaids() {
    localStorage.setItem(RAIDS_KEY, JSON.stringify(raids));
    broadcastRaids(raids);
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(mechSettings));
  }

  // Internal: prune changedMechIds for mechs that no longer exist (called after
  // gate/raid rebuilds, where buildLibraryGate stamps fresh mech ids and the old
  // ids in changedMechIds become orphaned).
  function pruneChangedMechIdsAgainst(remainingMechIds: Set<string>) {
    let dirty = false;
    const next = new Set<string>();
    for (const id of changedMechIds) {
      if (remainingMechIds.has(id)) next.add(id);
      else dirty = true;
    }
    if (dirty) {
      changedMechIds = next;
      saveChangedMechIds(changedMechIds);
    }
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
    get liveEncourageMessage() {
      return liveEncourageMessage;
    },
    get changedGateIds() {
      return changedGateIds;
    },
    get changedMechIds() {
      return changedMechIds;
    },

    // Clears the per-mech update dot. Fires when the user clicks anywhere
    // on the affected mech row (acknowledged-by-interaction). The gate-level
    // dot already cleared on selectGate; this is the finer signal.
    clearChangedMech(mechId: string) {
      if (!changedMechIds.has(mechId)) return;
      const next = new Set(changedMechIds);
      next.delete(mechId);
      changedMechIds = next;
      saveChangedMechIds(changedMechIds);
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
      if (changedGateIds.has(id)) {
        const next = new Set(changedGateIds);
        next.delete(id);
        changedGateIds = next;
        saveChangedGateIds(changedGateIds);
      }
    },

    // Applied once on app startup after reconcile() against the bundled library.
    // Merges newChangedGateIds / newChangedMechIds with any pre-existing badges
    // from a prior session that the user hasn't opened yet.
    applyReconciledRaids(nextRaids: Gate[], newChangedGateIds: Set<string>, newChangedMechIds: Set<string>) {
      raids = nextRaids;
      saveRaids();
      if (newChangedGateIds.size > 0) {
        const merged = new Set([...changedGateIds, ...newChangedGateIds]);
        changedGateIds = merged;
        saveChangedGateIds(changedGateIds);
      }
      if (newChangedMechIds.size > 0) {
        const merged = new Set([...changedMechIds, ...newChangedMechIds]);
        changedMechIds = merged;
        saveChangedMechIds(changedMechIds);
      }
    },

    setLiveGate(id: string | null) {
      liveGateId = id;
    },

    // Authoritative encounter-end signal (driven by LOA Logs' "saving to db" log line).
    // Clears the sticky gate so the next fight re-matches immediately. Also broadcasts
    // encounter-end + hides the overlay (autoShowHide-gated) so post-fight auto-hide
    // happens once, here — never in the middle of a fight from a heartbeat timeout.
    endEncounter() {
      if (liveGateId == null) return;
      dbg(`[fight] loa fight-end → liveGateId cleared`);
      liveBar = null;
      liveTotalBars = null;
      liveBossName = null;
      liveGateId = null;
      liveEncourageMessage = null;
      stopHeartbeat();
      broadcastBossStatus(null);
      broadcastEncounterEnd();
      if (mechSettings.autoShowHide) broadcastOverlayControl(false);
    },

    upsertMechanic(gateId: string, mech: Gate["mechanics"][number]) {
      raids = raids.map((r) => {
        if (r.id !== gateId) return r;
        const existing = r.mechanics.find((m) => m.id === mech.id);
        // Editing a library-origin mech flips userEdited so reconciliation
        // doesn't overwrite the user's change on next app start. New mechs and
        // custom-origin edits pass through unchanged (MechModal already stamps
        // new mechs as origin:custom, userEdited:true).
        const next: Gate["mechanics"][number] =
          existing && existing.origin === "library"
            ? { ...mech, key: existing.key, origin: "library", userEdited: true }
            : mech;
        const nextMechanics = existing ? r.mechanics.map((m) => (m.id === mech.id ? next : m)) : [...r.mechanics, next];
        // Guardrail: if any mechanic's hpBar exceeds the gate's totalBars, bump
        // totalBars to (max hpBar) + 30 so the mech can actually trigger during
        // a fight (bosses start at totalBars; an out-of-range mech would never fire).
        // +30 leaves headroom so the highest-threshold mech still has visible runway.
        const maxHpBar = nextMechanics.reduce((m, x) => Math.max(m, x.hpBar ?? 0), 0);
        const nextTotalBars = maxHpBar > r.totalBars ? maxHpBar + 30 : r.totalBars;
        return { ...r, mechanics: nextMechanics, totalBars: nextTotalBars };
      });
      saveRaids();
    },

    deleteMechanic(gateId: string, mechId: string) {
      raids = raids.map((r) => {
        if (r.id !== gateId) return r;
        const target = r.mechanics.find((m) => m.id === mechId);
        const nextMechanics = r.mechanics.filter((m) => m.id !== mechId);
        // Deleting a library mech adds its key to deletedLibraryKeys so the
        // next reconciliation doesn't zombie-add it back. Custom-mech deletes
        // need no tracking — they have no library entry to be re-added from.
        if (target && target.origin === "library" && target.key) {
          const existing = r.deletedLibraryKeys ?? [];
          const nextDeleted = existing.includes(target.key) ? existing : [...existing, target.key];
          return { ...r, mechanics: nextMechanics, deletedLibraryKeys: nextDeleted };
        }
        return { ...r, mechanics: nextMechanics };
      });
      saveRaids();
    },

    // Reverts a single user-edited library mech back to the library version.
    // Wired to the "↺" button on each mech row in the editor. Does NOT touch
    // deletedLibraryKeys (per-mech reset is scoped to one mech only).
    resetMechToLibraryDefault(gateId: string, mechId: string) {
      const gate = raids.find((r) => r.id === gateId);
      if (!gate) return;
      const userMech = gate.mechanics.find((m) => m.id === mechId);
      if (!userMech || userMech.origin !== "library" || !userMech.key) return;
      const libEntry = LIBRARY.find((e) => e.raid === gate.raid && e.gate === gate.gate);
      if (!libEntry) return;
      const libMech = libEntry.mechanics.find((m) => m.key === userMech.key);
      if (!libMech) return;
      const restored: Gate["mechanics"][number] = {
        ...userMech,
        name: libMech.name,
        severity: libMech.severity,
        hpBar: libMech.hpBar ?? null,
        timerSecs: libMech.timerSecs ?? null,
        phase: null,
        repeatSecs: libMech.repeatSecs ?? null,
        triggerType: libMech.triggerType,
        ttsEnabled: true,
        ttsText: libMech.name,
        notes: libMech.notes ?? "",
        difficulties: libMech.difficulties?.length ? libMech.difficulties : undefined,
        userEdited: false
      };
      raids = raids.map((r) =>
        r.id !== gateId ? r : { ...r, mechanics: r.mechanics.map((m) => (m.id === mechId ? restored : m)) }
      );
      saveRaids();
      if (changedMechIds.has(mechId)) {
        const next = new Set(changedMechIds);
        next.delete(mechId);
        changedMechIds = next;
        saveChangedMechIds(changedMechIds);
      }
    },

    addGate(gate: Gate) {
      raids = [...raids, gate];
      saveRaids();
    },

    // Patch-update an existing gate's metadata. The gate's id and mechanics
    // are preserved; everything in the patch overwrites. Caller is responsible
    // for ensuring raid+gate moves don't collide with other user gates or
    // library slots (the Edit Gate UI enforces both).
    updateGate(
      gateId: string,
      patch: Partial<
        Pick<
          Gate,
          "raid" | "gate" | "boss" | "bossType" | "weakness" | "totalBars" | "tauntable" | "availableDifficulties"
        >
      >
    ) {
      raids = raids.map((r) => (r.id === gateId ? { ...r, ...patch } : r));
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
      // All previous mech IDs are now stale (buildDefaultRaids stamps fresh ids).
      if (changedMechIds.size > 0) {
        changedMechIds = new Set();
        saveChangedMechIds(changedMechIds);
      }
    },

    resetGate(gateId: string) {
      const gate = raids.find((r) => r.id === gateId);
      if (!gate) return;
      const entry = LIBRARY.find((e) => e.raid === gate.raid && e.gate === gate.gate);
      if (!entry) return; // custom gate — no library version, no-op
      const fresh = buildLibraryGate(entry);
      raids = raids.map((r) => (r.id === gateId ? { ...fresh, id: r.id, deletedLibraryKeys: undefined } : r));
      saveRaids();
      pruneChangedMechIdsAgainst(new Set(raids.flatMap((r) => r.mechanics.map((m) => m.id))));
    },

    resetRaid(raidName: string) {
      // Step 1: reset existing user gates under this raid name to their
      // library version (custom gates under this raid name with no library
      // match are preserved as user additions).
      raids = raids.map((r) => {
        if (r.raid !== raidName) return r;
        const entry = LIBRARY.find((e) => e.raid === r.raid && e.gate === r.gate);
        if (!entry) return r;
        return { ...buildLibraryGate(entry), id: r.id, deletedLibraryKeys: undefined };
      });
      // Step 2: add back any library gates that aren't currently in the user's
      // data for this raid (covers gates the user previously deleted or moved
      // out to a custom raid via the Edit Gate flow). Moved gates keep their
      // new home and identity; the re-added gate gets a fresh id from
      // buildLibraryGate so it's a clean library copy with no stale state.
      const present = new Set(raids.filter((r) => r.raid === raidName).map((r) => r.gate));
      const missing = LIBRARY.filter((e) => e.raid === raidName && !present.has(e.gate));
      if (missing.length > 0) raids = [...raids, ...missing.map(buildLibraryGate)];
      saveRaids();
      pruneChangedMechIdsAgainst(new Set(raids.flatMap((r) => r.mechanics.map((m) => m.id))));
    },

    // "Keep custom mechs" variant of resetGate: rebuilds library mechs from the
    // current library but appends any origin:"custom" mechs from the existing
    // gate. Clears deletedLibraryKeys for a clean library restore.
    resetGatePreservingCustoms(gateId: string) {
      const gate = raids.find((r) => r.id === gateId);
      if (!gate) return;
      const entry = LIBRARY.find((e) => e.raid === gate.raid && e.gate === gate.gate);
      if (!entry) return;
      const fresh = buildLibraryGate(entry);
      const customs = gate.mechanics.filter((m) => m.origin === "custom");
      raids = raids.map((r) =>
        r.id === gateId
          ? { ...fresh, id: r.id, mechanics: [...fresh.mechanics, ...customs], deletedLibraryKeys: undefined }
          : r
      );
      saveRaids();
      pruneChangedMechIdsAgainst(new Set(raids.flatMap((r) => r.mechanics.map((m) => m.id))));
    },

    resetRaidPreservingCustoms(raidName: string) {
      // Step 1: rebuild existing user gates with library mechs + their own custom mechs.
      raids = raids.map((r) => {
        if (r.raid !== raidName) return r;
        const entry = LIBRARY.find((e) => e.raid === r.raid && e.gate === r.gate);
        if (!entry) return r;
        const fresh = buildLibraryGate(entry);
        const customs = r.mechanics.filter((m) => m.origin === "custom");
        return { ...fresh, id: r.id, mechanics: [...fresh.mechanics, ...customs], deletedLibraryKeys: undefined };
      });
      // Step 2: add back any library gates missing from the user's data for this
      // raid (deleted or moved). Newly re-added gates start with library mechs
      // only — nothing to preserve since they weren't in the user's data.
      const present = new Set(raids.filter((r) => r.raid === raidName).map((r) => r.gate));
      const missing = LIBRARY.filter((e) => e.raid === raidName && !present.has(e.gate));
      if (missing.length > 0) raids = [...raids, ...missing.map(buildLibraryGate)];
      saveRaids();
      pruneChangedMechIdsAgainst(new Set(raids.flatMap((r) => r.mechanics.map((m) => m.id))));
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

    // Applied in the overlay window when a mech:boss-status payload carries the
    // encouragement line chosen by the main window — bypasses local recompute so
    // both windows display the same message.
    applyRemoteEncourageMessage(msg: string | null) {
      liveEncourageMessage = msg;
    },

    findBestGate(bossName: string): Gate | null {
      return bestGateMatch(raids, bossName);
    },

    setBossStatus(data: BossStatusData | null) {
      // Tier 1 (8s): clear HP display only — covers brief phase silences (e.g. Aegir's
      // Heart-DPS phase, Echidna phase transitions). The overlay window STAYS visible
      // and renders a "Phase transition…" placeholder using the preserved gateId; we
      // never auto-hide mid-fight because the gate is still active.
      const onTier1Timeout = () => {
        dbg(`[fight] tier-1 timeout (8s) → clear HP display (gate stays, overlay stays visible)`);
        liveBar = null;
        liveTotalBars = null;
        liveBossName = null;
        broadcastBossStatus(null);
      };
      // Tier 2 (60s): safety net for the case where isDead never fires (LOA disconnects,
      // packet loss). Treats prolonged silence as a true encounter end: clears the gate,
      // broadcasts encounter-end, and hides the overlay (autoShowHide-gated).
      const onTier2Timeout = () => {
        dbg(`[fight] tier-2 timeout (60s) → encounter ended (gate cleared, overlay hidden)`);
        liveGateId = null;
        liveEncourageMessage = null;
        broadcastEncounterEnd();
        if (mechSettings.autoShowHide) broadcastOverlayControl(false);
      };
      // Middle stage (20s): prolonged silence — drop the "phase transition…" placeholder so a
      // wipe doesn't sit on it for the full 60s, but keep liveGateId + fired keys so a genuine
      // long transition that resumes HP before 60s picks up without re-matching or re-firing.
      const onPlaceholderQuiet = () => {
        dbg(`[fight] silence (20s) → hide placeholder (gate + mech state kept)`);
        broadcastOverlayQuiet();
        if (mechSettings.autoShowHide) broadcastOverlayControl(false);
      };

      if (!data || data.isDead) {
        // If a gate is already locked in, ignore isDead events from unrelated bosses
        // (e.g. Alcaone dying during Echidna G2 stagger, or the Heart during Aegir's
        // Heart-DPS phase). Push both heartbeats out so the overlay doesn't flicker.
        if (liveGateId && data?.isDead) {
          const matchedGate = bestGateMatch(raids, data.name ?? "");
          if (!matchedGate || matchedGate.id !== liveGateId) {
            dbg(`[gate] ignored isDead from unrelated boss "${data.name}" (live gate stays)`);
            startHeartbeat(onTier1Timeout, onPlaceholderQuiet, onTier2Timeout);
            return;
          }
        }
        // Either PeerJS dropped (data is null) or the active gate's boss died. Treat as
        // a real encounter end: clear gate immediately so the next HP event re-matches
        // fresh (handles G1→G2 transitions and same-gate repulls). The live-data flip
        // block below is the safety net for cases where isDead never fires.
        dbg(`[fight] end → boss "${data?.name ?? "null"}" cleared (gate cleared, overlay hidden)`);
        liveBar = null;
        liveTotalBars = null;
        liveBossName = null;
        liveGateId = null;
        liveEncourageMessage = null;
        stopHeartbeat();
        broadcastBossStatus(null);
        broadcastEncounterEnd();
        if (mechSettings.autoShowHide) broadcastOverlayControl(false);
        return;
      }
      liveBar = data.currentBars;
      liveTotalBars = data.totalBars;
      liveBossName = data.name;

      // Gate matching: sticky by default to survive mid-phase name changes
      // (e.g. Echidna → Covetous Master Echidna), but re-match when the new boss
      // name resolves to a DIFFERENT valid gate — that's a real raid/gate transition
      // (e.g. G1 ends and G2 starts within the 60s GATE_RESET_MS window before the
      // sticky liveGateId would have cleared on its own).
      if (!liveGateId) {
        const matched = bestGateMatch(raids, data.name);
        if (matched) {
          liveGateId = matched.id;
          dbg(`[gate] matched boss "${data.name}" → ${matched.raid} G${matched.gate} (${matched.id})`);
          broadcastFightStart();
        } else {
          dbg(`[gate] NO MATCH for boss "${data.name}" — overlay won't fire mechs`);
        }
      } else {
        const candidate = bestGateMatch(raids, data.name);
        if (candidate && candidate.id !== liveGateId) {
          dbg(
            `[gate] boss "${data.name}" resolves to a different gate (${candidate.raid} G${candidate.gate}) → re-match`
          );
          liveGateId = candidate.id;
          liveEncourageMessage = null;
          broadcastFightStart();
        }
      }

      // Compute encouragement before broadcasting so the overlay window receives the
      // chosen line in the payload — each Tauri window has its own mechStore instance,
      // so rolling the dice on the overlay side would diverge from the debug log.
      recomputeEncourage(data.currentBars, liveGateId);
      broadcastBossStatus({
        ...data,
        gateId: liveGateId ?? null,
        encourageMessage: liveEncourageMessage
      });
      if (mechSettings.autoShowHide) broadcastOverlayControl(true);

      startHeartbeat(onTier1Timeout, onPlaceholderQuiet, onTier2Timeout);
    },

    // Drives the encouragement state from the Overlay Preview panel's local sim
    // (the preview bypasses setBossStatus). Safe to call repeatedly — it only mutates
    // on transition into/out of the empty-upcoming state.
    recomputeEncourage,

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
