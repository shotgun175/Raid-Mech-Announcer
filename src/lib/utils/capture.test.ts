import { describe, it, expect } from "vitest";
import { parseCapture, segmentFights } from "./capture";

const rec = (t: number, d: unknown) => JSON.stringify({ t, d });

describe("parseCapture", () => {
  it("parses valid JSONL and skips blank/garbage lines", () => {
    const jsonl = [
      rec(1, { name: "A", currentBars: 10, totalBars: 10, isDead: false }),
      "",
      "not json",
      rec(2, null)
    ].join("\n");
    const out = parseCapture(jsonl);
    expect(out).toHaveLength(2);
    expect(out[0].t).toBe(1);
    expect(out[1].d).toBeNull();
  });
});

describe("segmentFights", () => {
  const boss = (name: string, bars: number, isDead = false) => ({
    name,
    currentBars: bars,
    totalBars: 100,
    isDead,
    currentHp: bars,
    maxHp: 100,
    currentShield: 0
  });

  it("splits records into fights on a >60s gap", () => {
    const records = [
      { t: 1_000, d: boss("Echidna", 100) },
      { t: 2_000, d: boss("Echidna", 50) },
      { t: 90_000, d: boss("Serca", 100) } // 88s gap -> new fight
    ];
    const fights = segmentFights(records);
    expect(fights).toHaveLength(2);
    expect(fights[0].boss).toBe("Echidna");
    expect(fights[1].boss).toBe("Serca");
  });

  it("labels a fight ending on isDead as a kill, otherwise a wipe", () => {
    const kill = segmentFights([{ t: 1, d: boss("A", 0, true) }]);
    expect(kill[0].outcome).toBe("kill");
    const wipe = segmentFights([{ t: 1, d: boss("A", 30) }]);
    expect(wipe[0].outcome).toBe("wipe");
  });

  it("keeps a mid-fight boss swap in one fight and labels it by the final boss (LOA Logs style)", () => {
    const records = [
      { t: 1_000, d: boss("Act 4: Covetous Master Echidna", 300) },
      { t: 2_000, d: boss("Act 4: Covetous Master Echidna", 0, true) },
      { t: 12_000, d: boss("Brelshaza, Ember in the Ashes", 450) } // 10s gap
    ];
    const fights = segmentFights(records);
    expect(fights).toHaveLength(1);
    expect(fights[0].records).toHaveLength(3);
    expect(fights[0].boss).toBe("Brelshaza, Ember in the Ashes");
  });

  it("labels a fight by its main boss, not a transient mid-fight add", () => {
    // Kazeros G1: an Abyssal Afterimage add spawns mid-fight, but the gate ends on Abyss Lord.
    const records = [
      { t: 1_000, d: boss("Abyss Lord Kazeros", 100) },
      { t: 2_000, d: boss("Abyssal Afterimage", 100) }, // add appears
      { t: 3_000, d: boss("Abyss Lord Kazeros", 60, true) } // add gone, main boss dies
    ];
    const fights = segmentFights(records);
    expect(fights[0].boss).toBe("Abyss Lord Kazeros");
  });

  it("splits a re-pull even when a null disconnect fragments the silence gap", () => {
    // The bug this rule fixes: a wipe -> re-pull gap is broken in two by a `null` PeerJS-drop
    // record, so no single gap is ever large enough for a gap-only rule to split on.
    const records = [
      { t: 1_000, d: boss("Witch of Agony, Serca", 100) },
      { t: 2_000, d: boss("Witch of Agony, Serca", 30) }, // wiping at low HP
      { t: 3_000, d: null }, // PeerJS drop mid-silence
      { t: 8_000, d: boss("Witch of Agony, Serca", 100) } // re-pull, only 5s after the null
    ];
    const fights = segmentFights(records);
    expect(fights).toHaveLength(2);
    expect(fights[0].outcome).toBe("wipe");
    expect(fights[0].records).toHaveLength(2); // null is excluded from the fight
    expect(fights[1].records).toHaveLength(1);
  });

  it("keeps a revival phase in one fight (HP jumps up on continuous data, no silence)", () => {
    // Kazeros G2: Archdemon dies and revives as Death Incarnate with no gap between forms.
    const records = [
      { t: 1_000, d: boss("Archdemon Kazeros", 100) },
      { t: 2_500, d: boss("Archdemon Kazeros", 0, true) },
      { t: 4_000, d: boss("Death Incarnate Kazeros", 100) }, // revival 1.5s later
      { t: 5_500, d: boss("Death Incarnate Kazeros", 0, true) }
    ];
    const fights = segmentFights(records);
    expect(fights).toHaveLength(1);
    expect(fights[0].outcome).toBe("kill");
  });

  it("does not split an early-fight disconnect (HP resumes where it left off, not a re-pull)", () => {
    const records = [
      { t: 1_000, d: boss("Corvus Tul Rak", 100) },
      { t: 2_000, d: null }, // brief drop right after the pull starts
      { t: 16_000, d: boss("Corvus Tul Rak", 98) } // >12s later but HP did not climb back up
    ];
    const fights = segmentFights(records);
    expect(fights).toHaveLength(1);
  });
});
