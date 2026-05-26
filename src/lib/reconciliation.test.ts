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
    const user = [userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" })])];
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
    const user = [userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" })])];
    const { changedGateIds } = reconcile(lib, user);
    expect(changedGateIds.size).toBe(0);
  });

  it("Step B path 1: library mech, userEdited:false → overwrites fields", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "Renamed A", 250)])];
    const user = [
      userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library", userEdited: false })])
    ];
    const { raids, changedGateIds } = reconcile(lib, user);
    expect(raids[0].mechanics[0].name).toBe("Renamed A");
    expect(raids[0].mechanics[0].hpBar).toBe(250);
    expect(raids[0].mechanics[0].userEdited).toBe(false);
    expect(changedGateIds.has(user[0].id)).toBe(true);
  });

  it("Step B path 2: library mech, userEdited:true → preserved", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "Renamed A", 250)])];
    const user = [
      userGate("Test", 1, [
        userMech({ key: "test-g1-a", name: "My A", hpBar: 200, origin: "library", userEdited: true })
      ])
    ];
    const { raids, changedGateIds } = reconcile(lib, user);
    expect(raids[0].mechanics[0].name).toBe("My A");
    expect(raids[0].mechanics[0].hpBar).toBe(200);
    expect(changedGateIds.has(user[0].id)).toBe(false);
  });

  it("Step B path 3: library removes a mech → dropped from user gate", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-b", "B", 100)])];
    const user = [
      userGate("Test", 1, [
        userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" }),
        userMech({ key: "test-g1-b", name: "B", hpBar: 100, origin: "library" })
      ])
    ];
    const { raids, changedGateIds } = reconcile(lib, user);
    expect(raids[0].mechanics).toHaveLength(1);
    expect(raids[0].mechanics[0].key).toBe("test-g1-b");
    expect(changedGateIds.has(user[0].id)).toBe(true);
  });

  it("Step B: custom mech preserved untouched", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "A", 200)])];
    const user = [
      userGate("Test", 1, [
        userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" }),
        userMech({ name: "My Reminder", hpBar: 150, origin: "custom", userEdited: true })
      ])
    ];
    const { raids, changedGateIds } = reconcile(lib, user);
    expect(raids[0].mechanics).toHaveLength(2);
    expect(raids[0].mechanics.some((m) => m.name === "My Reminder")).toBe(true);
    expect(changedGateIds.has(user[0].id)).toBe(false);
  });

  it("Step C: library adds a new mech → appears in user gate with origin:library", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "A", 200), libMech("test-g1-b", "B", 100)])];
    const user = [userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" })])];
    const { raids, changedGateIds } = reconcile(lib, user);
    expect(raids[0].mechanics).toHaveLength(2);
    const added = raids[0].mechanics.find((m) => m.key === "test-g1-b")!;
    expect(added).toBeDefined();
    expect(added.origin).toBe("library");
    expect(added.userEdited).toBe(false);
    expect(added.name).toBe("B");
    expect(changedGateIds.has(user[0].id)).toBe(true);
  });

  it("Step C: respects deletedLibraryKeys → does NOT re-add", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "A", 200), libMech("test-g1-b", "B", 100)])];
    const user = [
      userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" })], {
        deletedLibraryKeys: ["test-g1-b"]
      })
    ];
    const { raids, changedGateIds } = reconcile(lib, user);
    expect(raids[0].mechanics).toHaveLength(1);
    expect(raids[0].mechanics[0].key).toBe("test-g1-a");
    expect(changedGateIds.has(user[0].id)).toBe(false);
  });

  it("Step C: prunes stale deletedLibraryKeys (key no longer in library)", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "A", 200)])];
    const user = [
      userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" })], {
        deletedLibraryKeys: ["test-g1-stale", "test-g1-zombie"]
      })
    ];
    const { raids } = reconcile(lib, user);
    expect(raids[0].deletedLibraryKeys).toEqual([]);
  });

  it("mech ordering: library order first, customs at end (preserving custom insertion order)", () => {
    const lib = [
      libGate("Test", 1, [
        libMech("test-g1-a", "A", 300),
        libMech("test-g1-b", "B", 200),
        libMech("test-g1-c", "C", 100)
      ])
    ];
    const user = [
      userGate("Test", 1, [
        userMech({ key: "test-g1-c", name: "C", hpBar: 100, origin: "library" }),
        userMech({ name: "Custom1", hpBar: 50, origin: "custom", userEdited: true }),
        userMech({ key: "test-g1-a", name: "A", hpBar: 300, origin: "library" }),
        userMech({ name: "Custom2", hpBar: 40, origin: "custom", userEdited: true }),
        userMech({ key: "test-g1-b", name: "B", hpBar: 200, origin: "library" })
      ])
    ];
    const { raids } = reconcile(lib, user);
    const names = raids[0].mechanics.map((m) => m.name);
    expect(names).toEqual(["A", "B", "C", "Custom1", "Custom2"]);
  });

  it("defensive guard: gate with any unstamped mech (no origin) → skipped entirely", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "Renamed A", 250)])];
    const unstamped: Mechanic = {
      id: "user-test-g1-a",
      name: "Old",
      severity: "major",
      hpBar: 200,
      timerSecs: null,
      phase: null,
      repeatSecs: null,
      triggerType: "hp",
      ttsEnabled: true,
      ttsText: "",
      notes: ""
      // origin and userEdited intentionally missing (simulates pre-migration data)
    } as unknown as Mechanic;
    const user = [userGate("Test", 1, [unstamped])];
    const { raids, changedGateIds } = reconcile(lib, user);
    expect(raids[0].mechanics[0].name).toBe("Old");
    expect(changedGateIds.has(user[0].id)).toBe(false);
  });

  it("carries the library phase onto a reconciled library mech", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "A", 200, { phase: 2 })])];
    const user = [
      userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library", phase: null })])
    ];
    const { raids } = reconcile(lib, user);
    expect(raids[0].mechanics[0].phase).toBe(2);
  });

  it("adds a new library mech with its phase", () => {
    const lib = [
      libGate("Test", 1, [libMech("test-g1-a", "A", 200, { phase: 2 }), libMech("test-g1-b", "B", 100, { phase: 3 })])
    ];
    const user = [
      userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library", phase: 2 })])
    ];
    const { raids } = reconcile(lib, user);
    const added = raids[0].mechanics.find((m) => m.key === "test-g1-b");
    expect(added?.phase).toBe(3);
  });

  it("drops a user library-gate whose (raid, gate) was removed from the library", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "A", 200)])];
    const user = [
      userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" })]),
      userGate("Test", 2, [userMech({ key: "test-g2-a", name: "Old", hpBar: 100, origin: "library" })])
    ];
    const { raids } = reconcile(lib, user);
    expect(raids).toHaveLength(1);
    expect(raids[0].gate).toBe(1);
  });

  it("keeps a user custom gate on a library raid (has custom mechs)", () => {
    const lib = [libGate("Test", 1, [libMech("test-g1-a", "A", 200)])];
    const user = [
      userGate("Test", 1, [userMech({ key: "test-g1-a", name: "A", hpBar: 200, origin: "library" })]),
      userGate("Test", 9, [userMech({ name: "Custom", hpBar: 100, origin: "custom", userEdited: true })])
    ];
    const { raids } = reconcile(lib, user);
    expect(raids).toHaveLength(2);
  });
});
