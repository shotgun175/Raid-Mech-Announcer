import type { Difficulty, Gate, Mechanic } from "../mech-types";
import { libraryByRaid } from "../data/raid-library";

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
 * Returns mechanics visible for the given difficulty. A mechanic with no
 * difficulties array (or an empty one) is shown in every difficulty.
 * null skips filtering entirely (defensive; UI callers always resolve a
 * concrete tier via resolveDifficulty).
 */
export function filterByDifficulty(mechanics: Mechanic[], difficulty: Difficulty | null): Mechanic[] {
  if (!difficulty) return mechanics;
  return mechanics.filter((m) => !m.difficulties?.length || m.difficulties.includes(difficulty));
}

/**
 * Available difficulties for a raid: the union across the raid's own gates'
 * availableDifficulties (set when the user adds a custom raid), else the
 * library entry's list, else ["Normal", "Hard"] for legacy data.
 */
export function raidAvailableDifficulties(raidName: string, gates: Gate[]): Difficulty[] {
  const own = gates.filter((g) => g.raid === raidName).flatMap((g) => g.availableDifficulties ?? []);
  if (own.length > 0) {
    const set = new Set(own);
    return DIFFICULTY_ORDER.filter((d) => set.has(d));
  }
  return libraryByRaid[raidName]?.[0]?.availableDifficulties ?? ["Normal", "Hard"];
}

/**
 * Default tier when the user hasn't picked one: the first non-Solo difficulty
 * in display order. Solo is never a default — it would silence the overlay
 * out of the box for group players.
 */
export function baseDifficulty(available: Difficulty[]): Difficulty {
  const ordered = DIFFICULTY_ORDER.filter((d) => available.includes(d));
  return ordered.find((d) => d !== "Solo") ?? ordered[0] ?? "Normal";
}

/**
 * The active difficulty for a raid: the user's stored pick, else the base
 * tier. Never null — there is no unfiltered "All" announce mode; a raid with
 * no stored pick announces its base tier.
 */
export function resolveDifficulty(difficultyMap: Record<string, string>, raidName: string, gates: Gate[]): Difficulty {
  return (difficultyMap[raidName] as Difficulty) ?? baseDifficulty(raidAvailableDifficulties(raidName, gates));
}

/**
 * Cycles to the next difficulty in the available list (filtered to
 * DIFFICULTY_ORDER). Wraps from last → first; null resolves to first.
 *
 * Reserved for the planned difficulty-cycling UI in GateSidebar — kept here
 * so the behavior (and its tests) survives until the UI lands.
 */
export function cycleDifficulty(current: Difficulty | null, availableDifficulties: Difficulty[]): Difficulty | null {
  const ordered = DIFFICULTY_ORDER.filter((d) => availableDifficulties.includes(d));
  if (ordered.length === 0) return null;
  if (!current) return ordered[0];
  const idx = ordered.indexOf(current);
  if (idx === -1 || idx === ordered.length - 1) return ordered[0];
  return ordered[idx + 1];
}
