import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  settings: { app: { shortcuts: { hideOverlay: "Control+ArrowUp" } }, failedShortcuts: [] as string[] }
}));

vi.mock("@tauri-apps/plugin-global-shortcut", () => ({
  register: mocks.register,
  unregisterAll: vi.fn(() => Promise.resolve())
}));
vi.mock("$lib/api", () => ({ toggleOverlayWindow: vi.fn() }));
vi.mock("$lib/stores.svelte", () => ({ settings: mocks.settings }));
vi.mock("$lib/mech-store.svelte", () => ({ mechStore: { mechSettings: { confirmHotkey: "F8" } } }));
vi.mock("@tauri-apps/api/event", () => ({ emit: vi.fn(() => Promise.resolve()) }));

import {
  failedShortcutNote,
  loaLogsActionFor,
  loaLogsConflictNote,
  normalizeKey,
  registerShortcuts
} from "./shortcuts";

describe("failedShortcutNote", () => {
  const loaLogs = "(LOA Logs uses Ctrl+Up for Show Logs by default)";

  it("names LOA Logs for Ctrl+Up, as saved by the old default or by the key recorder", () => {
    expect(failedShortcutNote("Control+ArrowUp")).toBe(
      `Couldn't register: another app is using this key ${loaLogs}. Pick another.`
    );
    expect(failedShortcutNote("Ctrl+ArrowUp")).toContain(loaLogs);
  });

  it("leaves LOA Logs out for any other key", () => {
    expect(failedShortcutNote("F8")).toBe("Couldn't register: another app is using this key. Pick another.");
    expect(failedShortcutNote("Control+Shift+ArrowUp")).not.toContain("LOA Logs");
    expect(failedShortcutNote("Ctrl+ArrowDown")).not.toContain("LOA Logs");
  });
});

describe("registerShortcuts", () => {
  beforeEach(() => {
    mocks.register.mockReset();
    mocks.settings.failedShortcuts = [];
  });

  it("records a key another app already holds, and not the key that registered", async () => {
    mocks.register.mockImplementation((key: string) =>
      key === "Control+ArrowUp" ? Promise.reject(new Error("HotKey already registered")) : Promise.resolve()
    );
    await registerShortcuts();
    expect(mocks.settings.failedShortcuts).toEqual(["Control+ArrowUp"]);
  });

  it("clears old failures when every key registers", async () => {
    mocks.settings.failedShortcuts = ["Control+ArrowUp"];
    mocks.register.mockResolvedValue(undefined);
    await registerShortcuts();
    expect(mocks.settings.failedShortcuts).toEqual([]);
  });
});

describe("LOA Logs bindings", () => {
  const bindings = { hideMeter: "Ctrl+ArrowUp", showLogs: "", resetSession: "Ctrl+Shift+R" };

  it("treats Control and Ctrl spellings as the same key", () => {
    expect(normalizeKey("Control+ArrowUp")).toBe(normalizeKey("Ctrl+ArrowUp"));
    expect(loaLogsActionFor("Control+ArrowUp", bindings)).toBe("Hide Meter");
    expect(loaLogsActionFor("ctrl+arrowup", bindings)).toBe("Hide Meter");
  });

  it("ignores unbound LOA Logs actions and free keys", () => {
    expect(loaLogsActionFor("", bindings)).toBeNull();
    expect(loaLogsActionFor("Control+Shift+ArrowUp", bindings)).toBeNull();
    expect(loaLogsConflictNote("F8", bindings)).toBeNull();
  });

  it("names the real LOA Logs action in both notes", () => {
    expect(loaLogsConflictNote("Control+ArrowUp", bindings)).toBe(
      "LOA Logs has this key bound to Hide Meter. Whichever app starts first gets it. Pick another."
    );
    expect(failedShortcutNote("Control+ArrowUp", bindings)).toBe(
      "Couldn't register: LOA Logs is using this key for Hide Meter. Pick another."
    );
    expect(loaLogsActionFor("Ctrl+Shift+R", bindings)).toBe("Reset Session");
  });

  it("falls back to the Ctrl+Up default when LOA Logs' settings are unavailable", () => {
    expect(failedShortcutNote("Control+ArrowUp", {})).toContain("Show Logs by default");
    expect(loaLogsConflictNote("Control+ArrowUp", {})).toBeNull();
  });
});
