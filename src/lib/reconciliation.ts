// Pure reconciliation of bundled library state into the user's localStorage-backed
// raid list. Runs once on app startup. No I/O, no Svelte runes — just data in,
// data out — so it's trivial to unit-test.
//
// Algorithm (per spec docs/superpowers/specs/2026-05-20-library-update-push-design.md):
//   For each user gate that matches a library gate by (raid, gate):
//     - Defensive guard: if any mech lacks `origin`, skip the whole gate
//       (treat as unstamped pre-migration data).
//     - Step A: overwrite gate-level fields (boss, totalBars, etc.) from library.
//     - Step B: reconcile existing mechs — user-edited library mechs preserved,
//       untouched library mechs overwritten, library-removed mechs dropped,
//       custom mechs always preserved.
//     - Step C: add library mechs not yet present in user's gate (skip those
//       in deletedLibraryKeys). Prune dead deletedLibraryKeys entries.
//     - Sort mechanics to library order; custom mechs at end in stable order.

import type { Gate, Mechanic } from "./mech-types";
import { bossHpMap, type LibraryGate, type LibraryMechanic } from "./data/raid-library";

export interface ReconcileResult {
  raids: Gate[];
  changedGateIds: Set<string>;
}

export function reconcile(library: LibraryGate[], userRaids: Gate[]): ReconcileResult {
  const changedGateIds = new Set<string>();
  const libraryByGate = new Map<string, LibraryGate>();
  for (const g of library) libraryByGate.set(`${g.raid}::${g.gate}`, g);

  const raids = userRaids.map((ug) => {
    const libGate = libraryByGate.get(`${ug.raid}::${ug.gate}`);
    if (!libGate) return ug; // custom gate, skip entirely

    // Defensive guard: pre-migration data with no origin field — skip cleanly.
    if (ug.mechanics.some((m) => (m as Partial<Mechanic>).origin === undefined)) {
      return ug;
    }

    let gateChanged = false;

    // ---- Step A: gate-level fields (always library wins) -------------------
    const resolvedTotalBars = libGate.totalBars ?? bossHpMap[libGate.boss] ?? 300;
    const nextGateFields: Partial<Gate> = {};
    if (ug.boss !== libGate.boss) {
      nextGateFields.boss = libGate.boss;
      gateChanged = true;
    }
    if (ug.totalBars !== resolvedTotalBars) {
      nextGateFields.totalBars = resolvedTotalBars;
      gateChanged = true;
    }
    if (ug.bossType !== libGate.bossType) {
      nextGateFields.bossType = libGate.bossType;
      gateChanged = true;
    }
    if (ug.weakness !== libGate.weakness) {
      nextGateFields.weakness = libGate.weakness;
      gateChanged = true;
    }
    if (ug.tauntable !== libGate.tauntable) {
      nextGateFields.tauntable = libGate.tauntable;
      gateChanged = true;
    }

    // ---- Step B: reconcile existing mechs ----------------------------------
    const libMechByKey = new Map<string, LibraryMechanic>();
    for (const m of libGate.mechanics) libMechByKey.set(m.key, m);

    const reconciledMechs: Mechanic[] = [];
    for (const um of ug.mechanics) {
      if (um.origin === "custom") {
        reconciledMechs.push(um);
        continue;
      }
      // origin: "library"
      if (!um.key) {
        // Library-origin mech without a key is data corruption; drop it so
        // reconciliation doesn't infinitely re-add it.
        gateChanged = true;
        continue;
      }
      const libMech = libMechByKey.get(um.key);
      if (!libMech) {
        // Library removed this key — drop from user gate.
        gateChanged = true;
        continue;
      }
      if (um.userEdited) {
        reconciledMechs.push(um);
        continue;
      }
      // Overwrite from library; preserve id/key/origin/userEdited.
      const merged: Mechanic = {
        ...um,
        name: libMech.name,
        severity: libMech.severity,
        hpBar: libMech.hpBar ?? null,
        timerSecs: libMech.timerSecs ?? null,
        repeatSecs: libMech.repeatSecs ?? null,
        triggerType: libMech.triggerType,
        notes: libMech.notes ?? "",
        difficulties: libMech.difficulties?.length ? libMech.difficulties : undefined
      };
      if (mechFieldsDiffer(um, merged)) gateChanged = true;
      reconciledMechs.push(merged);
    }
    // ---- Step C: add library mechs not yet present, respect deletedLibraryKeys
    const userKeys = new Set(reconciledMechs.map((m) => m.key).filter(Boolean) as string[]);
    const deletedKeys = new Set(ug.deletedLibraryKeys ?? []);
    for (const lm of libGate.mechanics) {
      if (userKeys.has(lm.key)) continue;
      if (deletedKeys.has(lm.key)) continue;
      reconciledMechs.push({
        id: `lib-${lm.key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        key: lm.key,
        origin: "library",
        userEdited: false,
        name: lm.name,
        severity: lm.severity,
        hpBar: lm.hpBar ?? null,
        timerSecs: lm.timerSecs ?? null,
        phase: null,
        repeatSecs: lm.repeatSecs ?? null,
        triggerType: lm.triggerType,
        ttsEnabled: true,
        ttsText: lm.name,
        notes: lm.notes ?? "",
        difficulties: lm.difficulties?.length ? lm.difficulties : undefined
      });
      gateChanged = true;
    }
    const nextMechanics = reconciledMechs;

    // Stale deletedLibraryKeys cleanup: drop entries whose keys no longer exist
    // in the current library version (dead weight from prior library removals).
    const liveLibKeys = new Set(libGate.mechanics.map((m) => m.key));
    const prunedDeleted = (ug.deletedLibraryKeys ?? []).filter((k) => liveLibKeys.has(k));

    if (gateChanged) changedGateIds.add(ug.id);
    return {
      ...ug,
      ...nextGateFields,
      mechanics: nextMechanics,
      deletedLibraryKeys: prunedDeleted
    };
  });

  return { raids, changedGateIds };
}

function mechFieldsDiffer(a: Mechanic, b: Mechanic): boolean {
  return (
    a.name !== b.name ||
    a.severity !== b.severity ||
    a.hpBar !== b.hpBar ||
    a.timerSecs !== b.timerSecs ||
    a.repeatSecs !== b.repeatSecs ||
    a.triggerType !== b.triggerType ||
    a.notes !== b.notes ||
    JSON.stringify(a.difficulties) !== JSON.stringify(b.difficulties)
  );
}
