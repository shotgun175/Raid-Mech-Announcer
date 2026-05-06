# Difficulty Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the click-to-cycle difficulty chip in the sidebar with a floating panel dropdown that lets users jump directly to any difficulty in one click, and rename the "NM" label to "Nightmare" everywhere.

**Architecture:** Two isolated changes — a one-line label fix in `difficulty.ts` (propagates globally via `DIFFICULTY_STYLE`) and a dropdown interaction replacement in `GateSidebar.svelte` using a single `$state` variable plus a backdrop div for dismiss-on-outside-click.

**Tech Stack:** Svelte 5 runes, TypeScript, Vitest (unit tests), inline CSS styles (no Tailwind in sidebar).

---

## File Map

| File | Change |
|------|--------|
| `src/lib/utils/difficulty.ts` | Change `Nightmare.label` from `"NM"` to `"Nightmare"` |
| `src/lib/utils/difficulty.test.ts` | Add label assertion to confirm the rename |
| `src/lib/components/mech/GateSidebar.svelte` | Replace cycle-onclick chip with dropdown toggle + floating panel |

---

## Task 1: Fix Nightmare label

**Files:**
- Modify: `src/lib/utils/difficulty.ts`
- Modify: `src/lib/utils/difficulty.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside `describe("DIFFICULTY_STYLE")` in `src/lib/utils/difficulty.test.ts` — add the describe block itself if it doesn't exist yet:

```typescript
import { describe, it, expect } from "vitest";
import { filterByDifficulty, cycleDifficulty, activeDifficultyForGate, DIFFICULTY_STYLE } from "./difficulty";
import type { Mechanic } from "../mech-types";

// ... existing tests unchanged ...

describe("DIFFICULTY_STYLE", () => {
  it("uses full word labels for all difficulties", () => {
    expect(DIFFICULTY_STYLE.Solo.label).toBe("Solo");
    expect(DIFFICULTY_STYLE.Normal.label).toBe("Normal");
    expect(DIFFICULTY_STYLE.Hard.label).toBe("Hard");
    expect(DIFFICULTY_STYLE.Nightmare.label).toBe("Nightmare");
  });
});
```

Note: `DIFFICULTY_STYLE` must be added to the import line at the top of the test file.

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/utils/difficulty.test.ts
```

Expected: FAIL — `expected 'NM' to be 'Nightmare'`

- [ ] **Step 3: Change the label in difficulty.ts**

In `src/lib/utils/difficulty.ts`, update line 11:

```typescript
Nightmare: { color: "#a855f7", bg: "#120d1a", border: "#a855f733", label: "Nightmare" },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/utils/difficulty.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/difficulty.ts src/lib/utils/difficulty.test.ts
git commit -m "fix: rename Nightmare difficulty label from NM to Nightmare"
```

---

## Task 2: Replace cycle chip with floating dropdown in GateSidebar

**Files:**
- Modify: `src/lib/components/mech/GateSidebar.svelte`

- [ ] **Step 1: Add openDiffDropdown state**

In `GateSidebar.svelte`, inside the `<script lang="ts">` block, add after the existing state declarations (after line 11):

```typescript
let openDiffDropdown = $state<string | null>(null);
```

- [ ] **Step 2: Remove cycleDifficulty import**

`cycleDifficulty` is no longer needed. Update the import on line 5:

```typescript
import { DIFFICULTY_STYLE } from "$lib/utils/difficulty";
```

(`cycleDifficulty` removed; `DIFFICULTY_STYLE` kept)

- [ ] **Step 3: Replace the chip button with dropdown trigger + panel**

Find the difficulty chip button block (lines 140–165 in `GateSidebar.svelte`). Replace the entire button with this:

```svelte
<!-- Difficulty dropdown -->
<div style="position: relative; flex-shrink: 0;">
  <button
    onclick={(e) => {
      e.stopPropagation();
      openDiffDropdown = openDiffDropdown === raidName ? null : raidName;
    }}
    title="Select difficulty"
    style="
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
    "
  >{sty ? sty.label : "ALL"} ▾</button>

  {#if openDiffDropdown === raidName}
    <!-- Backdrop: catches outside clicks -->
    <div
      role="presentation"
      style="position: fixed; inset: 0; z-index: 19;"
      onclick={() => (openDiffDropdown = null)}
    ></div>

    <!-- Floating panel -->
    <div
      style="
        position: absolute; right: 0; top: 100%; margin-top: 3px; z-index: 20;
        background: #1a1a1a; border: 1px solid #333; border-radius: 4px;
        min-width: 100px; overflow: hidden;
        box-shadow: 0 4px 14px rgba(0,0,0,0.6);
      "
    >
      <!-- All (null) option -->
      <button
        onclick={(e) => {
          e.stopPropagation();
          mechStore.setDifficulty(raidName, null);
          openDiffDropdown = null;
        }}
        style="
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 4px 10px; font-size: 10px; font-weight: 600;
          color: #525252; background: {diff === null ? '#252525' : 'transparent'};
          border: none; cursor: pointer; font-family: inherit; text-align: left;
          letter-spacing: 0.03em;
        "
      >
        <span>All</span>
        {#if diff === null}<span>✓</span>{/if}
      </button>

      <!-- Per-difficulty options -->
      {#each availableDifficultiesFor(raidName) as d (d)}
        {@const ds = DIFFICULTY_STYLE[d]}
        <button
          onclick={(e) => {
            e.stopPropagation();
            mechStore.setDifficulty(raidName, d);
            openDiffDropdown = null;
          }}
          style="
            display: flex; align-items: center; justify-content: space-between;
            width: 100%; padding: 4px 10px; font-size: 10px; font-weight: 600;
            color: {ds.color}; background: {diff === d ? ds.bg : 'transparent'};
            border: none; cursor: pointer; font-family: inherit; text-align: left;
            letter-spacing: 0.03em;
          "
        >
          <span>{ds.label}</span>
          {#if diff === d}<span>✓</span>{/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
```

Note: `diff` and `sty` are already declared in the `{@const}` bindings above this element in the `{#each raidNames}` block — no changes needed there.

- [ ] **Step 4: Run TypeScript check**

```bash
npm run check
```

Expected: no errors. If `cycleDifficulty` is flagged as unused elsewhere, it isn't — the import was already scoped to this file.

- [ ] **Step 5: Smoke test in the app**

```bash
npm run tauri:dev
```

Verify:
1. Clicking a difficulty chip opens the floating panel with All + raid-specific difficulties listed.
2. Clicking a difficulty option applies the filter (gate rows update) and closes the panel.
3. Clicking "All" clears the filter and closes the panel.
4. Opening a second raid's panel closes the first.
5. Clicking outside the panel (anywhere else on screen) closes it without changing selection.
6. The chip still shows the correct label and color for the active difficulty.
7. "Nightmare" appears in the panel (not "NM").

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/mech/GateSidebar.svelte
git commit -m "feat: replace difficulty cycle chip with floating dropdown in sidebar"
```
