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
