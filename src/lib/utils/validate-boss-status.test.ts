import { describe, expect, it } from "vitest";
import { validateBossStatusData } from "./validate-boss-status";

const valid = {
  name: "Narkiel, Aegir's Heart",
  isDead: false,
  currentHp: 1000,
  maxHp: 2000,
  currentShield: 0,
  totalBars: 180,
  currentBars: 120
};

describe("validateBossStatusData", () => {
  it("accepts a well-formed payload and strips unknown keys", () => {
    const result = validateBossStatusData({ ...valid, extraneous: "ignored" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ ...valid, gateId: null, encourageMessage: null, activePhase: null });
      expect(result.data && "extraneous" in result.data).toBe(false);
    }
  });

  it("accepts null (the legitimate clear signal)", () => {
    const result = validateBossStatusData(null);
    expect(result).toEqual({ ok: true, data: null });
  });

  it("drops a payload with a missing name instead of throwing downstream", () => {
    const { name: _name, ...noName } = valid;
    expect(validateBossStatusData(noName).ok).toBe(false);
  });

  it("drops non-finite or absurd bar counts", () => {
    expect(validateBossStatusData({ ...valid, currentBars: Number.NaN }).ok).toBe(false);
    expect(validateBossStatusData({ ...valid, currentBars: Infinity }).ok).toBe(false);
    expect(validateBossStatusData({ ...valid, totalBars: -5 }).ok).toBe(false);
    expect(validateBossStatusData({ ...valid, totalBars: 10_000_000 }).ok).toBe(false);
    expect(validateBossStatusData({ ...valid, currentBars: "120" }).ok).toBe(false);
  });

  it("drops oversized strings (TTS/display/disk all consume these)", () => {
    expect(validateBossStatusData({ ...valid, name: "x".repeat(500) }).ok).toBe(false);
    expect(validateBossStatusData({ ...valid, encourageMessage: "x".repeat(5000) }).ok).toBe(false);
  });

  it("accepts the optional fields when well-formed", () => {
    const result = validateBossStatusData({
      ...valid,
      gateId: "g1",
      encourageMessage: "nice!",
      activePhase: 2
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.data) {
      expect(result.data.gateId).toBe("g1");
      expect(result.data.encourageMessage).toBe("nice!");
      expect(result.data.activePhase).toBe(2);
    }
  });

  it("drops primitives and arrays", () => {
    expect(validateBossStatusData(42).ok).toBe(false);
    expect(validateBossStatusData("boss").ok).toBe(false);
    expect(validateBossStatusData([valid]).ok).toBe(false);
  });
});
