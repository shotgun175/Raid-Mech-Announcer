# Difficulty-Aware Mechanic Filtering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-raid difficulty badges (Solo/Normal/Hard/Nightmare) to the sidebar that filter mechanics in both the editor and the live overlay, silencing difficulty-exclusive announcements.

**Architecture:** A new `difficultyMap` in `mechStore` (persisted to localStorage, broadcast to the overlay via a new Tauri event) stores the active difficulty per raid name. A pure `filterByDifficulty` utility is shared by the editor and overlay. The sidebar chip cycles through a raid's `availableDifficulties` (stored in the library) on each click.

**Tech Stack:** Svelte 5 runes, TypeScript strict, Tailwind/inline styles, Tauri v2 events, localStorage. Tests use vitest — if not installed run `npm install -D vitest` first.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/mech-types.ts` | Modify | Add `Difficulty` type + `difficulties?` field to `Mechanic` |
| `src/lib/utils/difficulty.ts` | **Create** | Pure helpers: `DIFFICULTY_ORDER`, `DIFFICULTY_STYLE`, `filterByDifficulty`, `activeDifficultyForGate`, `cycleDifficulty` |
| `src/lib/utils/difficulty.test.ts` | **Create** | Unit tests for the pure helpers |
| `src/lib/mech-store.svelte.ts` | Modify | Add `difficultyMap` state, `setDifficulty`, `applyRemoteDifficultyMap`, broadcast |
| `src/lib/data/raid-library.ts` | Modify | Add `availableDifficulties?` to `LibraryGate`, `difficulties?` to `LibraryMechanic`; pass through in `makeMechanics`/`stableGate`; set known Solo/Nightmare raids |
| `src/lib/components/mech/GateSidebar.svelte` | Modify | Add cycling difficulty chip per raid group header |
| `src/lib/components/mech/MechModal.svelte` | Modify | Add `availableDifficulties` prop + difficulties checkboxes in form |
| `src/lib/components/mech/MechRow.svelte` | Modify | Render difficulty pills when `mech.difficulties?.length > 0` |
| `src/routes/(app)/mech-editor/+page.svelte` | Modify | Filter `sorted` by active difficulty; pass `availableDifficulties` to MechModal; update HPTimeline prop |
| `src/routes/(mech)/mech-overlay/+page.svelte` | Modify | Add `visibleMechanics` derived; replace `gate.mechanics` in 3 places; listen for `mech:difficulty-changed` |

---

## Task 1: Core types and filter utility

**Files:**
- Modify: `src/lib/mech-types.ts`
- Create: `src/lib/utils/difficulty.ts`
- Create: `src/lib/utils/difficulty.test.ts`

- [ ] **Step 1.1: Add `Difficulty` type and `difficulties` field to `Mechanic`**

In `src/lib/mech-types.ts`, add after line 1 (before `export type Severity`):

```ts
export type Difficulty = "Solo" | "Normal" | "Hard" | "Nightmare";
```

Then add `difficulties?: Difficulty[];` as the last field of the `Mechanic` interface (after `notes: string`):

```ts
export interface Mechanic {
  id: string;
  name: string;
  severity: Severity;
  hpBar: number | null;
  timerSecs: number | null;
  phase: Phase;
  repeatSecs: number | null;
  triggerType: TriggerType;
  ttsEnabled: boolean;
  ttsText: string;
  notes: string;
  difficulties?: Difficulty[];  // omitted or [] = applies to all difficulties
}
```

- [ ] **Step 1.2: Create the difficulty utility file**

Create `src/lib/utils/difficulty.ts` with this exact content:

```ts
import type { Difficulty, Mechanic } from "$lib/mech-types";

/** Canonical display order for cycling: S → N → H → NM */
export const DIFFICULTY_ORDER: Difficulty[] = ["Solo", "Normal", "Hard", "Nightmare"];

/** Per-difficulty visual style tokens */
export const DIFFICULTY_STYLE: Record<Difficulty, { color: string; bg: string; border: string; label: string }> = {
  Solo:      { color: "#3b82f6", bg: "#0d1220", border: "#3b82f633", label: "SOLO" },
  Normal:    { color: "#9ca3af", bg: "#1a1a1a",  border: "#6b728033", label: "NORMAL" },
  Hard:      { color: "#fb923c", bg: "#1a0f00",  border: "#fb923c33", label: "HARD" },
  Nightmare: { color: "#a855f7", bg: "#120d1a",  border: "#a855f733", label: "NM" },
};

/**
 * Returns mechanics visible for the given difficulty.
 * null difficulty = All (no filter). A mechanic with no difficulties array
 * (or an empty one) is shown in every difficulty.
 */
export function filterByDifficulty(mechanics: Mechanic[], difficulty: Difficulty | null): Mechanic[] {
  if (!difficulty) return mechanics;
  return mechanics.filter((m) => !m.difficulties?.length || m.difficulties.includes(difficulty));
}

/**
 * Returns the active Difficulty for a raid from the stored map,
 * or null (= All) if none is set.
 */
export function activeDifficultyForGate(
  difficultyMap: Record<string, string>,
  raidName: string
): Difficulty | null {
  return (difficultyMap[raidName] as Difficulty) ?? null;
}

/**
 * Cycles to the next difficulty in the available list (filtered to
 * DIFFICULTY_ORDER). Wraps from last → null (All), and null → first.
 */
export function cycleDifficulty(
  current: Difficulty | null,
  availableDifficulties: Difficulty[]
): Difficulty | null {
  const ordered = DIFFICULTY_ORDER.filter((d) => availableDifficulties.includes(d));
  if (ordered.length === 0) return null;
  if (!current) return ordered[0];
  const idx = ordered.indexOf(current);
  if (idx === -1 || idx === ordered.length - 1) return null;
  return ordered[idx + 1];
}
```

- [ ] **Step 1.3: Write unit tests**

Create `src/lib/utils/difficulty.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { filterByDifficulty, cycleDifficulty, activeDifficultyForGate } from "./difficulty";
import type { Mechanic } from "$lib/mech-types";

function mech(overrides: Partial<Mechanic> = {}): Mechanic {
  return {
    id: "m1", name: "Test", severity: "major", hpBar: 100, timerSecs: null,
    phase: null, repeatSecs: null, triggerType: "hp", ttsEnabled: true,
    ttsText: "Test", notes: "", ...overrides
  };
}

describe("filterByDifficulty", () => {
  it("returns all mechanics when difficulty is null", () => {
    const mechanics = [mech(), mech({ id: "m2", difficulties: ["Hard"] })];
    expect(filterByDifficulty(mechanics, null)).toHaveLength(2);
  });

  it("includes mechanics with no difficulties array", () => {
    const mechanics = [mech({ difficulties: undefined })];
    expect(filterByDifficulty(mechanics, "Hard")).toHaveLength(1);
  });

  it("includes mechanics with empty difficulties array", () => {
    const mechanics = [mech({ difficulties: [] })];
    expect(filterByDifficulty(mechanics, "Normal")).toHaveLength(1);
  });

  it("excludes mechanics tagged for a different difficulty", () => {
    const mechanics = [mech({ difficulties: ["Hard"] })];
    expect(filterByDifficulty(mechanics, "Normal")).toHaveLength(0);
  });

  it("includes mechanics tagged for the active difficulty", () => {
    const mechanics = [mech({ difficulties: ["Hard", "Nightmare"] })];
    expect(filterByDifficulty(mechanics, "Hard")).toHaveLength(1);
    expect(filterByDifficulty(mechanics, "Nightmare")).toHaveLength(1);
    expect(filterByDifficulty(mechanics, "Normal")).toHaveLength(0);
  });
});

describe("cycleDifficulty", () => {
  const avail = ["Solo", "Normal", "Hard"] as const;

  it("null → first available", () => {
    expect(cycleDifficulty(null, [...avail])).toBe("Solo");
  });

  it("last → null (All)", () => {
    expect(cycleDifficulty("Hard", [...avail])).toBeNull();
  });

  it("mid → next", () => {
    expect(cycleDifficulty("Solo", [...avail])).toBe("Normal");
    expect(cycleDifficulty("Normal", [...avail])).toBe("Hard");
  });

  it("skips unavailable difficulties", () => {
    expect(cycleDifficulty(null, ["Normal", "Hard"])).toBe("Normal");
  });

  it("returns null when available list is empty", () => {
    expect(cycleDifficulty(null, [])).toBeNull();
  });
});

describe("activeDifficultyForGate", () => {
  it("returns the stored difficulty for a raid", () => {
    expect(activeDifficultyForGate({ Echidna: "Hard" }, "Echidna")).toBe("Hard");
  });

  it("returns null when the raid has no entry", () => {
    expect(activeDifficultyForGate({}, "Valtan")).toBeNull();
  });
});
```

- [ ] **Step 1.4: Run tests**

```bash
npx vitest run src/lib/utils/difficulty.test.ts
```

Expected: 10 tests pass. If vitest is not installed: `npm install -D vitest` then retry.

- [ ] **Step 1.5: TypeScript check**

```bash
npm run check
```

Expected: no new errors. Fix any before continuing.

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/mech-types.ts src/lib/utils/difficulty.ts src/lib/utils/difficulty.test.ts
git commit -m "feat: add Difficulty type and filterByDifficulty utility"
```

---

## Task 2: mechStore difficulty map

**Files:**
- Modify: `src/lib/mech-store.svelte.ts`

- [ ] **Step 2.1: Add `loadDifficultyMap` and `broadcastDifficultyMap`**

In `src/lib/mech-store.svelte.ts`, add these two functions alongside the existing `broadcastBossStatus` / `loadRaids` functions (after line 24, before `const RAIDS_KEY`):

```ts
async function broadcastDifficultyMap(map: Record<string, string>) {
  try {
    await emit("mech:difficulty-changed", map);
  } catch {}
}

const DIFFICULTY_KEY = "mech-difficulty-map";

function loadDifficultyMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DIFFICULTY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}
```

- [ ] **Step 2.2: Add `difficultyMap` state inside the `mechStore` IIFE**

Inside the `mechStore` factory (after `let confirmedAt = $state...`), add:

```ts
let difficultyMap = $state<Record<string, string>>(loadDifficultyMap());
```

- [ ] **Step 2.3: Expose `difficultyMap`, `setDifficulty`, and `applyRemoteDifficultyMap` in the returned object**

In the returned object (after the `applyRemoteRaids` method), add:

```ts
get difficultyMap() {
  return difficultyMap;
},

setDifficulty(raidName: string, difficulty: string | null) {
  if (!difficulty) {
    const { [raidName]: _, ...rest } = difficultyMap;
    difficultyMap = rest;
  } else {
    difficultyMap = { ...difficultyMap, [raidName]: difficulty };
  }
  localStorage.setItem(DIFFICULTY_KEY, JSON.stringify(difficultyMap));
  broadcastDifficultyMap(difficultyMap);
},

applyRemoteDifficultyMap(map: Record<string, string>) {
  difficultyMap = map;
},
```

- [ ] **Step 2.4: TypeScript check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/mech-store.svelte.ts
git commit -m "feat: add difficultyMap to mechStore with localStorage persistence and broadcast"
```

---

## Task 3: Library schema and known difficulty overrides

**Files:**
- Modify: `src/lib/data/raid-library.ts`

- [ ] **Step 3.1: Update the `LibraryMechanic` and `LibraryGate` interfaces**

At the top of `src/lib/data/raid-library.ts`, change the import to include `Difficulty`:

```ts
import type { Difficulty, Gate, Mechanic, Severity, TriggerType } from "$lib/mech-types";
```

Update `LibraryMechanic` (add `difficulties` after `notes`):

```ts
interface LibraryMechanic {
  name: string;
  severity: Severity;
  triggerType: TriggerType;
  hpBar?: number;
  timerSecs?: number;
  repeatSecs?: number;
  notes?: string;
  difficulties?: Difficulty[];
}
```

Update `LibraryGate` (add `availableDifficulties` after `mechanics`):

```ts
interface LibraryGate {
  encounterKey: string;
  raid: string;
  gate: number;
  releaseOrder: number;
  boss: string;
  bossType: string;
  weakness: string;
  tauntable: boolean;
  mechanics: LibraryMechanic[];
  availableDifficulties?: Difficulty[];  // omitted = ["Normal", "Hard"]
}
```

- [ ] **Step 3.2: Pass `difficulties` through `makeMechanics`**

Replace the existing `makeMechanics` function (lines 2182–2196) with:

```ts
function makeMechanics(raw: LibraryMechanic[], prefix: string): Mechanic[] {
  return raw.map((m, i) => ({
    id: `${prefix}-${i}-${Date.now()}`,
    name: m.name,
    severity: m.severity,
    triggerType: m.triggerType,
    hpBar: m.hpBar ?? null,
    timerSecs: m.timerSecs ?? null,
    repeatSecs: m.repeatSecs ?? null,
    phase: null,
    ttsEnabled: true,
    ttsText: m.name,
    notes: m.notes ?? "",
    difficulties: m.difficulties?.length ? m.difficulties : undefined
  }));
}
```

- [ ] **Step 3.3: Pass `difficulties` through `stableGate`**

Replace the mechanics mapping inside `stableGate` (lines 2256–2268) with:

```ts
mechanics: entry.mechanics.map((m, i) => ({
  id: `default-${slug}-m${i}`,
  name: m.name,
  severity: m.severity,
  triggerType: m.triggerType,
  hpBar: m.hpBar ?? null,
  timerSecs: m.timerSecs ?? null,
  repeatSecs: m.repeatSecs ?? null,
  phase: null,
  ttsEnabled: true,
  ttsText: m.name,
  notes: m.notes ?? "",
  difficulties: m.difficulties?.length ? m.difficulties : undefined
}))
```

- [ ] **Step 3.4: Set `availableDifficulties` on confirmed Solo and Nightmare raids**

Find each of the following raids in the `LIBRARY` array and add `availableDifficulties: ["Solo", "Normal", "Hard"]` to their `LibraryGate` objects (all gates for that raid). Use a project-wide search to locate them: `grep -n '"raid": "Valtan"' src/lib/data/raid-library.ts`.

**Raids to add Solo** (`availableDifficulties: ["Solo", "Normal", "Hard"]`):
- Valtan (G1, G2)
- Vykas (G1, G2, G3)
- Kakul-Saydon (G1, G2, G3)
- Brelshaza (all gates)
- Kayangel (all gates)
- Akkan (all gates)
- Ivory Tower (all gates)
- Thaemine (all gates)
- Echidna (G1, G2)

Example — find the Valtan G1 entry and add the field:
```ts
{
  encounterKey: "Valtan G1",
  raid: "Valtan",
  gate: 1,
  releaseOrder: 1,
  availableDifficulties: ["Solo", "Normal", "Hard"],  // ← add this line
  boss: "Dark Mountain Predator",
  // ... rest unchanged
}
```

**Raid to add Nightmare** (`availableDifficulties: ["Normal", "Hard", "Nightmare"]`):
- Serca (all gates) — search for `raid: "Serca"` or `encounterKey: "Serca`

All other raids in the library omit `availableDifficulties` (defaults to `["Normal", "Hard"]` at lookup time).

- [ ] **Step 3.5: TypeScript check**

```bash
npm run check
```

Expected: no errors. Fix any missing `Difficulty` imports or type mismatches before continuing.

- [ ] **Step 3.6: Commit**

```bash
git add src/lib/data/raid-library.ts
git commit -m "feat: add availableDifficulties and difficulties fields to raid library schema"
```

---

## Task 4: GateSidebar difficulty chip

**Files:**
- Modify: `src/lib/components/mech/GateSidebar.svelte`

- [ ] **Step 4.1: Add imports**

In the `<script>` block of `GateSidebar.svelte`, add these imports after the existing ones:

```ts
import { cycleDifficulty, DIFFICULTY_ORDER, DIFFICULTY_STYLE } from "$lib/utils/difficulty";
import type { Difficulty } from "$lib/mech-types";
```

- [ ] **Step 4.2: Add `availableDifficultiesFor` helper**

After the `raidsByName` derived (after line 45), add:

```ts
function availableDifficultiesFor(raidName: string): Difficulty[] {
  return libraryByRaid[raidName]?.[0]?.availableDifficulties ?? ["Normal", "Hard"];
}
```

- [ ] **Step 4.3: Replace the raid group header div**

Find this block in the template (lines 124–141 — the `{#each raidNames as raidName}` loop's header div):

```svelte
<div style="padding: 8px 10px 2px; display: flex; align-items: center; justify-content: space-between;">
  <div
    style="font-size: 12px; color: #d4d4d4; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;"
  >
    {raidName}
  </div>
  <button
    onclick={(e) => {
      e.stopPropagation();
      mechStore.removeRaid(raidName);
    }}
    title="Remove raid"
    style="background: transparent; border: none; cursor: pointer; color: #3a3a3a; font-size: 12px; padding: 0 1px; line-height: 1; transition: color 0.15s;"
    onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
    onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = "#3a3a3a")}>✕</button
  >
</div>
```

Replace it with:

```svelte
<div style="padding: 6px 10px 2px; display: flex; align-items: center; gap: 6px;">
  <div
    style="font-size: 12px; color: #d4d4d4; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
  >
    {raidName}
  </div>

  <!-- Difficulty chip — cycles on click -->
  {@const diff = (mechStore.difficultyMap[raidName] as Difficulty) ?? null}
  {@const sty = diff ? DIFFICULTY_STYLE[diff] : null}
  <button
    onclick={(e) => {
      e.stopPropagation();
      const avail = availableDifficultiesFor(raidName);
      const next = cycleDifficulty(diff, avail);
      mechStore.setDifficulty(raidName, next);
    }}
    title="Cycle difficulty filter"
    style="
      flex-shrink: 0;
      background: {sty ? sty.bg : '#1a1a1a'};
      border: 1px {sty ? 'solid' : 'dashed'} {sty ? sty.border : '#33333366'};
      border-radius: 3px;
      padding: 1px 6px;
      color: {sty ? sty.color : '#525252'};
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.04em;
      cursor: pointer;
      font-family: inherit;
      line-height: 1.6;
      transition: opacity 0.15s;
    "
    onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
    onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
  >{sty ? sty.label : "ALL"} ▾</button>

  <button
    onclick={(e) => {
      e.stopPropagation();
      mechStore.removeRaid(raidName);
    }}
    title="Remove raid"
    style="background: transparent; border: none; cursor: pointer; color: #3a3a3a; font-size: 12px; padding: 0 1px; line-height: 1; transition: color 0.15s; flex-shrink: 0;"
    onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
    onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = "#3a3a3a")}>✕</button
  >
</div>
```

- [ ] **Step 4.4: Manual verification**

Run `npm run tauri:dev`. In the Raid Editor sidebar:
1. Each raid group header should show an "ALL ▾" gray dashed chip to the right of the raid name, and the ✕ still at the far right.
2. Clicking the chip on a Solo-enabled raid (e.g. Echidna) should cycle: ALL → SOLO → NORMAL → HARD → ALL.
3. Clicking on a non-Solo raid should cycle: ALL → NORMAL → HARD → ALL (no Solo option).
4. Serca should cycle: ALL → NORMAL → HARD → NM → ALL.
5. The chip color should change (blue for Solo, gray for Normal, orange for Hard, purple for NM).
6. Refresh the app — the selected difficulty should persist.

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/components/mech/GateSidebar.svelte
git commit -m "feat: add difficulty chip to GateSidebar raid group headers"
```

---

## Task 5: MechModal difficulty checkboxes

**Files:**
- Modify: `src/lib/components/mech/MechModal.svelte`
- Modify: `src/routes/(app)/mech-editor/+page.svelte`

- [ ] **Step 5.1: Add `availableDifficulties` prop to MechModal**

In `MechModal.svelte`, add to the `Props` interface and destructure:

```ts
import type { Difficulty, Mechanic, Phase, Severity, TriggerType } from "$lib/mech-types";
import { DIFFICULTY_ORDER, DIFFICULTY_STYLE } from "$lib/utils/difficulty";

interface Props {
  mech: Mechanic | null;
  totalBars: number;
  availableDifficulties: Difficulty[];
  onSave: (m: Mechanic) => void;
  onClose: () => void;
}
let { mech, totalBars, availableDifficulties, onSave, onClose }: Props = $props();
```

- [ ] **Step 5.2: Add `difficulties` to the form state**

In `FormState`, add:
```ts
type FormState = {
  // ... existing fields ...
  difficulties: Difficulty[];
};
```

In the `$state` initialiser, add `difficulties` to both the `mech ?` branch and the default branch:

```ts
// mech branch (editing existing):
difficulties: mech.difficulties ?? [],

// default branch (new mechanic):
difficulties: [],
```

- [ ] **Step 5.3: Add `difficulties` to the `save()` function**

In `save()`, add `difficulties` to the object passed to `onSave`:

```ts
function save() {
  if (!form.name.trim()) return;
  onSave({
    ...(mech ?? {}),
    id: mech?.id || `m-${Date.now()}`,
    name: form.name.trim(),
    severity: form.severity,
    triggerType: form.triggerType,
    hpBar: form.hpBar !== "" ? parseInt(form.hpBar) : null,
    phase: form.phase !== "" ? (parseInt(form.phase) as Phase) : null,
    repeatSecs: form.repeatSecs !== "" ? parseInt(form.repeatSecs) : null,
    timerSecs: form.timerSecs !== "" ? parseInt(form.timerSecs) : null,
    ttsEnabled: form.ttsEnabled,
    ttsText: form.ttsText,
    notes: form.notes,
    difficulties: form.difficulties.length ? form.difficulties : undefined
  } as Mechanic);
}
```

- [ ] **Step 5.4: Add the difficulties checkboxes to the modal body**

In the template, add this block just before the `<!-- Notes -->` div (after the TTS section):

```svelte
<!-- Difficulties (only shown when gate has multiple available) -->
{#if availableDifficulties.length > 1}
  <div style="margin-bottom: 14px;">
    <div class="field-label">Difficulties</div>
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px;">
      {#each DIFFICULTY_ORDER.filter(d => availableDifficulties.includes(d)) as d}
        {@const sty = DIFFICULTY_STYLE[d]}
        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 12px;">
          <input
            type="checkbox"
            checked={form.difficulties.includes(d)}
            onchange={(e) => {
              if ((e.target as HTMLInputElement).checked) {
                form.difficulties = [...form.difficulties, d];
              } else {
                form.difficulties = form.difficulties.filter((x) => x !== d);
              }
            }}
            style="accent-color: {sty.color}; width: 13px; height: 13px;"
          />
          <span
            style="background: {sty.bg}; border: 1px solid {sty.border}; border-radius: 3px; padding: 1px 6px; color: {sty.color}; font-size: 10px; font-weight: 700; letter-spacing: 0.04em;"
          >{sty.label}</span>
        </label>
      {/each}
    </div>
    <div style="font-size: 11px; color: #525252; margin-top: 4px;">
      Leave all unchecked = mechanic applies to every difficulty.
    </div>
  </div>
{/if}
```

- [ ] **Step 5.5: Pass `availableDifficulties` from the editor to MechModal**

In `src/routes/(app)/mech-editor/+page.svelte`, add this derived after the existing `gate` derived (line 14):

```ts
import { libraryByRaid } from "$lib/data/raid-library";
import type { Difficulty } from "$lib/mech-types";

const availableDifficulties = $derived<Difficulty[]>(
  libraryByRaid[gate?.raid ?? ""]?.[0]?.availableDifficulties ?? ["Normal", "Hard"]
);
```

Then update the MechModal usage at the bottom (line 177) to pass the prop:

```svelte
{#if showModal}
  <MechModal
    mech={editMech}
    totalBars={gate?.totalBars ?? 300}
    {availableDifficulties}
    onSave={saveMechanic}
    onClose={closeModal}
  />
{/if}
```

- [ ] **Step 5.6: TypeScript check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 5.7: Manual verification**

Run `npm run tauri:dev`. Open any gate, click "+ ADD" or edit an existing mechanic. For an Echidna gate:
- The modal should show a "Difficulties" section with SOLO / NORMAL / HARD checkboxes.
- For a Valtan gate: SOLO / NORMAL / HARD.
- For a Serca gate: NORMAL / HARD / NM.
- For a raid with only N+H: no Difficulties section (hidden when `availableDifficulties.length <= 1` — which never triggers since minimum is always 2, but the section shows).
- Save a mechanic with "Hard" checked — it persists when you re-open it.

- [ ] **Step 5.8: Commit**

```bash
git add src/lib/components/mech/MechModal.svelte src/routes/(app)/mech-editor/+page.svelte
git commit -m "feat: add difficulty multi-select to MechModal"
```

---

## Task 6: MechRow difficulty pills

**Files:**
- Modify: `src/lib/components/mech/MechRow.svelte`

- [ ] **Step 6.1: Add import and derived**

In `MechRow.svelte` `<script>`, add:

```ts
import { DIFFICULTY_STYLE } from "$lib/utils/difficulty";
```

- [ ] **Step 6.2: Add difficulty pills in the name column**

In the template, find the name span inside the "Name + notes" column (the `<span>` with `mech.name`, around line 67). Add the pills immediately after the `{#if isNext}` block:

```svelte
{#if mech.difficulties?.length}
  <span style="display: flex; gap: 3px; flex-shrink: 0;">
    {#each mech.difficulties as d}
      {@const sty = DIFFICULTY_STYLE[d]}
      <span
        style="background: {sty.bg}; border: 1px solid {sty.border}; border-radius: 2px; padding: 1px 4px; color: {sty.color}; font-size: 9px; font-weight: 700; letter-spacing: 0.04em;"
      >{sty.label}</span>
    {/each}
  </span>
{/if}
```

The full name row should look like:

```svelte
<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
  <span style="font-weight: 600; font-size: 13px; color: {isNext ? 'var(--color-accent-500)' : '#fafafa'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{mech.name}</span>
  {#if isNext}
    <span style="font-size: 12px; color: var(--color-accent-500); font-weight: 700; letter-spacing: 0.06em; flex-shrink: 0;">▶ NEXT</span>
  {/if}
  {#if mech.difficulties?.length}
    <span style="display: flex; gap: 3px; flex-shrink: 0;">
      {#each mech.difficulties as d}
        {@const sty = DIFFICULTY_STYLE[d]}
        <span
          style="background: {sty.bg}; border: 1px solid {sty.border}; border-radius: 2px; padding: 1px 4px; color: {sty.color}; font-size: 9px; font-weight: 700; letter-spacing: 0.04em;"
        >{sty.label}</span>
      {/each}
    </span>
  {/if}
</div>
```

- [ ] **Step 6.3: Manual verification**

Run `npm run tauri:dev`. Add a mechanic with "Hard" difficulty set in the modal. In the mechanic row, an orange `HARD` pill should appear next to the mechanic name. A mechanic with no difficulties set should show no pills.

- [ ] **Step 6.4: Commit**

```bash
git add src/lib/components/mech/MechRow.svelte
git commit -m "feat: show difficulty pills on MechRow for difficulty-exclusive mechanics"
```

---

## Task 7: Editor filtering

**Files:**
- Modify: `src/routes/(app)/mech-editor/+page.svelte`

- [ ] **Step 7.1: Add `activeDifficulty` and filter `sorted`**

Add the import for `activeDifficultyForGate` and `filterByDifficulty` to the existing imports in the editor. The `libraryByRaid` import was already added in Task 5.

```ts
import { activeDifficultyForGate, filterByDifficulty } from "$lib/utils/difficulty";
```

Replace line 25 (the current `sorted` derivation):

```ts
// Before:
const sorted = $derived(gate ? [...gate.mechanics].sort((a, b) => (b.hpBar ?? -1) - (a.hpBar ?? -1)) : []);

// After:
const activeDifficulty = $derived(activeDifficultyForGate(mechStore.difficultyMap, gate?.raid ?? ""));
const sorted = $derived(
  gate
    ? filterByDifficulty([...gate.mechanics], activeDifficulty).sort((a, b) => (b.hpBar ?? -1) - (a.hpBar ?? -1))
    : []
);
```

- [ ] **Step 7.2: Update HPTimeline to use filtered mechanics**

Find line 106 in the template:
```svelte
<HPTimeline mechanics={gate.mechanics} totalBars={gate.totalBars} currentBar={simBar} />
```

Change to:
```svelte
<HPTimeline mechanics={sorted} totalBars={gate.totalBars} currentBar={simBar} />
```

(`sorted` is already filtered by difficulty and sorted by hpBar desc — the right input for the timeline.)

- [ ] **Step 7.3: TypeScript check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 7.4: Manual verification**

Run `npm run tauri:dev`. Set Echidna to "Hard" via the sidebar chip. If any Echidna mechanics are tagged `difficulties: ["Hard"]`, those rows should appear. Switch to "Normal" — those rows should disappear. "ALL" shows everything. The HP timeline markers should match the visible rows.

- [ ] **Step 7.5: Commit**

```bash
git add src/routes/(app)/mech-editor/+page.svelte
git commit -m "feat: filter editor mechanic list by active difficulty"
```

---

## Task 8: Overlay filtering and broadcast listener

**Files:**
- Modify: `src/routes/(mech)/mech-overlay/+page.svelte`

- [ ] **Step 8.1: Add imports**

In the overlay page `<script>`, add:

```ts
import { filterByDifficulty } from "$lib/utils/difficulty";
import type { Difficulty } from "$lib/mech-types";
```

- [ ] **Step 8.2: Add `activeDifficulty` and `visibleMechanics` deriveds**

After the existing `const isPhaseTransition = $derived(...)` block, add:

```ts
const activeDifficulty = $derived<Difficulty | null>(
  gate ? ((mechStore.difficultyMap[gate.raid] as Difficulty) ?? null) : null
);
const visibleMechanics = $derived(
  gate ? filterByDifficulty(gate.mechanics, activeDifficulty) : []
);
```

- [ ] **Step 8.3: Replace `gate.mechanics` in the HP trigger `$effect`**

Find this block (around line 132):
```ts
$effect(() => {
  if (currentBar == null || !gate || isPhaseTransition) return;
  const bar = currentBar;
  const cfg = mechStore.mechSettings;
  gate.mechanics.forEach((m) => {
```

Change `gate.mechanics.forEach` to `visibleMechanics.forEach`:

```ts
$effect(() => {
  if (currentBar == null || !gate || isPhaseTransition) return;
  const bar = currentBar;
  const cfg = mechStore.mechSettings;
  visibleMechanics.forEach((m) => {
```

- [ ] **Step 8.4: Replace `gate.mechanics` in the repeat-timer detection**

Find the `newActive` block (around lines 153–156):
```ts
const newActive =
  [...gate.mechanics]
    .filter((m) => m.repeatSecs != null && m.hpBar != null && bar < (m.hpBar ?? 0))
    .sort((a, b) => (a.hpBar ?? 0) - (b.hpBar ?? 0))
    .at(-1) ?? null;
```

Change `gate.mechanics` to `visibleMechanics`:

```ts
const newActive =
  [...visibleMechanics]
    .filter((m) => m.repeatSecs != null && m.hpBar != null && bar < (m.hpBar ?? 0))
    .sort((a, b) => (a.hpBar ?? 0) - (b.hpBar ?? 0))
    .at(-1) ?? null;
```

- [ ] **Step 8.5: Replace `gate.mechanics` in OL component props**

Find every occurrence of `mechanics={gate.mechanics}` in the template (lines 304–318, inside the `{:else}` block). Replace all five with `mechanics={visibleMechanics}`:

```svelte
{#if variant === "standard"}
  <OLCombined mechanics={visibleMechanics} currentBar={displayBar} {totalBars} {gateName} bossName={displayBossName} {activeMech} {repeatCountdown} />
{:else if variant === "compact"}
  <OLCompact mechanics={visibleMechanics} currentBar={displayBar} {totalBars} {gateName} bossName={displayBossName} {activeMech} {repeatCountdown} />
{:else if variant === "hud"}
  <OLHudStrip mechanics={visibleMechanics} currentBar={displayBar} {totalBars} {gateName} bossName={displayBossName} {activeMech} {repeatCountdown} />
{:else if variant === "card"}
  <OLCardStack mechanics={visibleMechanics} currentBar={displayBar} {totalBars} {gateName} {activeMech} {repeatCountdown} />
{:else}
  <OLPill mechanics={visibleMechanics} currentBar={displayBar} {totalBars} {gateName} {activeMech} {repeatCountdown} />
{/if}
```

- [ ] **Step 8.6: Add `mech:difficulty-changed` listener in `onMount`**

Inside `onMount`, after the `unRaids` listener and before `unlisteners.push(...)`, add:

```ts
const unDiff = await listen<Record<string, string>>("mech:difficulty-changed", (event) => {
  mechStore.applyRemoteDifficultyMap(event.payload);
});
```

Then add `unDiff` to the unlisteners array:

```ts
unlisteners.push(unBoss, unShow, unPreview, unHide, unSettings, unRaids, unFightStart, unConfirm, unDiff);
```

- [ ] **Step 8.7: TypeScript check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 8.8: Manual verification**

Run `npm run tauri:dev`:
1. Set Echidna to "Hard" in the sidebar — the overlay (visible via the preview in Settings or via a live fight) should only show Hard-filtered mechanics.
2. Change to "Normal" — Hard-only mechanics should not appear in the overlay and should not fire TTS.
3. Set to "ALL" — all mechanics appear again.
4. Add a mechanic tagged `difficulties: ["Hard"]`, then switch difficulty to Normal — the mechanic disappears from both the editor list and the overlay.

- [ ] **Step 8.9: Commit**

```bash
git add src/routes/(mech)/mech-overlay/+page.svelte
git commit -m "feat: filter overlay mechanics by active difficulty; sync via mech:difficulty-changed"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `Difficulty` type + `difficulties?` on `Mechanic` → Task 1
- ✅ `filterByDifficulty` / `activeDifficultyForGate` / `cycleDifficulty` utility → Task 1
- ✅ Unit tests for utility → Task 1
- ✅ `difficultyMap` in mechStore with localStorage + broadcast → Task 2
- ✅ `availableDifficulties` on `LibraryGate`, `difficulties?` on `LibraryMechanic` → Task 3
- ✅ `makeMechanics` + `stableGate` pass through `difficulties` → Task 3
- ✅ Known Solo/Nightmare raid overrides → Task 3
- ✅ GateSidebar cycling chip (Style A, S→N→H→NM order) → Task 4
- ✅ MechModal difficulty checkboxes → Task 5
- ✅ Editor `availableDifficulties` prop passed to MechModal → Task 5
- ✅ MechRow difficulty pills → Task 6
- ✅ Editor `sorted` filtered by active difficulty → Task 7
- ✅ HPTimeline uses filtered `sorted` → Task 7
- ✅ Overlay `visibleMechanics` replaces `gate.mechanics` in all 3 locations → Task 8
- ✅ `mech:difficulty-changed` listener in overlay → Task 8
- ✅ Color palette (Solo blue, Normal gray, Hard orange, NM purple) → Tasks 4, 5, 6
- ✅ Persistence via localStorage → Task 2
- ✅ `Gate` object unchanged (difficulty in separate map) → confirmed by no Gate changes in any task
- ✅ Rust backend unchanged → confirmed no Rust tasks

**Library data-entry phase:** Not in this plan — the spec explicitly separates it. Tasks 3.4 covers schema + known overrides. The Maxroll per-mechanic tagging (220 mechanics) is a follow-on data-entry task driven by the spec's "Library Data-Entry Phase" section.
