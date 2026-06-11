import { BOSS_HP_COLORS } from "$lib/mech-constants";
import type { Mechanic } from "$lib/mech-types";

export function upcomingFrom(mechs: Mechanic[], currentBar: number): Mechanic[] {
  return [...mechs]
    .filter((m) => m.hpBar != null && m.hpBar <= currentBar)
    .sort((a, b) => (b.hpBar ?? 0) - (a.hpBar ?? 0));
}

export function hpBarColor(currentBar: number, totalBars: number): string {
  const idx = Math.max(0, Math.ceil((currentBar / totalBars) * BOSS_HP_COLORS.length) - 1);
  return BOSS_HP_COLORS[idx % BOSS_HP_COLORS.length];
}

export interface OverlayProps {
  mechanics: Mechanic[];
  currentBar: number;
  totalBars: number;
  gateName: string;
  bossName?: string;
  activeMech?: Mechanic | null;
  repeatCountdown?: number | null;
}
