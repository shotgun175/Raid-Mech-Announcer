import { describe, it, expect } from "vitest";
import { reconcile } from "./reconciliation";
import type { Gate, Mechanic } from "./mech-types";
import type { LibraryGate, LibraryMechanic } from "./data/raid-library";

// Test helpers --------------------------------------------------------------

function libMech(key: string, name: string, hpBar: number, over: Partial<LibraryMechanic> = {}): LibraryMechanic {
  return { key, name, severity: "major", triggerType: "hp", hpBar, ...over };
}

function libGate(raid: string, gate: number, mechs: LibraryMechanic[], over: Partial<LibraryGate> = {}): LibraryGate {
  return {
    encounterKey: `${raid} G${gate}`,
    raid,
    gate,
    releaseOrder: 99,
    boss: "Test Boss",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: mechs,
    ...over
  };
}

function userMech(over: Partial<Mechanic> & { origin: "library" | "custom" }): Mechanic {
  return {
    id: `user-${over.key ?? over.name ?? "x"}`,
    name: "M",
    severity: "major",
    hpBar: 100,
    timerSecs: null,
    phase: null,
    repeatSecs: null,
    triggerType: "hp",
    ttsEnabled: true,
    ttsText: "",
    notes: "",
    userEdited: false,
    ...over
  };
}

function userGate(raid: string, gate: number, mechs: Mechanic[], over: Partial<Gate> = {}): Gate {
  return {
    id: `gate-${raid}-${gate}`,
    raid,
    gate,
    boss: "Test Boss",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    totalBars: 300,
    mechanics: mechs,
    ...over
  };
}

// Tests ----------------------------------------------------------------------

describe("reconcile", () => {
  it("returns unchanged when user gate exactly matches library", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "A", 200)])];
    const user = [
      userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" })])
    ];
    const { raids, changedGateIds } = reconcile(lib, user);
    expect(changedGateIds.size).toBe(0);
    expect(raids[0].mechanics[0].name).toBe("A");
  });

  it("skips custom gates (no library match by raid+gate)", () => {
    const lib = [libGate("Other", 1, [libMech("other-g1-x", "X", 100)])];
    const user = [userGate("Custom", 5, [userMech({ name: "My Mech", origin: "custom", userEdited: true })])];
    const { raids, changedGateIds } = reconcile(lib, user);
    expect(changedGateIds.size).toBe(0);
    expect(raids[0]).toEqual(user[0]);
  });

  it("Step A: overwrites mismatched gate-level fields (boss)", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "A", 200)], { boss: "New Boss Name" })];
    const user = [
      userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" })], {
        boss: "Old Boss Name"
      })
    ];
    const { raids, changedGateIds } = reconcile(lib, user);
    expect(raids[0].boss).toBe("New Boss Name");
    expect(changedGateIds.has(user[0].id)).toBe(true);
  });

  it("Step A: overwrites mismatched totalBars via LibraryGate.totalBars override", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "A", 200)], { totalBars: 420 })];
    const user = [
      userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" })], {
        totalBars: 300
      })
    ];
    const { raids, changedGateIds } = reconcile(lib, user);
    expect(raids[0].totalBars).toBe(420);
    expect(changedGateIds.has(user[0].id)).toBe(true);
  });

  it("Step A: no-op when all gate-level fields match", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "A", 200)])];
    const user = [
      userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" })])
    ];
    const { changedGateIds } = reconcile(lib, user);
    expect(changedGateIds.size).toBe(0);
  });
});
