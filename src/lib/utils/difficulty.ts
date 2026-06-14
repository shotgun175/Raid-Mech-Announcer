import type { Difficulty, Mechanic } from "../mech-types";

/** Canonical display order for cycling: S → N → H → NM → EX → TFM → ST1 → ST2 → ST3 */
export const DIFFICULTY_ORDER: Difficulty[] = [
  "Solo",
  "Normal",
  "Hard",
  "Nightmare",
  "Extreme",
  "TFM",
  "Stage 1",
  "Stage 2",
  "Stage 3"
];

/** Per-difficulty visual style tokens. Stage 1/2/3 (Horizon Cathedral) reuse the
 * Normal/Hard/Nightmare colors — same escalation, raid-specific naming. */
export const DIFFICULTY_STYLE: Record<Difficulty, { color: string; bg: string; border: string; label: string }> = {
  "Solo": { color: "#3b82f6", bg: "#0d1220", border: "#3b82f633", label: "SOLO" },
  "Normal": { color: "#9ca3af", bg: "#1a1a1a", border: "#6b728033", label: "NORMAL" },
  "Hard": { color: "#fb923c", bg: "#1a0f00", border: "#fb923c33", label: "HARD" },
  "Nightmare": { color: "#a855f7", bg: "#120d1a", border: "#a855f733", label: "NIGHTMARE" },
  "Extreme": { color: "#ef4444", bg: "#1a0808", border: "#ef444433", label: "EXTREME" },
  "TFM": { color: "#facc15", bg: "#1a1500", border: "#facc1533", label: "TFM" },
  "Stage 1": { color: "#9ca3af", bg: "#1a1a1a", border: "#6b728033", label: "STAGE 1" },
  "Stage 2": { color: "#fb923c", bg: "#1a0f00", border: "#fb923c33", label: "STAGE 2" },
  "Stage 3": { color: "#a855f7", bg: "#120d1a", border: "#a855f733", label: "STAGE 3" }
};

/**
 * Returns mechanics visible for the given difficulty.
 * null difficulty = All (no filter). A mechanic with no difficulties array
 * (or an empty one) is shown in every difficulty.
 */
export function filterByDifficulty(mechanics: Mechanic[], difficulty: Difficulty | null): Mechanic[] {
  if (!difficulty) return mechanics;
  return mechanics.filter((m) => !m.difficulties?.length || m.difficulties.includes(difficulty));
}

/**
 * Returns the active Difficulty for a raid from the stored map,
 * or null (= All) if none is set.
 */
export function activeDifficultyForGate(difficultyMap: Record<string, string>, raidName: string): Difficulty | null {
  return (difficultyMap[raidName] as Difficulty) ?? null;
}

/**
 * Cycles to the next difficulty in the available list (filtered to
 * DIFFICULTY_ORDER). Wraps from last → null (All), and null → first.
 *
 * Reserved for the planned difficulty-cycling UI in GateSidebar — kept here
 * so the behavior (and its tests) survives until the UI lands.
 */
export function cycleDifficulty(current: Difficulty | null, availableDifficulties: Difficulty[]): Difficulty | null {
  const ordered = DIFFICULTY_ORDER.filter((d) => availableDifficulties.includes(d));
  if (ordered.length === 0) return null;
  if (!current) return ordered[0];
  const idx = ordered.indexOf(current);
  if (idx === -1 || idx === ordered.length - 1) return null;
  return ordered[idx + 1];
}
