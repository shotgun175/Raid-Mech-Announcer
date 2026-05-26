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

  it("keeps a mid-fight boss swap in one fight (gap under 60s)", () => {
    const records = [
      { t: 1_000, d: boss("Act 4: Covetous Master Echidna", 300) },
      { t: 2_000, d: boss("Act 4: Covetous Master Echidna", 0, true) },
      { t: 12_000, d: boss("Brelshaza, Ember in the Ashes", 450) } // 10s gap
    ];
    const fights = segmentFights(records);
    expect(fights).toHaveLength(1);
    expect(fights[0].records).toHaveLength(3);
  });
});
