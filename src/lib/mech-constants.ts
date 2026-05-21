export const SEVERITY = {
  normal: { label: "Normal", color: "#38bdf8", dim: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.4)" },
  major: { label: "Major", color: "#fb923c", dim: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.4)" },
  wipe: { label: "Wipe", color: "#f87171", dim: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.5)" }
} as const;

export const PHASE_COLORS: Record<number, string> = {
  1: "#38bdf8",
  2: "#fb923c",
  3: "#f87171",
  4: "#a78bfa"
};

export const BOSS_HP_COLORS = ["#D16F23", "#9F3930", "#582469", "#2B3A63", "#246977", "#798816", "#E7B826"];

export function formatGate(gate: number): string {
  // Defensive guard: malformed data (null/undefined/NaN) used to render as
  // literal "null" via String() coercion. Show a "?" placeholder instead so
  // users can spot the bad row and delete it via the per-gate X.
  if (gate == null || !Number.isFinite(gate)) return "?";
  return gate < 10 ? String(gate) : `${Math.floor(gate / 10)}.${gate % 10}`;
}

export function gateLabel(gate: number): string {
  return `Gate ${formatGate(gate)}`;
}

// Sort key for gates so split-gate encodings (12 = G1.2, 42 = G4.2) interleave
// with whole gates in display order: 1, 1.2, 2, 3, 4.2, 5. A raw a.gate - b.gate
// would put 12 after 5 because 12 > 5 as an integer.
export function gateSortKey(gate: number): number {
  if (!Number.isFinite(gate)) return Number.POSITIVE_INFINITY;
  if (gate < 10) return gate;
  return Math.floor(gate / 10) + (gate % 10) / 10;
}

export function formatTimer(secs: number | null): string {
  if (secs == null) return "";
  const m = Math.floor(secs / 60);
  return `${m}:${String(secs % 60).padStart(2, "0")}`;
}
