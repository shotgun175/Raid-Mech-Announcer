import { describe, it, expect } from "vitest";
import { LIBRARY } from "./raid-library";

describe("LIBRARY key uniqueness", () => {
  it("every mech has a unique key across all gates", () => {
    const seen = new Map<string, string>();
    for (const gate of LIBRARY) {
      for (const mech of gate.mechanics) {
        const prior = seen.get(mech.key);
        if (prior) {
          throw new Error(`Duplicate library key "${mech.key}" appears in both "${prior}" and "${gate.encounterKey}"`);
        }
        seen.set(mech.key, gate.encounterKey);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it("every mech key is non-empty", () => {
    for (const gate of LIBRARY) {
      for (const mech of gate.mechanics) {
        expect(mech.key.length, `${gate.encounterKey} has empty-key mech "${mech.name}"`).toBeGreaterThan(0);
      }
    }
  });
});
