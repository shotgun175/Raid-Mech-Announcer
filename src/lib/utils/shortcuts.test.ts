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

import { registerShortcuts } from "./shortcuts";

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
