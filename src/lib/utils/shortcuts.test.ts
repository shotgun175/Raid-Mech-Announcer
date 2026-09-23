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

import { failedShortcutNote, registerShortcuts } from "./shortcuts";

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
