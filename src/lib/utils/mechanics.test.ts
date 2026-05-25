import { describe, it, expect } from "vitest";
import { activeRepeatMech } from "./mechanics";
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
