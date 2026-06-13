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

export type TimerFire = { mech: Mechanic; secsLeft: number; announce: boolean };

/**
 * From-pull timer mechs whose announce window has been reached `elapsedSecs`
 * seconds into the fight: timerSecs - elapsed <= leadSecs. Only pure timer mechs
 * qualify (`timerSecs` set, `hpBar` null) — a mech carrying both would announce
 * twice, once per trigger path (the editor can leave a stale hidden value behind
 * when the trigger type is switched). `announce` is false once the mech is past
 * due — its window passed while callouts were gated (HP silence, phase transition)
 * — so the caller marks it fired without speaking a stale callout. `secsLeft` is
 * clamped to >= 1: interval drift inside the window must not round a live callout
 * down to zero. Excluding already-fired mechs is the caller's job.
 */
export function dueTimerMechs(mechanics: Mechanic[], elapsedSecs: number, leadSecs: number): TimerFire[] {
  return mechanics
    .filter((m) => m.timerSecs != null && m.hpBar == null && m.timerSecs - elapsedSecs <= leadSecs)
    .map((m) => {
      const remaining = m.timerSecs! - elapsedSecs;
      return { mech: m, secsLeft: Math.max(1, Math.round(remaining)), announce: remaining > 0 };
    });
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

/**
 * Distinct non-null phase values present in a gate's mechanics, sorted ascending.
 * E.g. Kazeros G2-2 (phases 2 and 3) -> [2, 3]; an all-null gate -> [].
 */
export function gatePhases(mechanics: Mechanic[]): number[] {
  const seen = new Set<number>();
  for (const m of mechanics) {
    if (m.phase != null) seen.add(m.phase);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * A gate is "phased" (worth a phase selector) only when it spans 2+ distinct phases.
 * A gate whose mechs are all one phase, or all untagged, reads as a single descent and
 * keeps the flat editor behavior.
 */
export function isPhasedGate(mechanics: Mechanic[]): boolean {
  return gatePhases(mechanics).length >= 2;
}

/**
 * Mechs visible/active in a given phase: the phase's own mechs plus all untagged
 * (phase == null) mechs, mirroring the live overlay's scoping. A null `phase` means
 * no scoping - returns the list unchanged.
 */
export function scopeToPhase(mechanics: Mechanic[], phase: number | null): Mechanic[] {
  if (phase == null) return mechanics;
  return mechanics.filter((m) => m.phase == null || m.phase === phase);
}

/**
 * Comparator for the editor's "All phases" overview: group by phase ascending
 * (untagged mechs last), then by hpBar descending within each phase, so each
 * phase reads as its own clean descent instead of interleaving by raw HP.
 */
export function byPhaseThenHp(a: Mechanic, b: Mechanic): number {
  const pa = a.phase ?? Infinity;
  const pb = b.phase ?? Infinity;
  if (pa !== pb) return pa - pb;
  return (b.hpBar ?? -1) - (a.hpBar ?? -1);
}
