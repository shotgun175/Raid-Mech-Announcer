import { describe, it, expect } from "vitest";
import { filterByDifficulty, cycleDifficulty, activeDifficultyForGate, DIFFICULTY_STYLE } from "./difficulty";
import type { Mechanic } from "../mech-types";

function mech(overrides: Partial<Mechanic> = {}): Mechanic {
  return {
    id: "m1", name: "Test", severity: "major", hpBar: 100, timerSecs: null,
    phase: null, repeatSecs: null, triggerType: "hp", ttsEnabled: true,
    ttsText: "Test", notes: "", ...overrides
  };
}

describe("filterByDifficulty", () => {
  it("returns all mechanics when difficulty is null", () => {
    const mechanics = [mech(), mech({ id: "m2", difficulties: ["Hard"] })];
    expect(filterByDifficulty(mechanics, null)).toHaveLength(2);
  });

  it("includes mechanics with no difficulties array", () => {
    const mechanics = [mech({ difficulties: undefined })];
    expect(filterByDifficulty(mechanics, "Hard")).toHaveLength(1);
  });

  it("includes mechanics with empty difficulties array", () => {
    const mechanics = [mech({ difficulties: [] })];
    expect(filterByDifficulty(mechanics, "Normal")).toHaveLength(1);
  });

  it("excludes mechanics tagged for a different difficulty", () => {
    const mechanics = [mech({ difficulties: ["Hard"] })];
    expect(filterByDifficulty(mechanics, "Normal")).toHaveLength(0);
  });

  it("includes mechanics tagged for the active difficulty", () => {
    const mechanics = [mech({ difficulties: ["Hard", "Nightmare"] })];
    expect(filterByDifficulty(mechanics, "Hard")).toHaveLength(1);
    expect(filterByDifficulty(mechanics, "Nightmare")).toHaveLength(1);
    expect(filterByDifficulty(mechanics, "Normal")).toHaveLength(0);
  });
});

describe("cycleDifficulty", () => {
  const avail = ["Solo", "Normal", "Hard"] as const;

  it("null → first available", () => {
    expect(cycleDifficulty(null, [...avail])).toBe("Solo");
  });

  it("last → null (All)", () => {
    expect(cycleDifficulty("Hard", [...avail])).toBeNull();
  });

  it("mid → next", () => {
    expect(cycleDifficulty("Solo", [...avail])).toBe("Normal");
    expect(cycleDifficulty("Normal", [...avail])).toBe("Hard");
  });

  it("skips unavailable difficulties", () => {
    expect(cycleDifficulty(null, ["Normal", "Hard"])).toBe("Normal");
  });

  it("returns null when available list is empty", () => {
    expect(cycleDifficulty(null, [])).toBeNull();
  });
});

describe("activeDifficultyForGate", () => {
  it("returns the stored difficulty for a raid", () => {
    expect(activeDifficultyForGate({ Echidna: "Hard" }, "Echidna")).toBe("Hard");
  });

  it("returns null when the raid has no entry", () => {
    expect(activeDifficultyForGate({}, "Valtan")).toBeNull();
  });
});

describe("DIFFICULTY_STYLE", () => {
  it("uses all-caps NIGHTMARE label consistent with other difficulties", () => {
    expect(DIFFICULTY_STYLE.Nightmare.label).toBe("NIGHTMARE");
  });
});
