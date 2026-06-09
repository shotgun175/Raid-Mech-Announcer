// One-time-on-load normalizer for the localStorage-backed raid list. Stored gates were written
// by whatever app version the user last ran; as the Gate/Mechanic schema grew (phase, notes,
// difficulties, bossType, ...), older blobs can be missing fields that newer code reads. The
// worst case is an invalid/absent `severity`, which makes SEVERITY[m.severity] undefined and
// crashes the overlay render. normalizeRaids coerces every gate/mech to the current shape with
// safe defaults so nothing downstream sees `undefined`.
//
// Pure + idempotent (no I/O, no runes), so it is trivial to unit-test and safe to run on every
// load: the first load fixes the data, reconcile() + applyReconciledRaids() persist it, and
// subsequent loads are no-ops on already-normal data.
//
// `origin` and `key` are preserved EXACTLY (including absent) on purpose: reconcile() treats a
// mech with no `origin` as pre-migration and skips that gate. Defaulting origin here would either
// drop the mech (origin "library" with no key) or duplicate it (origin "custom" makes reconcile
// re-add the library copy in Step C). Leaving it absent keeps reconcile's guard meaningful.

import type { Difficulty, Gate, Mechanic, MechanicSource, Phase, Severity, TriggerType } from "./mech-types";

const SEVERITIES = new Set<Severity>(["normal", "major", "wipe"]);
const TRIGGERS = new Set<TriggerType>(["hp", "timer", "hp+timer"]);
const SOURCES = new Set<MechanicSource>(["maxroll", "verified-in-fight", "estimated"]);

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function strArray(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;
}

// Lowercase keys map to canonical weakness strings. Handles free-typed inputs
// from when this was a text field, plus the v0.2.9 rename of "Weak to Light"
// (Serca G2) to "Weak to Holy". Anything not in the map falls back to "No Weakness".
const WEAKNESS_CANONICAL: Record<string, string> = {
  "no weakness": "No Weakness",
  "weak to dark": "Weak to Dark",
  "weak to fire": "Weak to Fire",
  "weak to lightning": "Weak to Lightning",
  "weak to earth": "Weak to Earth",
  "weak to holy": "Weak to Holy",
  "weak to water": "Weak to Water",
  "weak to light": "Weak to Holy"
};

function normalizeWeakness(v: unknown): string {
  const raw = typeof v === "string" ? v.trim().toLowerCase() : "";
  return WEAKNESS_CANONICAL[raw] ?? "No Weakness";
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMech(m: Record<string, unknown>): Mechanic {
  const name = str(m.name);
  const phaseRaw = m.phase;
  const phase: Phase = phaseRaw === 1 || phaseRaw === 2 || phaseRaw === 3 || phaseRaw === 4 ? phaseRaw : null;
  const origin = m.origin === "library" || m.origin === "custom" ? m.origin : undefined;

  const out: Mechanic = {
    id: str(m.id) || randomId("mig-mech"),
    // Preserve absent origin so reconcile's pre-migration guard still fires (see file header).
    origin: origin as Mechanic["origin"],
    userEdited: bool(m.userEdited, false),
    name,
    severity: SEVERITIES.has(m.severity as Severity) ? (m.severity as Severity) : "normal",
    hpBar: numOrNull(m.hpBar),
    timerSecs: numOrNull(m.timerSecs),
    phase,
    repeatSecs: numOrNull(m.repeatSecs),
    triggerType: TRIGGERS.has(m.triggerType as TriggerType) ? (m.triggerType as TriggerType) : "hp",
    ttsEnabled: bool(m.ttsEnabled, true),
    ttsText: str(m.ttsText, name),
    notes: str(m.notes, "")
  };

  if (typeof m.key === "string") out.key = m.key;
  const difficulties = strArray(m.difficulties);
  if (difficulties && difficulties.length) out.difficulties = difficulties as Difficulty[];
  // Preserve provenance so reconcile doesn't see a perpetual undefined -> "maxroll" diff
  // (which would re-flag every mech in a sourced gate as "updated" on every boot).
  if (SOURCES.has(m.source as MechanicSource)) out.source = m.source as MechanicSource;
  return out;
}

function normalizeGate(g: Record<string, unknown>): Gate {
  const out: Gate = {
    id: str(g.id) || randomId("mig-gate"),
    raid: str(g.raid),
    gate: numOrNull(g.gate) ?? 1,
    boss: str(g.boss),
    bossType: str(g.bossType),
    weakness: normalizeWeakness(g.weakness),
    tauntable: bool(g.tauntable, false),
    totalBars: numOrNull(g.totalBars) ?? 300,
    mechanics: Array.isArray(g.mechanics) ? g.mechanics.filter(isObj).map(normalizeMech) : []
  };

  const deleted = strArray(g.deletedLibraryKeys);
  if (deleted) out.deletedLibraryKeys = deleted;
  const avail = strArray(g.availableDifficulties);
  if (avail && avail.length) out.availableDifficulties = avail as Difficulty[];
  return out;
}

/** Coerce a parsed localStorage raid list into well-formed Gate[]. Non-array input -> []. */
export function normalizeRaids(input: unknown): Gate[] {
  if (!Array.isArray(input)) return [];
  return input.filter(isObj).map(normalizeGate);
}
