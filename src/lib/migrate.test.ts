import { describe, it, expect } from "vitest";
import { normalizeRaids } from "./migrate";

describe("normalizeRaids", () => {
  it("returns [] for non-array input", () => {
    expect(normalizeRaids(null)).toEqual([]);
    expect(normalizeRaids(undefined)).toEqual([]);
    expect(normalizeRaids({})).toEqual([]);
    expect(normalizeRaids("nope")).toEqual([]);
  });

  it("backfills missing gate fields with safe defaults", () => {
    const [g] = normalizeRaids([{ id: "g1", raid: "Brel", gate: 2, boss: "Brel" }]);
    expect(g).toMatchObject({
      id: "g1",
      raid: "Brel",
      gate: 2,
      boss: "Brel",
      bossType: "",
      weakness: "No Weakness",
      tauntable: false,
      totalBars: 300,
      mechanics: []
    });
  });

  it("coerces an invalid/absent severity to 'normal' (prevents SEVERITY[undefined] crash)", () => {
    const [g] = normalizeRaids([
      {
        id: "g1",
        raid: "R",
        gate: 1,
        boss: "B",
        mechanics: [
          { id: "m1", name: "No severity" },
          { id: "m2", name: "Bad severity", severity: "explode" }
        ]
      }
    ]);
    expect(g.mechanics[0].severity).toBe("normal");
    expect(g.mechanics[1].severity).toBe("normal");
  });

  it("backfills mechanic fields and defaults ttsText to the name", () => {
    const [g] = normalizeRaids([
      { id: "g1", raid: "R", gate: 1, boss: "B", mechanics: [{ id: "m1", name: "Bomb", severity: "major" }] }
    ]);
    expect(g.mechanics[0]).toMatchObject({
      id: "m1",
      name: "Bomb",
      severity: "major",
      hpBar: null,
      timerSecs: null,
      phase: null,
      repeatSecs: null,
      triggerType: "hp",
      ttsEnabled: true,
      ttsText: "Bomb",
      notes: ""
    });
  });

  it("preserves origin and key exactly, leaving origin absent when it was absent", () => {
    const [g] = normalizeRaids([
      {
        id: "g1",
        raid: "R",
        gate: 1,
        boss: "B",
        mechanics: [
          { id: "m1", name: "lib", origin: "library", key: "k1", severity: "normal" },
          { id: "m2", name: "pre-migration", severity: "normal" }
        ]
      }
    ]);
    expect(g.mechanics[0].origin).toBe("library");
    expect(g.mechanics[0].key).toBe("k1");
    // Pre-migration mech: origin stays absent so reconcile's guard still skips the gate.
    expect("origin" in g.mechanics[1] ? g.mechanics[1].origin : undefined).toBeUndefined();
    expect(g.mechanics[1].key).toBeUndefined();
  });

  it("keeps only valid phase values (1-4), else null", () => {
    const [g] = normalizeRaids([
      {
        id: "g1",
        raid: "R",
        gate: 1,
        boss: "B",
        mechanics: [
          { id: "m1", name: "p2", severity: "normal", phase: 2 },
          { id: "m2", name: "p9", severity: "normal", phase: 9 },
          { id: "m3", name: "pnull", severity: "normal", phase: null }
        ]
      }
    ]);
    expect(g.mechanics.map((m) => m.phase)).toEqual([2, null, null]);
  });

  it("preserves a valid mechanic source and drops an invalid one", () => {
    const [g] = normalizeRaids([
      {
        id: "g1",
        raid: "R",
        gate: 1,
        boss: "B",
        mechanics: [
          { id: "m1", name: "tagged", severity: "normal", source: "maxroll" },
          { id: "m2", name: "bad-source", severity: "normal", source: "wikipedia" },
          { id: "m3", name: "no-source", severity: "normal" }
        ]
      }
    ]);
    expect(g.mechanics[0].source).toBe("maxroll");
    expect(g.mechanics[1].source).toBeUndefined();
    expect("source" in g.mechanics[2] ? g.mechanics[2].source : undefined).toBeUndefined();
  });

  it("is idempotent: normalizing twice yields the same result", () => {
    const input = [
      { id: "g1", raid: "R", gate: 1, boss: "B", mechanics: [{ id: "m1", name: "x", severity: "major" }] }
    ];
    const once = normalizeRaids(input);
    const twice = normalizeRaids(once);
    expect(twice).toEqual(once);
  });

  it("drops non-object gates and mechanics", () => {
    const [g] = normalizeRaids([
      {
        id: "g1",
        raid: "R",
        gate: 1,
        boss: "B",
        mechanics: [null, "bad", { id: "m1", name: "ok", severity: "normal" }]
      },
      null,
      42
    ]);
    expect(normalizeRaids([{ id: "g1", raid: "R", gate: 1, boss: "B", mechanics: [] }, null, 42])).toHaveLength(1);
    expect(g.mechanics).toHaveLength(1);
    expect(g.mechanics[0].id).toBe("m1");
  });
});
