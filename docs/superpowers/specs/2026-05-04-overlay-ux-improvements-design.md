# Overlay UX Improvements — Design Spec

**Date:** 2026-05-04  
**Branch:** feat/mech-announcer-task0  
**Status:** Approved — ready for implementation

---

## Overview

Five improvements to the overlay and settings UI:

1. Codebase rename sweep (LOA Logs vernacular → Raid Mech Announcer)
2. Overlay corner controls + window bounds outline
3. Auto-resize anchored to top-left on fight start
4. Settings tab reorder
5. PeerConnect status footer on all app pages

---

## 1. Rename Sweep

Remove all remaining LOA Logs vocabulary from code internals. Labels in `tray.rs` are already correct; this targets constants, function names, window labels, and config keys.

### Rust (`src-tauri/src/`)

| Before | After |
|---|---|
| `LOGS_WINDOW_LABEL = "logs"` | `SETTINGS_WINDOW_LABEL = "settings"` |
| `METER_WINDOW_LABEL = "main"` | `OVERLAY_WINDOW_LABEL = "main"` (value unchanged — Tauri default) |
| `get_meter_window()` | `get_overlay_window()` |
| `MeterWindow` struct | `OverlayWindow` |
| `TrayCommand::ShowLogs` | `TrayCommand::ShowSettings` |
| `TrayCommand::ShowMeter` | `TrayCommand::ShowOverlay` |
| `TrayCommand::Hide` | `TrayCommand::HideOverlay` |
| `shell_manger` (typo) | `shell_manager` |

### Config

| File | Before | After |
|---|---|---|
| `tauri.conf.json` | `"label": "logs"` | `"label": "settings"` |
| `capabilities/desktop.json` | `"logs"` in windows array | `"settings"` |

### TypeScript

Any hardcoded `"logs"` window label string in frontend code updated to `"settings"`. Tauri event names (`mech:overlay-show`, `mech:boss-status`, etc.) are already correct and unchanged.

---

## 2. Overlay Corner Controls + Window Bounds Outline

### What it does

- A faint dashed border shows the full window bounds so the user can see exactly where the transparent hit area is.
- Two small icon buttons (gear = open Settings, dash = hide overlay) pinned to the top-right corner of the overlay window.
- Both the border and buttons are **only visible when `clickThrough` is `false`**. When click-through is ON they disappear completely — zero interference with gameplay.

### Implementation

**New component: `src/lib/components/mech/overlays/OverlayControls.svelte`**

- Renders at the page level in `(mech)/mech-overlay/+page.svelte`, outside and above all overlay variants.
- Conditionally rendered: `{#if !clickThrough}`.
- Dashed outline: `position: fixed; inset: 0; border: 1px dashed rgba(148,163,184,0.2); border-radius: 6px; pointer-events: none`.
- Corner buttons: `position: fixed; top: 8px; right: 8px; display: flex; gap: 4px`.
  - **Gear button** (settings): `WebviewWindow.getByLabel("settings")` then `.show()` + `.setFocus()`. No new Tauri command needed — `core:window:allow-show` and `core:window:allow-set-focus` are already in `capabilities/desktop.json`.
  - **Dash button** (minimize): `getCurrentWebviewWindow().hide()`.
- Both buttons: 22×22px, `background: rgba(15,23,42,0.88)`, `border: 1px solid rgba(100,116,139,0.35)`, `border-radius: 4px`. SVG icons (Lucide gear + minus line), 12px, stroke `#94a3b8`.

---

## 3. Auto-Resize Anchored to Top-Left

### Behavior

- When `gate` becomes non-null (fight detected and overlay variant activates), the overlay window auto-resizes to tightly wrap the rendered content.
- The **top-left corner stays fixed** — the window grows rightward and downward. On Windows, `setSize()` anchors to top-left by default so no `setPosition()` call is needed.
- A padding of **24px horizontal, 16px vertical** is added around the measured content so nothing clips.
- When the fight ends (`gate` → null), the window resets to a compact "waiting" size (320×60px — just enough for the waiting pill).
- Manual resize mid-fight still works: the `ResizeObserver` fires only once per gate load, not continuously.

### Implementation

In `(mech)/mech-overlay/+page.svelte`:

```typescript
let contentEl = $state<HTMLElement | null>(null);

$effect(() => {
  if (!gate || !contentEl) return;
  const ro = new ResizeObserver(() => {
    const { width, height } = contentEl!.getBoundingClientRect();
    getCurrentWebviewWindow().setSize(
      new LogicalSize(Math.ceil(width) + 48, Math.ceil(height) + 32)
    ).catch(() => {});
    ro.disconnect(); // fire once per gate load
  });
  ro.observe(contentEl);
  return () => ro.disconnect();
});

$effect(() => {
  if (gate) return;
  getCurrentWebviewWindow().setSize(new LogicalSize(320, 60)).catch(() => {});
});
```

A `<div bind:this={contentEl}>` wrapper is placed around the entire `{#if variant === ...}` block in the page template. This avoids threading `bind:this` into each overlay component and gives a single stable element to measure. `LogicalSize` imported from `@tauri-apps/api/window`.

---

## 4. Settings Tab Reorder

In `mech-settings/+page.svelte`, reorder the `{@render tab(...)}` calls and the corresponding `{#if}` / `{:else if}` content blocks:

**New order:** General → Overlay → Overlay Preview → Announcements → Shortcuts → Discord

Currently: General → Announcements → Overlay → Overlay Preview → Shortcuts → Discord

---

## 5. PeerConnect Status Footer

### Behavior

`PeerConnect` moves from the hamburger drawer to a **sticky footer** visible on all `(app)` pages (Raid Editor and Settings). It is removed from `Header.svelte`'s drawer since it is now always on screen.

### Implementation

**`src/routes/(app)/+layout.svelte`** — wrap existing children in a flex column and add the footer:

```svelte
<div class="flex flex-col h-screen">
  <div class="flex-1 overflow-auto">
    {@render children?.()}
  </div>
  <PeerConnect />
</div>
```

`PeerConnect` already has its own border-top and background styling (`border-top: 1px solid #404040; background: #111111`) so it will naturally form a clean footer strip.

**`src/routes/(app)/Header.svelte`** — remove `<PeerConnect />` and its `import` from the drawer section.

---

## Out of Scope

- `autoShowHide` toggle: already exists in Settings → Overlay tab; no change needed.
- Any new Tauri commands: all window operations use existing permissions.
- Overlay variant style changes: only size/position behavior changes, not visual design of variants.

---

## Implementation Order

1. Rename sweep (Rust + config + TS) — isolated, no logic change
2. Tab reorder + PeerConnect footer — pure frontend, low risk
3. OverlayControls component — new component, additive
4. Auto-resize — touches overlay page reactive logic
