import type { Gate } from "../mech-types";

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
