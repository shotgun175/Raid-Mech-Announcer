import type { BossStatusData } from "../mech-types";

export type CaptureRecord = { t: number; d: BossStatusData | null };

export type Fight = {
  id: string;
  boss: string;
  startedAt: number;
  endedAt: number;
  records: CaptureRecord[];
  outcome: "kill" | "wipe" | "unknown";
};

// Fights are split where the boss-status feed goes quiet and then resumes with the boss HP
// climbing back UP: a re-pull resetting to full, or a different boss on a gate change. Keying
// off the HP rise (not the raw silence) survives two traps a gap-only rule fell into:
//   - a wipe -> re-pull silence gets fragmented by a `null` disconnect record (see
//     capture-buffer), so no single gap ever crossed a fixed threshold;
//   - revival/phase transitions inside one gate (Kazeros G2: Archdemon -> Death Incarnate) jump
//     HP up too, but arrive as continuous data, so the silence gate leaves them in the same
//     fight, while a real gate change (Kazeros G1 -> G2) carries a loading gap and does split.
const SILENCE_MS = 12_000; // a null record, or a real-to-real gap past this, means the feed went quiet
const REPULL_RISE = 0.05; // HP climbing this far above the last reading across silence = a fresh pull

export function parseCapture(jsonl: string): CaptureRecord[] {
  const out: CaptureRecord[] = [];
  for (const line of jsonl.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try {
      const r = JSON.parse(s) as { t?: unknown; d?: unknown };
      if (typeof r.t === "number" && "d" in r) {
        out.push({ t: r.t, d: (r.d as BossStatusData | null) ?? null });
      }
    } catch {
      // skip malformed line
    }
  }
  return out;
}

export function segmentFights(records: CaptureRecord[]): Fight[] {
  const fights: Fight[] = [];
  let cur: CaptureRecord[] = [];
  let lastRealT: number | null = null;
  let prevHp = 0;
  let silenceSeen = true; // first real record always opens a fight

  const flush = () => {
    if (cur.length === 0) return;
    const boss = cur.find((r) => r.d?.name)?.d?.name ?? "Unknown";
    const last = cur.at(-1)?.d ?? null;
    const outcome: Fight["outcome"] = last?.isDead ? "kill" : "wipe";
    fights.push({
      id: String(cur[0].t),
      boss,
      startedAt: cur[0].t,
      endedAt: cur[cur.length - 1].t,
      records: cur,
      outcome
    });
    cur = [];
  };

  for (const r of records) {
    if (r.d == null) {
      silenceSeen = true; // a disconnect; null markers belong to no fight
      continue;
    }
    if (lastRealT != null && r.t - lastRealT > SILENCE_MS) silenceSeen = true;
    const hp = r.d.maxHp > 0 ? r.d.currentHp / r.d.maxHp : 0;
    if (cur.length > 0 && silenceSeen && hp > prevHp + REPULL_RISE) flush();
    cur.push(r);
    lastRealT = r.t;
    prevHp = hp;
    silenceSeen = false;
  }
  flush();
  return fights;
}
