import { describe, it, expect } from "vitest";
import {
  activeRepeatMech,
  dueTimerMechs,
  topMechPerThreshold,
  gatePhases,
  isPhasedGate,
  scopeToPhase,
  byPhaseThenHp
} from "./mechanics";
import type { Mechanic } from "../mech-types";

function mech(overrides: Partial<Mechanic> = {}): Mechanic {
  return {
    id: "m1",
    origin: "library",
    userEdited: false,
    name: "Test",
    severity: "major",
    hpBar: 100,
    timerSecs: null,
    phase: null,
    repeatSecs: null,
    triggerType: "hp",
    ttsEnabled: true,
    ttsText: "Test",
    notes: "",
    ...overrides
  };
}

// Serca G1 repeating mechs, descending: Laser x270 (60s) → Bomb x175 (70s) → Maiden x100 (60s).
const laser = mech({ id: "laser", name: "Laser & Traps", hpBar: 270, repeatSecs: 60, triggerType: "hp+timer" });
const bomb = mech({ id: "bomb", name: "Bomb Bingo", hpBar: 175, repeatSecs: 70, triggerType: "hp+timer" });
const maiden = mech({ id: "maiden", name: "Maiden Bingo", hpBar: 100, repeatSecs: 60, triggerType: "hp+timer" });
// Non-repeating hp-only mech sitting between two repeaters — must never be selected.
const spikeGuard = mech({ id: "spike", name: "Spike Guard", hpBar: 240, repeatSecs: null, triggerType: "hp" });

const serca = [laser, spikeGuard, bomb, maiden];

describe("activeRepeatMech", () => {
  it("returns null before any repeating threshold is crossed", () => {
    expect(activeRepeatMech(serca, 290)).toBeNull();
  });

  it("selects the first repeater once its threshold is crossed", () => {
    expect(activeRepeatMech(serca, 250)?.id).toBe("laser");
  });

  it("hands off to the next repeater the moment its threshold is crossed", () => {
    // x170 is just below Bomb Bingo (x175); it must override Laser & Traps (x270).
    expect(activeRepeatMech(serca, 170)?.id).toBe("bomb");
  });

  it("advances to the latest repeater as the bar keeps dropping", () => {
    expect(activeRepeatMech(serca, 90)?.id).toBe("maiden");
  });

  it("ignores non-repeating hp-only mechanics even when crossed", () => {
    // At x230, Spike Guard (x240, no repeat) is also crossed but must not win over Laser.
    expect(activeRepeatMech(serca, 230)?.id).toBe("laser");
  });

  it("returns null when the gate has no repeating mechanics", () => {
    expect(activeRepeatMech([spikeGuard], 100)).toBeNull();
  });
});

describe("dueTimerMechs", () => {
  // Serca G2 Stagger Helping Pattern: pure timer at 510s from pull.
  const stagger = mech({
    id: "stagger",
    name: "Stagger Helping Pattern",
    hpBar: null,
    timerSecs: 510,
    triggerType: "timer"
  });
  // Trigger-less mech (Horizon Cathedral G2 style) — must never fire.
  const identity = mech({ id: "identity", name: "50% Identity", hpBar: null, timerSecs: null, triggerType: "timer" });
  const gate = [stagger, identity, mech({ id: "hp", hpBar: 100 })];

  it("is empty before the announce window opens", () => {
    expect(dueTimerMechs(gate, 504, 5)).toEqual([]);
  });

  it("fires inside the lead window with the seconds remaining", () => {
    const fires = dueTimerMechs(gate, 505, 5);
    expect(fires).toHaveLength(1);
    expect(fires[0].mech.id).toBe("stagger");
    expect(fires[0].secsLeft).toBe(5);
    expect(fires[0].announce).toBe(true);
  });

  it("marks a past-due mech as non-announcing (bound mid-fight)", () => {
    const fires = dueTimerMechs(gate, 600, 5);
    expect(fires).toHaveLength(1);
    expect(fires[0].mech.id).toBe("stagger");
    expect(fires[0].announce).toBe(false);
  });

  it("never returns trigger-less or hp-only mechs", () => {
    expect(dueTimerMechs([identity, mech({ id: "hp", hpBar: 100 })], 9999, 5)).toEqual([]);
  });

  it("excludes a mech carrying both hpBar and timerSecs (the HP path owns it — no double-announce)", () => {
    const both = mech({ id: "both", hpBar: 100, timerSecs: 510, triggerType: "timer" });
    expect(dueTimerMechs([both], 9999, 5)).toEqual([]);
  });

  // The live clock feeds fractional elapsed ((Date.now() - start) / 1000), so the
  // window edges and the secsLeft rounding/clamp must hold off integer boundaries.
  it("opens the window on a fractional elapsed and rounds secsLeft", () => {
    const fires = dueTimerMechs(gate, 505.4, 5); // remaining 4.6 → round → 5
    expect(fires).toHaveLength(1);
    expect(fires[0].secsLeft).toBe(5);
    expect(fires[0].announce).toBe(true);
  });

  it("stays empty a fraction before the window opens", () => {
    expect(dueTimerMechs(gate, 504.9, 5)).toEqual([]); // remaining 5.1 > lead 5
  });

  it("clamps a sub-second live remaining up to 1 instead of rounding it to 0", () => {
    const fires = dueTimerMechs(gate, 509.7, 5); // remaining 0.3 — still live
    expect(fires[0].secsLeft).toBe(1);
    expect(fires[0].announce).toBe(true);
  });

  it("treats the exact due instant as past due (no stale callout)", () => {
    const fires = dueTimerMechs(gate, 510, 5); // remaining 0
    expect(fires[0].secsLeft).toBe(1);
    expect(fires[0].announce).toBe(false);
  });

  it("marks a fractionally past-due mech non-announcing with secsLeft clamped", () => {
    const fires = dueTimerMechs(gate, 510.4, 5); // remaining -0.4
    expect(fires[0].secsLeft).toBe(1);
    expect(fires[0].announce).toBe(false);
  });
});

describe("topMechPerThreshold", () => {
  it("collapses two mechs sharing an hpBar to one (tie on severity → repeating mech)", () => {
    // Serca G1: Safe Zone (hp, x100) and Maiden Bingo (hp+timer, x100), both major.
    const safeZone = mech({ id: "safe", name: "Safe Zone", hpBar: 100, severity: "major", repeatSecs: null });
    const maiden = mech({ id: "maiden", name: "Maiden Bingo", hpBar: 100, severity: "major", repeatSecs: 60 });
    expect(topMechPerThreshold([safeZone, maiden]).map((m) => m.id)).toEqual(["maiden"]);
    // Order-independent.
    expect(topMechPerThreshold([maiden, safeZone]).map((m) => m.id)).toEqual(["maiden"]);
  });

  it("picks the highest severity on a shared threshold regardless of order", () => {
    const a = mech({ id: "a", hpBar: 100, severity: "normal" });
    const b = mech({ id: "b", hpBar: 100, severity: "wipe" });
    expect(topMechPerThreshold([a, b]).map((m) => m.id)).toEqual(["b"]);
    expect(topMechPerThreshold([b, a]).map((m) => m.id)).toEqual(["b"]);
  });

  it("keeps mechs on distinct thresholds", () => {
    const a = mech({ id: "a", hpBar: 105, severity: "major" });
    const b = mech({ id: "b", hpBar: 100, severity: "major" });
    const ids = topMechPerThreshold([a, b]).map((m) => m.id);
    expect(ids).toHaveLength(2);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
  });

  it("drops mechs with a null hpBar and returns empty for no input", () => {
    expect(topMechPerThreshold([mech({ id: "x", hpBar: null })])).toHaveLength(0);
    expect(topMechPerThreshold([])).toHaveLength(0);
  });
});

describe("gatePhases", () => {
  it("returns empty when no mech has a phase", () => {
    expect(gatePhases([mech({ id: "a", phase: null }), mech({ id: "b", phase: null })])).toEqual([]);
  });

  it("returns the single phase when every mech shares it", () => {
    expect(gatePhases([mech({ id: "a", phase: 1 }), mech({ id: "b", phase: 1 })])).toEqual([1]);
  });

  it("returns distinct phases sorted ascending, ignoring nulls and duplicates", () => {
    const mechs = [
      mech({ id: "a", phase: 3 }),
      mech({ id: "b", phase: 2 }),
      mech({ id: "c", phase: null }),
      mech({ id: "d", phase: 3 })
    ];
    expect(gatePhases(mechs)).toEqual([2, 3]);
  });
});

describe("isPhasedGate", () => {
  it("is false for no phases", () => {
    expect(isPhasedGate([mech({ id: "a", phase: null })])).toBe(false);
  });

  it("is false for a single phase (one tab would be useless)", () => {
    expect(isPhasedGate([mech({ id: "a", phase: 1 }), mech({ id: "b", phase: 1 })])).toBe(false);
  });

  it("is true once two distinct phases are present", () => {
    expect(isPhasedGate([mech({ id: "a", phase: 2 }), mech({ id: "b", phase: 3 })])).toBe(true);
  });
});

describe("scopeToPhase", () => {
  const p2 = mech({ id: "p2", phase: 2 });
  const p3 = mech({ id: "p3", phase: 3 });
  const untagged = mech({ id: "u", phase: null });
  const all = [p2, p3, untagged];

  it("returns all mechs unchanged when phase is null (no scoping)", () => {
    expect(scopeToPhase(all, null)).toEqual(all);
  });

  it("keeps only the selected phase plus untagged mechs", () => {
    expect(scopeToPhase(all, 2).map((m) => m.id)).toEqual(["p2", "u"]);
    expect(scopeToPhase(all, 3).map((m) => m.id)).toEqual(["p3", "u"]);
  });
});

describe("byPhaseThenHp", () => {
  it("groups by phase ascending, then hpBar descending within a phase", () => {
    const mechs = [
      mech({ id: "p3hi", phase: 3, hpBar: 583 }),
      mech({ id: "p2lo", phase: 2, hpBar: 160 }),
      mech({ id: "p2hi", phase: 2, hpBar: 620 }),
      mech({ id: "p3lo", phase: 3, hpBar: 194 })
    ];
    expect([...mechs].sort(byPhaseThenHp).map((m) => m.id)).toEqual(["p2hi", "p2lo", "p3hi", "p3lo"]);
  });

  it("sorts untagged (null phase) mechs after every phased mech", () => {
    const mechs = [mech({ id: "untagged", phase: null, hpBar: 999 }), mech({ id: "p2", phase: 2, hpBar: 100 })];
    expect([...mechs].sort(byPhaseThenHp).map((m) => m.id)).toEqual(["p2", "untagged"]);
  });
});
