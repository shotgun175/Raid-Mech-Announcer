# Difficulty Dropdown — Design Spec

**Date:** 2026-05-06  
**Branch:** feat/difficulty-dropdown  
**Status:** Approved

## Problem

The difficulty chip next to each raid name in the sidebar requires multiple clicks to cycle through options (All → Solo → Normal → Hard → Nightmare → All). With up to 4 difficulties per raid, reaching a specific one can take 3–4 clicks.

## Goal

Replace the cycle-on-click chip with a floating panel dropdown that lets the user jump directly to any difficulty in one click.

## Scope

Two files change. Nothing else.

- `src/lib/utils/difficulty.ts` — label fix
- `src/lib/components/mech/GateSidebar.svelte` — chip interaction

## Changes

### 1. `difficulty.ts` — Label fix

Change `DIFFICULTY_STYLE.Nightmare.label` from `"NM"` to `"Nightmare"`.

This propagates automatically to every place that reads `.label`: the sidebar chip, MechRow difficulty pills, and any overlay components that render the label string.

### 2. `GateSidebar.svelte` — Floating panel dropdown

**State:** Add one reactive variable `let openDiffDropdown = $state<string | null>(null)` at the top of the script block. It holds the `raidName` of the currently-open panel, or `null` if closed. Only one panel can be open at a time.

**Chip button (trigger):**
- Keep the chip's existing appearance and position exactly as-is.
- Change `onclick` from calling `cycleDifficulty` to toggling `openDiffDropdown`:
  - If `openDiffDropdown === raidName` → set to `null` (close).
  - Otherwise → set to `raidName` (open, closing any other open panel).
- Remove `onmouseenter`/`onmouseleave` opacity effects (not needed with a dropdown trigger).
- Keep `title="Select difficulty"`.

**Floating panel:**
- Rendered with `{#if openDiffDropdown === raidName}` inside the same `position: relative` wrapper as the chip.
- Position: `position: absolute; right: 0; top: 100%; margin-top: 3px; z-index: 20`.
- Background `#1a1a1a`, border `1px solid #333`, border-radius `4px`, `min-width: 100px`, box-shadow `0 4px 14px rgba(0,0,0,0.6)`.
- Contains one row per option, in order: **All** (null), then each difficulty returned by `availableDifficultiesFor(raidName)` in `DIFFICULTY_ORDER` sequence.
- Each row: `padding: 4px 10px`, `font-size: 10px`, `cursor: pointer`, colored with the difficulty's `DIFFICULTY_STYLE` (or dim `#525252` for All).
- Active option shows a `✓` at the right edge.
- Row `onclick`: calls `mechStore.setDifficulty(raidName, chosen)` (passing `null` for All), then sets `openDiffDropdown = null`.

**Dismiss on outside click:**
- A zero-opacity full-screen backdrop `<div>` rendered below the panel (z-index 19) catches outside clicks and sets `openDiffDropdown = null`. This is the simplest approach with no extra utilities needed.

**No Melt UI dependency** — plain Svelte `$state` + backdrop div is sufficient for a small inline dropdown.

## Out of Scope

- No animation/transition on open/close (keeps it simple).
- No keyboard navigation (arrow keys, Escape) — future enhancement if needed.
- No changes to the overlay window, settings page, or MechModal difficulty logic.

## Acceptance Criteria

1. Clicking the chip opens a panel listing All + all available difficulties for that raid.
2. Clicking any option immediately applies the filter and closes the panel.
3. Clicking outside (backdrop) closes the panel without changing the selection.
4. Only one panel can be open at a time — opening a second raid's panel closes the first.
5. The chip still reflects the active difficulty (label + color) exactly as before.
6. "Nightmare" label appears everywhere that previously showed "NM".
