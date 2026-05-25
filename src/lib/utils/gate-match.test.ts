import { describe, it, expect } from "vitest";
import { bestGateMatch } from "./gate-match";
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
