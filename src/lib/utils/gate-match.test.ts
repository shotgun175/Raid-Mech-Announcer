import { describe, it, expect } from "vitest";
import { bestGateMatch, isFinalGateOfRaid } from "./gate-match";
import type { Gate } from "../mech-types";

function gate(boss: string, id = boss): Gate {
  return {
    id,
    raid: "R",
    gate: 1,
    boss,
    bossType: "",
    weakness: "",
    tauntable: false,
    totalBars: 300,
    mechanics: []
  };
}

function raidGate(raid: string, gateNum: number, id = `${raid}-${gateNum}`): Gate {
  return {
    id,
    raid,
    gate: gateNum,
    boss: id,
    bossType: "",
    weakness: "",
    tauntable: false,
    totalBars: 300,
    mechanics: []
  };
}

describe("bestGateMatch", () => {
  const armocheG2 = gate("Armoche, Sentinel of the Abyss", "g2");
  const echidnaGate = gate("Echidna", "ech");
  const armocheG1 = gate("Act 4: Covetous Master Echidna", "g1");

  it("matches an identical comma-containing name (regression: Armoche G2)", () => {
    // Old logic compared only the pre-comma core "Armoche" (7/30 = ~0.23 < 0.24) and returned null.
    expect(bestGateMatch([armocheG2], "Armoche, Sentinel of the Abyss")?.id).toBe("g2");
  });

  it("matches a phase-name variant against a short core name", () => {
    expect(bestGateMatch([echidnaGate], "Desire in Full Bloom, Echidna")?.id).toBe("ech");
  });

  it("does not bind a short core name to an unrelated long name", () => {
    // "Echidna" vs "Act 4: Covetous Master Echidna" is ~0.23, below threshold.
    expect(bestGateMatch([echidnaGate], "Act 4: Covetous Master Echidna")).toBeNull();
  });

  it("picks the exact full-name gate over a weaker partial", () => {
    expect(bestGateMatch([echidnaGate, armocheG1], "Act 4: Covetous Master Echidna")?.id).toBe("g1");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(bestGateMatch([armocheG2], "  armoche, SENTINEL of the abyss ")?.id).toBe("g2");
  });

  it("returns null when nothing clears the threshold", () => {
    expect(bestGateMatch([armocheG2], "Totally Different Boss")).toBeNull();
    expect(bestGateMatch([armocheG2], "")).toBeNull();
  });
});

describe("isFinalGateOfRaid", () => {
  it("treats a lone gate as final", () => {
    const only = raidGate("Brel", 1);
    expect(isFinalGateOfRaid([only], only)).toBe(true);
  });

  it("flags the highest gate as final and earlier gates as not", () => {
    const g1 = raidGate("Brel", 1);
    const g2 = raidGate("Brel", 2);
    const g3 = raidGate("Brel", 3);
    const raids = [g1, g2, g3];
    expect(isFinalGateOfRaid(raids, g1)).toBe(false);
    expect(isFinalGateOfRaid(raids, g2)).toBe(false);
    expect(isFinalGateOfRaid(raids, g3)).toBe(true);
  });

  it("orders split gates (21/22/23 -> 2.1/2.2/2.3) so the last sub-gate is final", () => {
    const g1 = raidGate("Aegir", 1);
    const g21 = raidGate("Aegir", 21);
    const g22 = raidGate("Aegir", 22);
    const raids = [g1, g21, g22];
    expect(isFinalGateOfRaid(raids, g1)).toBe(false);
    expect(isFinalGateOfRaid(raids, g21)).toBe(false);
    expect(isFinalGateOfRaid(raids, g22)).toBe(true);
  });

  it("scopes to the gate's own raid, ignoring other raids' gate numbers", () => {
    const brelG1 = raidGate("Brel", 1);
    const akkanG9 = raidGate("Akkan", 9);
    // brelG1 is the only Brel gate present -> final for its raid, despite Akkan having a higher number.
    expect(isFinalGateOfRaid([brelG1, akkanG9], brelG1)).toBe(true);
  });
});
