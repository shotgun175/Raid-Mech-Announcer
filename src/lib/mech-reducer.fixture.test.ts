import { describe, it, expect } from "vitest";
import { reduceBossStatus, type Effect, type FightState, type ReduceCtx } from "./mech-reducer";
import { parseCapture } from "./utils/capture";
import { buildLibraryGate, LIBRARY } from "./data/raid-library";
import type { Gate } from "./mech-types";

// A representative Act 4: Armoche G1 capture: Echidna descends and dies at the swap, then
// Brelshaza takes over on her own 450-bar pool and is killed. Inlined (rather than read from
// a file) so it round-trips through parseCapture without node fs APIs that svelte-check rejects.
const FIXTURE = [
  `{"t":0,"d":{"name":"Act 4: Covetous Master Echidna","currentBars":300,"totalBars":300,"isDead":false,"currentHp":300,"maxHp":300,"currentShield":0}}`,
  `{"t":1000,"d":{"name":"Act 4: Covetous Master Echidna","currentBars":120,"totalBars":300,"isDead":false,"currentHp":120,"maxHp":300,"currentShield":0}}`,
  `{"t":2000,"d":{"name":"Act 4: Covetous Master Echidna","currentBars":20,"totalBars":300,"isDead":false,"currentHp":20,"maxHp":300,"currentShield":0}}`,
  `{"t":3000,"d":{"name":"Act 4: Covetous Master Echidna","currentBars":0,"totalBars":300,"isDead":true,"currentHp":0,"maxHp":300,"currentShield":0}}`,
  `{"t":12000,"d":{"name":"Brelshaza, Ember in the Ashes","currentBars":450,"totalBars":450,"isDead":false,"currentHp":450,"maxHp":450,"currentShield":0}}`,
  `{"t":13000,"d":{"name":"Brelshaza, Ember in the Ashes","currentBars":200,"totalBars":450,"isDead":false,"currentHp":200,"maxHp":450,"currentShield":0}}`,
  `{"t":14000,"d":{"name":"Brelshaza, Ember in the Ashes","currentBars":0,"totalBars":450,"isDead":true,"currentHp":0,"maxHp":450,"currentShield":0}}`
].join("\n");

function libGate(encounterKey: string): Gate {
  const entry = LIBRARY.find((e) => e.encounterKey === encounterKey)!;
  return buildLibraryGate(entry);
}

const ctx: ReduceCtx = {
  raids: [libGate("Act 4: Armoche G1")],
  difficultyMap: {},
  autoShowHide: true,
  pickEncourage: () => "PUSH"
};

const idle: FightState = {
  liveGateId: null,
  liveBar: null,
  liveTotalBars: null,
  liveBossName: null,
  liveEncourageMessage: null,
  livePhase: null
};

const records = parseCapture(FIXTURE);

describe("Armoche G1 swap fixture (replayed through the reducer)", () => {
  it("keeps the gate bound across the Echidna->Brelshaza swap, with no encounter-end from the fight itself", () => {
    const g1 = ctx.raids[0].id;
    let state = idle;
    const effects: Effect[] = [];
    for (const r of records) {
      const out = reduceBossStatus(state, { type: "status", data: r.d }, ctx);
      state = out.state;
      effects.push(...out.effects);
    }
    // Echidna's death is a swap (kept), and Brelshaza matches no other gate (also kept), so the
    // gate stays bound and NOTHING in the fight itself ends the encounter. A regression where
    // Echidna's death tore down would leave liveGateId null here (Brelshaza wouldn't re-bind).
    expect(state.liveGateId).toBe(g1);
    expect(effects.some((e) => e.type === "encounter-end")).toBe(false);
  });

  it("ends the encounter only when the silence safety net (tier2) fires", () => {
    let state = idle;
    for (const r of records) state = reduceBossStatus(state, { type: "status", data: r.d }, ctx).state;
    const end = reduceBossStatus(state, { type: "tier2" }, ctx);
    expect(end.state.liveGateId).toBeNull();
    expect(end.effects.some((e) => e.type === "encounter-end")).toBe(true);
  });

  it("shows the push line during the Brelshaza swap phase", () => {
    let state = idle;
    let sawPush = false;
    for (const r of records) {
      state = reduceBossStatus(state, { type: "status", data: r.d }, ctx).state;
      if (r.d && r.d.name.includes("Brelshaza") && !r.d.isDead && state.liveEncourageMessage === "PUSH") {
        sawPush = true;
      }
    }
    expect(sawPush).toBe(true);
  });
});
