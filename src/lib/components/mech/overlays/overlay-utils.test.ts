import { describe, expect, it } from "vitest";
import { hpBarColor } from "./overlay-utils";

describe("hpBarColor", () => {
  it("returns a defined color when totalBars is 0", () => {
    expect(hpBarColor(0, 0)).toBeDefined();
    expect(hpBarColor(5, 0)).toBeDefined();
  });
});
