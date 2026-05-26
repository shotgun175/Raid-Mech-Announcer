import { describe, it, expect } from "vitest";
import { reduceBossStatus, type FightState, type ReduceCtx } from "./mech-reducer";
import type { BossStatusData, Gate } from "./mech-types";

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
