import { describe, it, expect } from "vitest";
import { formatGate, gateLabel, formatTimer } from "./mech-constants";

describe("formatGate", () => {
  it("renders a whole gate as its number", () => {
    expect(formatGate(1)).toBe("1");
  });

  it("renders a split gate stored as 21 as 2.1", () => {
    expect(formatGate(21)).toBe("2.1");
  });

  it("renders malformed values as ?", () => {
    expect(formatGate(NaN)).toBe("?");
    expect(formatGate(undefined as unknown as number)).toBe("?");
  });
});

describe("gateLabel", () => {
  it("prefixes the formatted gate", () => {
    expect(gateLabel(21)).toBe("Gate 2.1");
  });
});

describe("formatTimer", () => {
  it("renders null as an empty string", () => {
    expect(formatTimer(null)).toBe("");
  });

  it("renders seconds as m:ss", () => {
    expect(formatTimer(70)).toBe("1:10");
  });
});
