import type { Mechanic } from "../mech-types";

/**
 * The repeating mechanic whose HP threshold was crossed most recently as the boss
 * HP bar descends — the lowest `hpBar` among repeating mechs the bar has already
 * dropped below. Returns null when no repeating mech has triggered yet.
 *
 * Boss HP counts DOWN, so a later mechanic has a lower `hpBar`. Picking the smallest
 * crossed `hpBar` (not the largest) is what lets a later repeater take over from an
 * earlier one the moment its threshold is crossed — e.g. in Serca G1, Bomb Bingo
 * (x175) replaces Laser & Traps (x270) at x175, and Maiden Bingo (x100) takes over at
 * x100 — regardless of any user timer resets, which only touch the countdown, not which
 * mech is active.
 */
export function activeRepeatMech(mechanics: Mechanic[], bar: number): Mechanic | null {
  return (
    mechanics
      .filter((m) => m.repeatSecs != null && m.hpBar != null && bar < m.hpBar)
      .sort((a, b) => (a.hpBar ?? 0) - (b.hpBar ?? 0))
      .at(0) ?? null
  );
}

const SEVERITY_RANK: Record<string, number> = { wipe: 3, major: 2, normal: 1 };

function outranksForAnnounce(a: Mechanic, b: Mechanic): boolean {
  const ra = SEVERITY_RANK[a.severity] ?? 0;
  const rb = SEVERITY_RANK[b.severity] ?? 0;
  if (ra !== rb) return ra > rb;
  // Tie on severity: prefer the repeating mech — it owns the live countdown.
  const aRepeats = a.repeatSecs != null;
  const bRepeats = b.repeatSecs != null;
  if (aRepeats !== bRepeats) return aRepeats;
  return false; // still tied: keep the earlier one (stable)
}

/**
 * Collapses mechs that share an `hpBar` to a single "winner" so two mechs on the same
 * threshold don't announce over each other (e.g. Serca G1's Safe Zone and Maiden Bingo,
 * both x100, which otherwise speak back-to-back). The winner is the highest severity,
 * ties broken toward the repeating mech, then toward input order. Mechs on distinct
 * thresholds all pass through; null-`hpBar` mechs are dropped.
 *
 * Intended for the set of mechs entering their hp-initial lead window on a single tick:
 * the caller marks them all fired, then announces only these winners.
 */
export function topMechPerThreshold(mechs: Mechanic[]): Mechanic[] {
  const byBar = new Map<number, Mechanic>();
  for (const m of mechs) {
    if (m.hpBar == null) continue;
    const cur = byBar.get(m.hpBar);
    if (cur == null || outranksForAnnounce(m, cur)) byBar.set(m.hpBar, m);
  }
  return [...byBar.values()];
}
