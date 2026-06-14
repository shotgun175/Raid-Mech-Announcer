import { describe, it, expect } from "vitest";
import { filterByDifficulty, cycleDifficulty, activeDifficultyForGate, DIFFICULTY_STYLE } from "./difficulty";
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
  const stages = ["Stage 1", "Stage 2", "Stage 3"] as const;

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

  it("cycles Horizon Cathedral's Stage 1/2/3 in order and wraps to All", () => {
    expect(cycleDifficulty(null, [...stages])).toBe("Stage 1");
    expect(cycleDifficulty("Stage 1", [...stages])).toBe("Stage 2");
    expect(cycleDifficulty("Stage 2", [...stages])).toBe("Stage 3");
    expect(cycleDifficulty("Stage 3", [...stages])).toBeNull();
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

  it("labels Stage 1/2/3 in all caps and reuses the Normal/Hard/Nightmare colors", () => {
    expect(DIFFICULTY_STYLE["Stage 1"].label).toBe("STAGE 1");
    expect(DIFFICULTY_STYLE["Stage 2"].label).toBe("STAGE 2");
    expect(DIFFICULTY_STYLE["Stage 3"].label).toBe("STAGE 3");
    expect(DIFFICULTY_STYLE["Stage 1"].color).toBe(DIFFICULTY_STYLE.Normal.color);
    expect(DIFFICULTY_STYLE["Stage 2"].color).toBe(DIFFICULTY_STYLE.Hard.color);
    expect(DIFFICULTY_STYLE["Stage 3"].color).toBe(DIFFICULTY_STYLE.Nightmare.color);
  });
});
