# Difficulty-Aware Mechanic Filtering — Design Spec

**Date:** 2026-05-06  
**Status:** Approved  
**Branch:** feat/difficulty-filtering

---

## Problem

The raid library has mechanics for all difficulty variants of a gate (Normal, Hard, Nightmare, Solo) stored in a flat list. The overlay announces every mechanic regardless of what difficulty the player is actually running, creating noise. Example: Echidna G2 "Final Struggle" only occurs in Hard — Normal runs never see it, but it still fires.

---

## Decisions

| Question | Answer |
|---|---|
| How is difficulty selected? | Manual badge per raid group in GateSidebar |
| Granularity | Per raid (not per gate) — all gates in a raid share one difficulty |
| Auto-detection from LOA Logs? | No — difficulty only appears at fight-end in the log, too late and unreliable for multi-character accounts |
| Badge interaction | Style A: inline chip, click cycles through available difficulties |
| Cycle order | Solo → Normal → Hard → Nightmare → All (unset) |
| Solo availability | Raids up to Act 3: Mordum only — later raids show N/H |
| Nightmare availability | Serca only (for now) |
| Filtering depth | Overlay + Editor (Approach 2) — editor and live overlay both respect difficulty |
| Persistence | `localStorage` key `"mech-difficulty-map"` (`Record<string, string>`) |

---

## Color Palette

| Difficulty | Text | Background | Border |
|---|---|---|---|
| Solo | `#3b82f6` | `#0d1220` | `#3b82f633` |
| Normal | `#9ca3af` | `#1a1a1a` | `#6b728033` |
| Hard | `#fb923c` | `#1a0f00` | `#fb923c33` |
| Nightmare | `#a855f7` | `#120d1a` | `#a855f733` |
| All (unset) | `#525252` | `#1a1a1a` | `#33333366` (dashed) |

---

## Data Model Changes

### `src/lib/mech-types.ts`

Add `difficulties` to `Mechanic`:

```ts
export type Difficulty = "Solo" | "Normal" | "Hard" | "Nightmare";

export interface Mechanic {
  // ... existing fields ...
  difficulties?: Difficulty[];  // omitted or [] = applies to all difficulties
}
```

Add `Difficulty` export for use across components.

### `src/lib/data/raid-library.ts`

Add two fields to the library interfaces:

```ts
interface LibraryMechanic {
  // ... existing fields ...
  difficulties?: Difficulty[];  // omitted = all difficulties
}

interface LibraryGate {
  // ... existing fields ...
  availableDifficulties: Difficulty[];  // which modes this raid supports
  // e.g. ["Solo", "Normal", "Hard"] for Echidna G2
  // e.g. ["Normal", "Hard", "Nightmare"] for Kazeros G2
  // e.g. ["Solo", "Normal", "Hard", "Nightmare"] for Thaemine G3
}
```

`availableDifficulties` drives which pills appear in the badge picker for that raid. Populated during Maxroll guide data-entry phase. Default for user-created gates not in the library: `["Normal", "Hard"]`.

---

## Difficulty Map Storage

New localStorage key alongside existing `"mech-announcer-raids"` and `"mech-announcer-settings"`:

```
"mech-difficulty-map"  →  Record<string, string>
```

Example: `{ "Echidna": "Hard", "Thaemine": "Nightmare", "Valtan": "Solo" }`

A raid with no entry = **All** (no filtering, show everything).

---

## mechStore Changes (`src/lib/mech-store.svelte.ts`)

New state and operations:

```ts
const DIFFICULTY_KEY = "mech-difficulty-map";

let difficultyMap = $state<Record<string, string>>(loadDifficultyMap());

// Exposed:
get difficultyMap() { return difficultyMap; }

setDifficulty(raidName: string, difficulty: Difficulty | null) {
  if (!difficulty) {
    const { [raidName]: _, ...rest } = difficultyMap;
    difficultyMap = rest;
  } else {
    difficultyMap = { ...difficultyMap, [raidName]: difficulty };
  }
  localStorage.setItem(DIFFICULTY_KEY, JSON.stringify(difficultyMap));
  broadcastDifficultyMap(difficultyMap);
}

applyRemoteDifficultyMap(map: Record<string, string>) {
  difficultyMap = map;
}
```

New broadcast function:
```ts
async function broadcastDifficultyMap(map: Record<string, string>) {
  try { await emit("mech:difficulty-changed", map); } catch {}
}
```

---

## Shared Filter Utility

A pure function used in both the editor and overlay — define in `src/lib/utils/difficulty.ts`:

```ts
import type { Difficulty, Mechanic } from "$lib/mech-types";

export function filterByDifficulty(mechanics: Mechanic[], difficulty: Difficulty | null): Mechanic[] {
  if (!difficulty) return mechanics;
  return mechanics.filter(m => !m.difficulties?.length || m.difficulties.includes(difficulty));
}

export function activeDifficultyForGate(
  difficultyMap: Record<string, string>,
  raidName: string
): Difficulty | null {
  return (difficultyMap[raidName] as Difficulty) ?? null;
}
```

---

## UI Changes

### GateSidebar (`src/lib/components/mech/GateSidebar.svelte`)

Each raid group header row gains an inline difficulty chip:

- Shows current difficulty for that raid (or "ALL" if unset)
- Styled with the difficulty color palette
- On click: cycles through `availableDifficulties` for that raid (S→N→H→NM order, filtered to what's available) then back to null (All)
- `availableDifficulties` is looked up from `libraryByRaid[raidName]?.[0]?.availableDifficulties ?? ["Normal", "Hard"]`

Visual: `[HARD ▾]` inline chip, right-aligned on the raid row. Dashed border when unset.

### MechModal (`src/lib/components/mech/MechModal.svelte`)

New field in the form: **Difficulties**

```
[ ] Solo  [ ] Normal  [ ] Hard  [ ] Nightmare
```

- Multi-select checkboxes. Leave all unchecked = mechanic applies to all difficulties.
- Only show checkboxes for difficulties present in `availableDifficulties` for the current gate.
- Serialised as `difficulties: Difficulty[]` on save; empty array = universal.

### MechRow (`src/lib/components/mech/MechRow.svelte`)

If `mech.difficulties?.length > 0`, render small inline difficulty pills after the mechanic name:

```
🔴 Final Struggle   [H]
🟡 Desire Embrace
```

Pills use the difficulty color palette. No pills = applies to all.

### Mech Editor (`src/routes/(app)/mech-editor/+page.svelte`)

Replace the current `sorted` derivation:

```ts
// Before:
const sorted = $derived(gate ? [...gate.mechanics].sort(...) : []);

// After:
const activeDifficulty = $derived(
  activeDifficultyForGate(mechStore.difficultyMap, gate?.raid ?? "")
);
const sorted = $derived(
  gate
    ? filterByDifficulty([...gate.mechanics], activeDifficulty).sort(...)
    : []
);
```

The HP timeline (`HPTimeline`) receives the filtered mechanic list so the bar markers stay in sync.

### Mech Overlay (`src/routes/(mech)/mech-overlay/+page.svelte`)

Filter mechanics before both the HP trigger `$effect` and the OL component props:

```ts
const activeDifficulty = $derived(
  gate ? (mechStore.difficultyMap[gate.raid] as Difficulty ?? null) : null
);
const visibleMechanics = $derived(
  gate ? filterByDifficulty(gate.mechanics, activeDifficulty) : []
);
```

Replace `gate.mechanics` with `visibleMechanics` in:
- The HP trigger `$effect` (`gate.mechanics.forEach(m => ...)` → `visibleMechanics.forEach(...)`)
- The repeat-timer mechanic detection
- All OL component props (`mechanics={visibleMechanics}`)

Add listener for `mech:difficulty-changed`:

```ts
const unDiff = await listen<Record<string, string>>("mech:difficulty-changed", (event) => {
  mechStore.applyRemoteDifficultyMap(event.payload);
});
```

---

## Library Data-Entry Phase (separate task)

Visit each Maxroll gate guide linked from the [Cheatsheet Collection](https://maxroll.gg/lost-ark/resources/lost-ark-cheat-sheet-collection) and for each of the 48 gates:

1. Set `availableDifficulties` (which modes the raid supports)
2. Tag each mechanic's `difficulties` array (which modes that mechanic appears in)

Mechanics that exist in all available modes get `difficulties: []` (or omit the field). Mechanics exclusive to one mode (e.g. `["Hard"]`) or a subset (e.g. `["Hard", "Nightmare"]`) are tagged explicitly.

This is a data-entry pass independent of the code changes — both can proceed in parallel.

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/mech-types.ts` | Add `Difficulty` type, `difficulties?: Difficulty[]` to `Mechanic` |
| `src/lib/data/raid-library.ts` | Add `difficulties?` to `LibraryMechanic`, `availableDifficulties` to `LibraryGate`, populate all 48 gates |
| `src/lib/mech-store.svelte.ts` | Add `difficultyMap` state, `setDifficulty`, `applyRemoteDifficultyMap`, `broadcastDifficultyMap` |
| `src/lib/utils/difficulty.ts` | New file — `filterByDifficulty`, `activeDifficultyForGate` |
| `src/lib/components/mech/GateSidebar.svelte` | Add cycling difficulty chip per raid group |
| `src/lib/components/mech/MechModal.svelte` | Add difficulties multi-select field |
| `src/lib/components/mech/MechRow.svelte` | Add difficulty pill badges |
| `src/routes/(app)/mech-editor/+page.svelte` | Filter `sorted` by active difficulty; pass to HPTimeline |
| `src/routes/(mech)/mech-overlay/+page.svelte` | Add `visibleMechanics` derived, replace `gate.mechanics` usages, listen for `mech:difficulty-changed` |

---

## What Does NOT Change

- `Gate` object stored in localStorage — no new fields needed; difficulty lives in the separate `difficultyMap` key
- `MechSettings` / `mech:settings-changed` broadcast — difficulty is its own concern
- Rust backend — no changes; this is entirely frontend state
- `BossStatusData` / PeerJS data flow — unchanged
- `buildDefaultRaids()` logic — unchanged

---

## Difficulty Availability by Raid (current as of 2026-05-06)

| Difficulty | Available on |
|---|---|
| Normal | All raids |
| Hard | All raids |
| Solo | Specific legacy raids (curated list — see below) |
| Nightmare | Serca only |

Solo Mode is NOT a clean "up to raid X" cutoff — it is a specific curated set of legacy raids defined by the in-game "Endgame Content: Solo Mode" page. Confirmed Solo raids from that page:

- Valtan
- Vykas
- Kakul-Saydon
- Brelshaza
- Kayangel (Eternal Cradle of Haste)
- Akkan
- Ivory Tower (Trampled Garden)
- Thaemine
- Echidna (confirmed via LOA Logs: `difficulty: [Solo] Echidna`)
- Additional raids partially visible in UI (to be confirmed during data-entry)

Raids NOT in the Solo list (e.g. Kazeros G1/G2, Serca, Aegir, Mordum) get `["Normal", "Hard"]` or `["Normal", "Hard", "Nightmare"]` for Serca.

These constraints drive `availableDifficulties` on each `LibraryGate`. The exact per-gate value is set during the Maxroll data-entry phase by cross-referencing the in-game Solo Mode content page.

New difficulties added to future raids require only a library data update — no code changes.

---

## Open Questions (resolved at data-entry time)

- Which of the partially-visible raids on the Solo Mode page are in our library? (data-entry will confirm)
- Are there mechanics that appear in Normal + Hard but not Nightmare on Serca? (Maxroll Serca guide will clarify)
- Do Aegir and Mordum have Solo mode? (not visible in the screenshot — confirm in-game)
