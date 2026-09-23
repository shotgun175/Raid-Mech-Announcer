import { describe, it, expect } from "vitest";
import {
  filterByDifficulty,
  raidAvailableDifficulties,
  baseDifficulty,
  resolveDifficulty,
  DIFFICULTY_STYLE
} from "./difficulty";
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

function gateFix(overrides: Partial<Gate> = {}): Gate {
  return {
    id: "g1",
    raid: "Custom Raid",
    gate: 1,
    boss: "Boss",
    bossType: "Human",
    weakness: "No Weakness",
    tauntable: false,
    totalBars: 100,
    mechanics: [],
    ...overrides
  };
}

describe("raidAvailableDifficulties", () => {
  it("unions the raid's own gates' lists in display order (custom raids)", () => {
    const gates = [
      gateFix({ id: "g1", availableDifficulties: ["Hard"] }),
      gateFix({ id: "g2", gate: 2, availableDifficulties: ["Normal"] })
    ];
    expect(raidAvailableDifficulties("Custom Raid", gates)).toEqual(["Normal", "Hard"]);
  });

  it("falls back to the library entry when the gates carry no list", () => {
    expect(raidAvailableDifficulties("Valtan", [])).toEqual(["Solo", "Normal", "Hard"]);
  });

  it("falls back to Normal/Hard for unknown raids", () => {
    expect(raidAvailableDifficulties("Not A Raid", [])).toEqual(["Normal", "Hard"]);
  });

  it("lists silent Solo for the three Summer 2026 raids", () => {
    expect(raidAvailableDifficulties("Act 4: Armoche", [])).toContain("Solo");
    expect(raidAvailableDifficulties("Final Act: Kazeros", [])).toContain("Solo");
    expect(raidAvailableDifficulties("Serca", [])).toContain("Solo");
  });
});

describe("baseDifficulty", () => {
  it("picks the first non-Solo tier in display order", () => {
    expect(baseDifficulty(["Solo", "Normal", "Hard"])).toBe("Normal");
    expect(baseDifficulty(["Normal", "Hard", "Nightmare"])).toBe("Normal");
  });

  it("picks Hard for a Hard-only raid", () => {
    expect(baseDifficulty(["Hard"])).toBe("Hard");
  });

  it("picks Stage 1 for Horizon-style stage raids", () => {
    expect(baseDifficulty(["Stage 1", "Stage 2", "Stage 3"])).toBe("Stage 1");
  });

  it("falls back to Solo only when Solo is the sole tier", () => {
    expect(baseDifficulty(["Solo"])).toBe("Solo");
  });

  it("falls back to Normal for an empty list", () => {
    expect(baseDifficulty([])).toBe("Normal");
  });
});

describe("resolveDifficulty", () => {
  it("returns the stored pick for a raid", () => {
    expect(resolveDifficulty({ Echidna: "Hard" }, "Echidna", [])).toBe("Hard");
  });

  it("defaults an unset raid to its base tier, never an unfiltered All", () => {
    expect(resolveDifficulty({}, "Valtan", [])).toBe("Normal");
  });

  it("never defaults to Solo even when the raid offers it", () => {
    expect(resolveDifficulty({}, "Act 4: Armoche", [])).toBe("Normal");
  });

  it("honors an explicit Solo pick", () => {
    expect(resolveDifficulty({ "Act 4: Armoche": "Solo" }, "Act 4: Armoche", [])).toBe("Solo");
  });

  it("ignores a stored value outside the known tiers and falls back to the base tier", () => {
    expect(resolveDifficulty({ Valtan: "Bogus" }, "Valtan", [])).toBe("Normal");
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
