import { describe, it, expect } from "vitest";
import { LIBRARY, gateSwapsBoss, isBossSwapPhase } from "./raid-library";
import type { Gate } from "../mech-types";

function gateFixture(raid: string, gate: number, boss: string): Gate {
  return { id: "x", raid, gate, boss, bossType: "", weakness: "", tauntable: false, totalBars: 300, mechanics: [] };
}

describe("LIBRARY key uniqueness", () => {
  it("every mech has a unique key across all gates", () => {
    const seen = new Map<string, string>();
    for (const gate of LIBRARY) {
      for (const mech of gate.mechanics) {
        const prior = seen.get(mech.key);
        if (prior) {
          throw new Error(`Duplicate library key "${mech.key}" appears in both "${prior}" and "${gate.encounterKey}"`);
        }
        seen.set(mech.key, gate.encounterKey);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it("every mech key is non-empty", () => {
    for (const gate of LIBRARY) {
      for (const mech of gate.mechanics) {
        expect(mech.key.length, `${gate.encounterKey} has empty-key mech "${mech.name}"`).toBeGreaterThan(0);
      }
    }
  });
});

describe("gateSwapsBoss", () => {
  it("is true for Act 4: Armoche G1 (Echidna swaps to Brelshaza)", () => {
    expect(gateSwapsBoss("Act 4: Armoche", 1)).toBe(true);
  });

  it("is false for a normal single-boss gate", () => {
    expect(gateSwapsBoss("Act 4: Armoche", 2)).toBe(false);
  });

  it("is false for an unknown raid or gate", () => {
    expect(gateSwapsBoss("Not A Raid", 1)).toBe(false);
    expect(gateSwapsBoss("Act 4: Armoche", 99)).toBe(false);
  });
});

describe("isBossSwapPhase", () => {
  const armocheG1 = gateFixture("Act 4: Armoche", 1, "Act 4: Covetous Master Echidna");

  it("is true once the live boss differs from the gate's listed boss on a swap gate", () => {
    expect(isBossSwapPhase(armocheG1, "Brelshaza, Ember in the Ashes")).toBe(true);
  });

  it("is false while the listed (first) boss is still live", () => {
    expect(isBossSwapPhase(armocheG1, "Act 4: Covetous Master Echidna")).toBe(false);
  });

  it("is false for a non-swap gate even if the live boss differs", () => {
    const g2 = gateFixture("Act 4: Armoche", 2, "Armoche, Sentinel of the Abyss");
    expect(isBossSwapPhase(g2, "Some Other Boss")).toBe(false);
  });

  it("is false when the live boss is empty", () => {
    expect(isBossSwapPhase(armocheG1, "")).toBe(false);
  });
});
