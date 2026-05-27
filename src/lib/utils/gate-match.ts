import type { Gate } from "../mech-types";
import { gateSortKey } from "../mech-constants";

// Minimum match score for a live boss name to bind to a gate. Tuned so a short core name
// ("Echidna", ~0.23 against the unrelated long "Act 4: Covetous Master Echidna") doesn't
// bind, while a genuine phase-name variant ("Desire in Full Bloom, Echidna" vs the "Echidna"
// gate, ~0.24) still does.
const MATCH_THRESHOLD = 0.24;

// Overlap score between a stored gate boss name and the live boss name. Compares BOTH the
// full stored name and its pre-comma core, taking the better. The full-name comparison is
// what makes an identical name like "Armoche, Sentinel of the Abyss" score 1.0; comparing
// only the pre-comma core ("Armoche") against the full live name drops it to 7/30 (~0.23),
// below the threshold, so an identical name would otherwise mis-report NO MATCH. The core
// comparison is still kept so a stored "Full Name, Title" can also match a live bare core.
function nameScore(storedFull: string, live: string): number {
  let best = 0;
  for (const stored of [storedFull, storedFull.split(",")[0].trim()]) {
    if (!stored) continue;
    if (stored === live) return 1;
    if (stored.includes(live) || live.includes(stored)) {
      best = Math.max(best, Math.min(stored.length, live.length) / Math.max(stored.length, live.length));
    }
  }
  return best;
}

/**
 * Best gate whose boss name matches the live boss name, or null if none clears the
 * threshold. Score-based: exact = 1.0, partial = overlap ratio, no overlap = 0.
 */
export function bestGateMatch(gates: Gate[], bossName: string): Gate | null {
  const live = bossName.toLowerCase().trim();
  if (!live) return null;
  let best: Gate | null = null;
  let bestScore = 0;
  for (const gate of gates) {
    const score = nameScore(gate.boss.toLowerCase().trim(), live);
    if (score > bestScore) {
      bestScore = score;
      best = gate;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}

/**
 * Whether `gate` is the last gate of its raid among `gates` — i.e. no other gate sharing its
 * raid name sorts higher (via gateSortKey, which interleaves split gates like 21/22/23 as
 * 2.1/2.2/2.3). Decides the kill banner: the final gate's clear is "Raid Cleared", every
 * earlier gate is "Boss Defeated". A lone gate (or unknown raid) counts as final.
 */
export function isFinalGateOfRaid(gates: Gate[], gate: Gate): boolean {
  const sameRaid = gates.filter((g) => g.raid === gate.raid);
  if (sameRaid.length <= 1) return true;
  const maxKey = Math.max(...sameRaid.map((g) => gateSortKey(g.gate)));
  return gateSortKey(gate.gate) >= maxKey;
}
