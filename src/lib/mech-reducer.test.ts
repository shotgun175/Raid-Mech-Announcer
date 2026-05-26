import { describe, it, expect } from "vitest";
import { reduceBossStatus, type FightState, type ReduceCtx } from "./mech-reducer";
import type { BossStatusData, Gate, Mechanic } from "./mech-types";

function gate(id: string, raid: string, g: number, boss: string): Gate {
  return { id, raid, gate: g, boss, bossType: "", weakness: "", tauntable: false, totalBars: 300, mechanics: [] };
}

const armocheG1 = gate("g1", "Act 4: Armoche", 1, "Act 4: Covetous Master Echidna");
const serca = gate("s1", "Serca", 1, "Witch of Agony, Serca");

const ctx: ReduceCtx = {
  raids: [armocheG1, serca],
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

function status(name: string, bars: number, isDead = false): { type: "status"; data: BossStatusData } {
  return {
    type: "status",
    data: { name, currentBars: bars, totalBars: 300, isDead, currentHp: bars, maxHp: 300, currentShield: 0 }
  };
}

describe("reduceBossStatus", () => {
  it("matches a gate on the first status and emits fight-start", () => {
    const { state, effects } = reduceBossStatus(idle, status("Witch of Agony, Serca", 250), ctx);
    expect(state.liveGateId).toBe("s1");
    expect(effects.some((e) => e.type === "fight-start")).toBe(true);
    expect(effects.some((e) => e.type === "broadcast-status")).toBe(true);
  });

  it("stays sticky when a no-match name arrives mid-fight", () => {
    const live: FightState = { ...idle, liveGateId: "s1", liveBar: 100, liveBossName: "Witch of Agony, Serca" };
    const { state } = reduceBossStatus(live, status("Some Phase Name", 80), ctx);
    expect(state.liveGateId).toBe("s1");
  });

  it("treats a swap-gate boss death as a transition: keeps gate, no encounter-end", () => {
    const live: FightState = { ...idle, liveGateId: "g1", liveBar: 0, liveBossName: "Act 4: Covetous Master Echidna" };
    const { state, effects } = reduceBossStatus(live, status("Act 4: Covetous Master Echidna", 0, true), ctx);
    expect(state.liveGateId).toBe("g1");
    expect(effects.some((e) => e.type === "encounter-end")).toBe(false);
    expect(effects.some((e) => e.type === "broadcast-status" && e.payload === null)).toBe(true);
  });

  it("ignores an unrelated boss death while a gate is live", () => {
    const live: FightState = { ...idle, liveGateId: "s1", liveBar: 100, liveBossName: "Witch of Agony, Serca" };
    const { state, effects } = reduceBossStatus(live, status("Random Add", 0, true), ctx);
    expect(state.liveGateId).toBe("s1");
    expect(effects.some((e) => e.type === "encounter-end")).toBe(false);
  });

  it("tears down on the live gate's own (non-swap) boss death", () => {
    const live: FightState = { ...idle, liveGateId: "s1", liveBar: 0, liveBossName: "Witch of Agony, Serca" };
    const { state, effects } = reduceBossStatus(live, status("Witch of Agony, Serca", 0, true), ctx);
    expect(state.liveGateId).toBeNull();
    expect(effects.some((e) => e.type === "encounter-end")).toBe(true);
  });

  it("tier2 timeout ends the encounter", () => {
    const live: FightState = { ...idle, liveGateId: "s1", liveBar: 100 };
    const { state, effects } = reduceBossStatus(live, { type: "tier2" }, ctx);
    expect(state.liveGateId).toBeNull();
    expect(effects.some((e) => e.type === "encounter-end")).toBe(true);
  });

  it("tier1 timeout clears HP but keeps the gate", () => {
    const live: FightState = { ...idle, liveGateId: "s1", liveBar: 100, liveBossName: "Witch of Agony, Serca" };
    const { state, effects } = reduceBossStatus(live, { type: "tier1" }, ctx);
    expect(state.liveGateId).toBe("s1");
    expect(state.liveBar).toBeNull();
    expect(effects.some((e) => e.type === "broadcast-status" && e.payload === null)).toBe(true);
  });
});

function mech(phase: 1 | 2 | 3 | 4 | null, hpBar: number): Mechanic {
  return {
    id: `m-${phase}-${hpBar}`,
    origin: "library",
    userEdited: false,
    name: `mech-${phase}-${hpBar}`,
    severity: "major",
    hpBar,
    timerSecs: null,
    phase,
    repeatSecs: null,
    triggerType: "hp",
    ttsEnabled: true,
    ttsText: "",
    notes: ""
  };
}

function phaseGate(id: string, boss: string, totalBars: number, mechs: Mechanic[]): Gate {
  return {
    id,
    raid: "Final Act: Kazeros",
    gate: 22,
    boss,
    bossType: "",
    weakness: "",
    tauntable: false,
    totalBars,
    mechanics: mechs
  };
}

const archdemon = phaseGate("g21", "Archdemon Kazeros", 999, [mech(1, 900)]);
const incarnate = phaseGate("g22", "Death Incarnate Kazeros", 777, [mech(2, 500), mech(3, 525)]);

const phaseCtx: ReduceCtx = {
  raids: [archdemon, incarnate],
  difficultyMap: {},
  autoShowHide: false,
  pickEncourage: () => "PUSH"
};

const idleState: FightState = {
  liveGateId: null,
  liveBar: null,
  liveTotalBars: null,
  liveBossName: null,
  liveEncourageMessage: null,
  livePhase: null
};

const phaseStatus = (name: string, bars: number, total: number, isDead = false) => ({
  type: "status" as const,
  data: { name, currentBars: bars, totalBars: total, isDead, currentHp: bars, maxHp: total, currentShield: 0 }
});

describe("reduceBossStatus revival phase tracking", () => {
  it("seeds livePhase to the bound gate's lowest phase tag", () => {
    const a = reduceBossStatus(idleState, phaseStatus("Archdemon Kazeros", 999, 999), phaseCtx);
    expect(a.state.livePhase).toBe(1);
    const b = reduceBossStatus(idleState, phaseStatus("Death Incarnate Kazeros", 777, 777), phaseCtx);
    expect(b.state.livePhase).toBe(2);
  });

  it("advances to the next phase on a same-pool HP revival", () => {
    let state = reduceBossStatus(idleState, phaseStatus("Death Incarnate Kazeros", 777, 777), phaseCtx).state;
    state = reduceBossStatus(state, phaseStatus("Death Incarnate Kazeros", 300, 777), phaseCtx).state;
    expect(state.livePhase).toBe(2);
    // Revival: 300 -> 699 (+399 > 777/3) on the same pool.
    state = reduceBossStatus(state, phaseStatus("Death Incarnate Kazeros", 699, 777), phaseCtx).state;
    expect(state.livePhase).toBe(3);
  });

  it("does not advance on an upward jump when totalBars changed (stagger pool)", () => {
    let state = reduceBossStatus(idleState, phaseStatus("Death Incarnate Kazeros", 300, 777), phaseCtx).state;
    // Jump up but coming from a different pool (totalBars 1) is not a revival.
    state = reduceBossStatus(
      { ...state, liveBar: 1, liveTotalBars: 1 },
      phaseStatus("Death Incarnate Kazeros", 699, 777),
      phaseCtx
    ).state;
    expect(state.livePhase).toBe(2);
  });

  it("does not advance on sub-threshold jitter", () => {
    let state = reduceBossStatus(idleState, phaseStatus("Death Incarnate Kazeros", 280, 777), phaseCtx).state;
    state = reduceBossStatus(state, phaseStatus("Death Incarnate Kazeros", 290, 777), phaseCtx).state; // +10
    expect(state.livePhase).toBe(2);
  });

  it("reseeds phase to the new gate's minimum on a gate flip", () => {
    let state = reduceBossStatus(idleState, phaseStatus("Archdemon Kazeros", 999, 999), phaseCtx).state;
    expect(state.livePhase).toBe(1);
    state = reduceBossStatus(state, phaseStatus("Death Incarnate Kazeros", 777, 777), phaseCtx).state;
    expect(state.livePhase).toBe(2);
  });

  it("resets livePhase to null on encounter end and tier2", () => {
    const live = { ...idleState, liveGateId: "g22", liveBar: 0, liveBossName: "Death Incarnate Kazeros", livePhase: 3 };
    const end = reduceBossStatus(live, phaseStatus("Death Incarnate Kazeros", 0, 777, true), phaseCtx);
    expect(end.state.livePhase).toBeNull();
    const t2 = reduceBossStatus({ ...idleState, liveGateId: "g22", livePhase: 3 }, { type: "tier2" }, phaseCtx);
    expect(t2.state.livePhase).toBeNull();
  });
});
