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

    // ---- Step B/C placeholders (added in subsequent tasks) -----------------
    const nextMechanics = ug.mechanics;

    if (gateChanged) changedGateIds.add(ug.id);
    return { ...ug, ...nextGateFields, mechanics: nextMechanics };
  });

  return { raids, changedGateIds };
}
