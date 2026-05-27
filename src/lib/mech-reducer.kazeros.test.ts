import { describe, it, expect } from "vitest";
import { reduceBossStatus, type FightState, type ReduceCtx } from "./mech-reducer";
import { parseCapture } from "./utils/capture";
import { buildLibraryGate, LIBRARY } from "./data/raid-library";
import type { Gate } from "./mech-types";

// Archdemon Kazeros (phase 1) -> Death Incarnate Kazeros: descend (phase 2), revive +399 (phase 3).
// Inlined so it round-trips through parseCapture without node fs.
const d = (name: string, bars: number, total: number, dead = false) =>
  `{"t":0,"d":{"name":"${name}","currentBars":${bars},"totalBars":${total},"isDead":${dead},"currentHp":${bars},"maxHp":${total},"currentShield":0}}`;
const FIXTURE = [
  d("Archdemon Kazeros", 999, 999),
  d("Archdemon Kazeros", 400, 999),
  d("Archdemon Kazeros", 0, 999, true),
  d("Death Incarnate Kazeros", 777, 777),
  d("Death Incarnate Kazeros", 300, 777), // phase 2 pre-revival
  d("Death Incarnate Kazeros", 699, 777), // +399 revival -> phase 3
  d("Death Incarnate Kazeros", 0, 777, true)
].join("\n");

function libGate(encounterKey: string): Gate {
  const entry = LIBRARY.find((e) => e.encounterKey === encounterKey)!;
  return buildLibraryGate(entry);
}

const ctx: ReduceCtx = {
  raids: [libGate("Final Act: Kazeros G2-1"), libGate("Final Act: Kazeros G2-2")],
  difficultyMap: {},
  autoShowHide: false,
  pickEncourage: () => "PUSH"
};

const idle: FightState = {
  liveGateId: null,
  liveBar: null,
  liveTotalBars: null,
  liveBossName: null,
  liveEncourageMessage: null,
  livePhase: null,
  bossDied: false
};

describe("Final Act: Kazeros G2 revival fixture", () => {
  it("walks phase 1 (Archdemon) -> phase 2 -> phase 3 across the revival", () => {
    const records = parseCapture(FIXTURE);
    const seen: (number | null)[] = [];
    let state = idle;
    for (const r of records) {
      const out = reduceBossStatus(state, { type: "status", data: r.d }, ctx);
      state = out.state;
      if (r.d && !r.d.isDead) seen.push(state.livePhase);
    }
    // Archdemon live records = phase 1; Death Incarnate pre-revival = phase 2; post-revival = phase 3.
    expect(seen[0]).toBe(1);
    expect(seen).toContain(2);
    expect(seen.at(-1)).toBe(3);
  });

  it("binds the second boss to G2-2 (not a separate G2-3)", () => {
    const g22 = ctx.raids[1].id;
    let state = idle;
    let bound: string | null = null;
    for (const r of parseCapture(FIXTURE)) {
      state = reduceBossStatus(state, { type: "status", data: r.d }, ctx).state;
      if (r.d && r.d.name === "Death Incarnate Kazeros" && !r.d.isDead) bound = state.liveGateId;
    }
    expect(bound).toBe(g22);
  });
});
