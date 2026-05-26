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

// A silence longer than this between consecutive records is treated as the boundary
// between two separate pulls. Matches GATE_RESET_MS in mech-store so segmentation lines
// up with how the live app considers an encounter over.
const FIGHT_GAP_MS = 60_000;

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
  let prevT: number | null = null;

  const flush = () => {
    if (cur.length === 0) return;
    const withData = cur.filter((r): r is CaptureRecord & { d: BossStatusData } => r.d != null);
    const boss = withData.find((r) => r.d.name)?.d.name ?? "Unknown";
    const last = withData.at(-1)?.d ?? null;
    const outcome: Fight["outcome"] = last?.isDead ? "kill" : withData.length > 0 ? "wipe" : "unknown";
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
    if (prevT != null && r.t - prevT > FIGHT_GAP_MS) flush();
    cur.push(r);
    prevT = r.t;
  }
  flush();
  return fights;
}
