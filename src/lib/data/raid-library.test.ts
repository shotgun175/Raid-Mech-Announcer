import { describe, it, expect } from "vitest";
import { LIBRARY, buildLibraryGate, gateSwapsBoss, isBossSwapPhase, type LibraryGate } from "./raid-library";
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

describe("library size matches the documented counts", () => {
  // CLAUDE.md and README both claim "42 gates, 244 mechanics". This pins the
  // claim so the docs and the data cannot silently drift — update BOTH the
  // docs and these numbers when the library grows.
  it("has 42 gates and 244 mechanics", () => {
    expect(LIBRARY.length).toBe(42);
    const mechCount = LIBRARY.reduce((n, gate) => n + gate.mechanics.length, 0);
    expect(mechCount).toBe(244);
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

describe("mechanic provenance (source)", () => {
  it("propagates a gate-level source to every built mechanic", () => {
    const valtanG1 = LIBRARY.find((g) => g.encounterKey === "Valtan G1");
    expect(valtanG1?.source).toBe("maxroll");
    const built = buildLibraryGate(valtanG1!);
    expect(built.mechanics.length).toBeGreaterThan(0);
    for (const m of built.mechanics) {
      expect(m.source).toBe("maxroll");
    }
  });

  it("every library gate carries a provenance source", () => {
    const untagged = LIBRARY.filter((g) => g.source === undefined).map((g) => g.encounterKey);
    expect(untagged).toEqual([]);
  });

  it("leaves mechanics unstamped when a gate has no provenance recorded", () => {
    // No library gate is untagged anymore; the absent-source behavior still
    // matters for user-authored gates, so pin it with a synthetic one.
    const synthetic: LibraryGate = {
      encounterKey: "Unstamped Test G1",
      raid: "Unstamped Test",
      gate: 1,
      releaseOrder: 998,
      boss: "Test Boss",
      bossType: "",
      weakness: "",
      tauntable: false,
      mechanics: [{ key: "unstamped-a", name: "A", severity: "normal", triggerType: "hp", hpBar: 10 }]
    };
    for (const m of buildLibraryGate(synthetic).mechanics) {
      expect(m.source).toBeUndefined();
    }
  });

  it("lets a per-mechanic source override the gate default", () => {
    const synthetic: LibraryGate = {
      encounterKey: "Provenance Test G1",
      raid: "Provenance Test",
      gate: 1,
      releaseOrder: 999,
      boss: "Test Boss",
      bossType: "",
      weakness: "",
      tauntable: false,
      source: "maxroll",
      mechanics: [
        { key: "prov-a", name: "A", severity: "normal", triggerType: "hp", hpBar: 10 },
        { key: "prov-b", name: "B", severity: "normal", triggerType: "hp", hpBar: 5, source: "verified-in-fight" }
      ]
    };
    const built = buildLibraryGate(synthetic);
    expect(built.mechanics[0].source).toBe("maxroll");
    expect(built.mechanics[1].source).toBe("verified-in-fight");
  });
});
