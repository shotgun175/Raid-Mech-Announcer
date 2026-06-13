import { describe, it, expect } from "vitest";
import { enumerateTtsLines } from "./tts-lines";
import type { Gate, Mechanic } from "../mech-types";

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

function gate(mechanics: Mechanic[]): Gate {
  return {
    id: "g1",
    raid: "R",
    gate: 1,
    boss: "Boss",
    bossType: "",
    weakness: "",
    tauntable: false,
    totalBars: 300,
    mechanics
  };
}

describe("enumerateTtsLines", () => {
  it("warms a bar line for hp mechs and a seconds line for repeating mechs", () => {
    const g = gate([mech({ ttsText: "Bomb", repeatSecs: 60 })]);
    expect(enumerateTtsLines([g], {}, 3, 5)).toEqual(["Bomb in 3 bars", "Bomb in 5 seconds"]);
  });

  it("warms a seconds line for from-pull timer mechs", () => {
    const g = gate([mech({ id: "t", ttsText: "Stagger", hpBar: null, timerSecs: 510, triggerType: "timer" })]);
    expect(enumerateTtsLines([g], {}, 3, 5)).toEqual(["Stagger in 5 seconds"]);
  });

  it("produces nothing for trigger-less mechs", () => {
    const g = gate([mech({ id: "n", ttsText: "Identity", hpBar: null, timerSecs: null, triggerType: "timer" })]);
    expect(enumerateTtsLines([g], {}, 3, 5)).toEqual([]);
  });

  it("skips TTS-disabled mechs and de-duplicates identical lines", () => {
    const g = gate([
      mech({ id: "a", ttsText: "Same", hpBar: 200 }),
      mech({ id: "b", ttsText: "Same", hpBar: 100 }),
      mech({ id: "c", ttsText: "Silent", hpBar: 50, ttsEnabled: false })
    ]);
    expect(enumerateTtsLines([g], {}, 3, 5)).toEqual(["Same in 3 bars"]);
  });
});
