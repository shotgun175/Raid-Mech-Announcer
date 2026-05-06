# Import Modal Cleanup + Reset Scope Popover — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide already-imported gates from the import modal, and replace the global "Reset to Defaults" single-confirm with a three-option scope popover (Gate / Raid / Everything).

**Architecture:** Three files change. The store gains two new scoped reset methods. The import modal filters its own derived list. The sidebar replaces its two-step confirm state with a popover anchored above the reset button, using the existing diff-dropdown pattern for dismissal.

**Tech Stack:** Svelte 5 runes, TypeScript, inline styles (no Tailwind on overlay/sidebar components)

---

## Spec deviation to note

The spec references `gate.encounterKey` but the `Gate` interface has no such field. Match library entries by `entry.raid === gate.raid && entry.gate === gate.gate` instead.

---

## File Map

| File | What changes |
|---|---|
| `src/lib/mech-store.svelte.ts` | Add `resetGate(gateId)` and `resetRaid(raidName)`; import `LIBRARY` and `buildLibraryGate` |
| `src/lib/components/mech/ImportRaidsModal.svelte` | Filter imported gates from derived list; hide fully-imported raid groups |
| `src/lib/components/mech/GateSidebar.svelte` | Replace `confirmReset` two-step with `showResetPopover` + `confirmEverything`; render popover with SVG icons |

---

## Task 1 — Add `resetGate` and `resetRaid` to mechStore

**Files:**
- Modify: `src/lib/mech-store.svelte.ts`

- [ ] **Step 1 — Update the import line at the top of the file**

Change:
```ts
import { buildDefaultRaids } from "./data/raid-library";
```
To:
```ts
import { buildDefaultRaids, buildLibraryGate, LIBRARY } from "./data/raid-library";
```

- [ ] **Step 2 — Add `resetGate` after the existing `resetRaids` method (line ~252)**

Locate the `resetRaids()` method. Add these two methods directly after it, before `updateSetting`:

```ts
resetGate(gateId: string) {
  const gate = raids.find((r) => r.id === gateId);
  if (!gate) return;
  const entry = LIBRARY.find((e) => e.raid === gate.raid && e.gate === gate.gate);
  if (!entry) return; // custom gate — no library version, no-op
  const fresh = buildLibraryGate(entry);
  raids = raids.map((r) => (r.id === gateId ? { ...fresh, id: r.id } : r));
  saveRaids();
},

resetRaid(raidName: string) {
  raids = raids.map((r) => {
    if (r.raid !== raidName) return r;
    const entry = LIBRARY.find((e) => e.raid === r.raid && e.gate === r.gate);
    if (!entry) return r; // custom gate — preserve as-is
    return { ...buildLibraryGate(entry), id: r.id };
  });
  saveRaids();
},
```

- [ ] **Step 3 — Type-check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 4 — Commit**

```bash
git add src/lib/mech-store.svelte.ts
git commit -m "feat: add resetGate and resetRaid to mechStore"
```

---

## Task 2 — Filter imported gates in ImportRaidsModal

**Files:**
- Modify: `src/lib/components/mech/ImportRaidsModal.svelte`

The current template renders all gates then shows an Add/Remove button per gate. We need to:
1. Skip rendering any gate where `isImported` is true
2. Skip rendering the entire raid group if every gate in it is imported

- [ ] **Step 1 — Remove the `removeGate` function (no longer needed in this modal)**

Delete lines 40–43:
```ts
function removeGate(entry: LibraryGate) {
  const id = importedId(mechStore.raids, entry.encounterKey);
  if (id) mechStore.removeGate(id);
}
```

Also remove the now-unused `importedId` from the import at the top:
```ts
import {
  buildLibraryGate,
  isImported,
  libraryByRaid,
  sortedRaidNames,
  type LibraryGate
} from "$lib/data/raid-library";
```

- [ ] **Step 2 — Remove the `removeRaid` button from the raid header row**

In the template, delete the "Remove All" button block (lines 141–150):
```svelte
{#if importedCount > 0}
  <button
    onclick={(e) => {
      e.stopPropagation();
      mechStore.removeRaid(raidName);
    }}
    style="{btn} background: rgba(248,113,113,0.08); color: #f87171; border: 1px solid rgba(248,113,113,0.2); padding: 3px 10px;"
    >Remove All</button
  >
{/if}
```

- [ ] **Step 3 — Wrap the raid group in an `{#if !allImported}` guard**

The outermost `<div style="margin-bottom: 2px;">` block (line 107) should only render when there is at least one unimported gate. Change:

```svelte
{#each filteredRaids as raidName (raidName)}
  {@const gates = libraryByRaid[raidName]}
  {@const importedCount = gates.filter((g) => isImported(mechStore.raids, g.encounterKey)).length}
  {@const allImported = importedCount === gates.length}
  <div style="margin-bottom: 2px;">
```

To:

```svelte
{#each filteredRaids as raidName (raidName)}
  {@const gates = libraryByRaid[raidName]}
  {@const importedCount = gates.filter((g) => isImported(mechStore.raids, g.encounterKey)).length}
  {@const allImported = importedCount === gates.length}
  {#if !allImported}
  <div style="margin-bottom: 2px;">
```

And close the `{#if}` just before the `{:else}` empty-state block — after the closing `</div>` of the raid group div:

```svelte
  </div>
  {/if}
{:else}
  <div style="padding: 32px; ...">No raids match "{search}"</div>
{/each}
```

- [ ] **Step 4 — Filter out imported gates from the per-gate list**

Inside the `{#each gates as entry (entry.encounterKey)}` loop (line 156), add an `{#if !imported}` guard so imported gates are skipped entirely:

```svelte
{#each gates as entry (entry.encounterKey)}
  {@const imported = isImported(mechStore.raids, entry.encounterKey)}
  {#if !imported}
  <div
    style="margin: 2px 10px 2px 32px; background: #0f0f0f; border: 1px solid #1f1f1f; border-radius: 6px; padding: 10px 14px;"
  >
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px;">
      <div>
        <span style="font-size: 12.5px; font-weight: 600; color: #e5e5e5;">{gateLabel(entry.gate)}</span>
        <span style="font-size: 12px; color: #8a8a8a; margin-left: 8px;">{entry.boss}</span>
      </div>
      <button
        onclick={() => importGate(entry)}
        style="{btn} background: rgba(56,189,248,0.1); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3);"
        >+ Import</button
      >
    </div>
    <!-- Mechanic chips -->
    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
      {#each entry.mechanics as m}
        <span
          style="font-size: 12px; color: {severityColor[m.severity]}; background: {m.severity === 'wipe'
            ? 'rgba(248,113,113,0.08)'
            : m.severity === 'major'
              ? 'rgba(251,146,60,0.08)'
              : 'rgba(163,163,163,0.06)'}; border: 1px solid {m.severity === 'wipe'
            ? 'rgba(248,113,113,0.2)'
            : m.severity === 'major'
              ? 'rgba(251,146,60,0.2)'
              : 'rgba(163,163,163,0.12)'}; border-radius: 3px; padding: 1px 6px; white-space: nowrap;"
        >
          {m.name}{m.hpBar != null ? ` · ${m.hpBar}×` : m.repeatSecs ? ` · ↻${m.repeatSecs}s` : ""}
        </span>
      {/each}
    </div>
  </div>
  {/if}
{/each}
```

Note: the `imported`-state green highlight and Remove button are gone since we never render imported gates.

- [ ] **Step 5 — Update the subtitle in the header to reflect the new behaviour**

Change:
```svelte
Select gates to add pre-built mechanic templates · newest first
```
To:
```svelte
Add pre-built mechanic templates · already-imported gates are hidden
```

- [ ] **Step 6 — Type-check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 7 — Commit**

```bash
git add src/lib/components/mech/ImportRaidsModal.svelte
git commit -m "feat: hide already-imported gates from import modal"
```

---

## Task 3 — Reset scope popover in GateSidebar

**Files:**
- Modify: `src/lib/components/mech/GateSidebar.svelte`

Replace the `confirmReset` / `handleReset` two-step with a popover. The popover anchors above the footer button using the same pattern as the difficulty dropdown (fixed backdrop div + absolute panel).

- [ ] **Step 1 — Replace the reset state and handler in `<script>`**

Remove:
```ts
let confirmReset = $state(false);
let resetTimer: ReturnType<typeof setTimeout> | null = null;

function handleReset() {
  if (!confirmReset) {
    confirmReset = true;
    resetTimer = setTimeout(() => {
      confirmReset = false;
    }, 3000);
  } else {
    if (resetTimer) clearTimeout(resetTimer);
    confirmReset = false;
    mechStore.resetRaids();
  }
}
```

Add:
```ts
let showResetPopover = $state(false);
let confirmEverything = $state(false);
let confirmEverythingTimer: ReturnType<typeof setTimeout> | null = null;

function openResetPopover() {
  showResetPopover = true;
  confirmEverything = false;
}

function closeResetPopover() {
  showResetPopover = false;
  confirmEverything = false;
  if (confirmEverythingTimer) { clearTimeout(confirmEverythingTimer); confirmEverythingTimer = null; }
}

function handleResetGate() {
  const gate = mechStore.selectedGate;
  if (!gate) return;
  mechStore.resetGate(gate.id);
  closeResetPopover();
}

function handleResetRaid() {
  const gate = mechStore.selectedGate;
  if (!gate) return;
  mechStore.resetRaid(gate.raid);
  closeResetPopover();
}

function handleResetEverything() {
  if (!confirmEverything) {
    confirmEverything = true;
    confirmEverythingTimer = setTimeout(() => {
      confirmEverything = false;
      confirmEverythingTimer = null;
    }, 3000);
  } else {
    mechStore.resetRaids();
    closeResetPopover();
  }
}
```

- [ ] **Step 2 — Add derived values for disabled states and sub-labels**

Add after the existing `raidsByName` derived block:

```ts
const selectedGate = $derived(mechStore.selectedGate);

const isGateResettable = $derived(
  selectedGate != null &&
    LIBRARY.some((e) => e.raid === selectedGate.raid && e.gate === selectedGate.gate)
);

const isRaidResettable = $derived(
  selectedGate != null &&
    mechStore.raids
      .filter((r) => r.raid === selectedGate.raid)
      .some((r) => LIBRARY.some((e) => e.raid === r.raid && e.gate === r.gate))
);

const gateResetLabel = $derived(
  selectedGate
    ? `G${selectedGate.gate} · ${selectedGate.boss.split(",")[0]} — restore library mechanics`
    : "No gate selected"
);

const raidGates = $derived(
  selectedGate ? (raidsByName[selectedGate.raid] ?? []) : []
);

const raidResetLabel = $derived(
  selectedGate && raidGates.length > 0
    ? `All ${selectedGate.raid} gates (G${raidGates[0].gate}–G${raidGates[raidGates.length - 1].gate})`
    : "No raid selected"
);
```

Also add the `LIBRARY` import at the top of the script:

```ts
import { libraryByRaid, LIBRARY } from "$lib/data/raid-library";
```

(The file already imports `libraryByRaid` — just add `LIBRARY` to that same destructure.)

- [ ] **Step 3 — Replace the footer markup in the template**

Find the existing footer div (line ~292–305):
```svelte
<!-- Reset — bottom of sidebar, away from normal actions -->
<div style="padding: 8px 10px; border-top: 1px solid #1a1a1a; flex-shrink: 0;">
  <button
    onclick={handleReset}
    style="...">
    {confirmReset ? "⚠ Confirm Reset?" : "↺ Reset to Defaults"}
  </button>
</div>
```

Replace entirely with:

```svelte
<!-- Reset — popover anchor -->
<div style="padding: 8px 10px; border-top: 1px solid #1a1a1a; flex-shrink: 0; position: relative;">

  {#if showResetPopover}
    <!-- Dim backdrop — covers everything behind the popover -->
    <div
      role="presentation"
      style="position: fixed; inset: 0; z-index: 29; background: rgba(0,0,0,0.4);"
      onclick={closeResetPopover}
    ></div>

    <!-- Popover panel — anchored above the button -->
    <div
      style="position: absolute; bottom: calc(100% + 6px); left: 0; right: 0; z-index: 30;
             background: #1e1e1e; border: 1px solid #383838; border-radius: 10px;
             padding: 13px; box-shadow: 0 -12px 40px rgba(0,0,0,0.7);"
    >
      <!-- Caret -->
      <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%) rotate(45deg);
                  width: 10px; height: 10px; background: #1e1e1e;
                  border-right: 1px solid #383838; border-bottom: 1px solid #383838;"></div>

      <div style="font-size: 10px; color: #525252; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 10px;">
        What do you want to reset?
      </div>

      <div style="display: flex; flex-direction: column; gap: 5px;">

        <!-- Gate option -->
        <button
          onclick={handleResetGate}
          disabled={!isGateResettable}
          style="display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 7px;
                 border: 1px solid #272727; background: #141414; cursor: {isGateResettable ? 'pointer' : 'not-allowed'};
                 font-family: inherit; text-align: left; opacity: {isGateResettable ? 1 : 0.4}; width: 100%;"
        >
          <div style="width: 34px; height: 34px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
                      flex-shrink: 0; background: rgba(14,165,233,0.1); border: 1px solid rgba(14,165,233,0.22);">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 17V9C5 6.24 7.24 4 10 4C12.76 4 15 6.24 15 9V17" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M5 17H15" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="10" cy="10" r="1.5" fill="#38bdf8" opacity="0.7"/>
              <line x1="5" y1="11" x2="3" y2="11" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
              <line x1="15" y1="11" x2="17" y2="11" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
            </svg>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 600; color: #38bdf8;">Gate</div>
            <div style="font-size: 10px; color: #525252; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              {isGateResettable ? gateResetLabel : "Custom gate — no library version"}
            </div>
          </div>
        </button>

        <!-- Raid option -->
        <button
          onclick={handleResetRaid}
          disabled={!isRaidResettable}
          style="display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 7px;
                 border: 1px solid #272727; background: #141414; cursor: {isRaidResettable ? 'pointer' : 'not-allowed'};
                 font-family: inherit; text-align: left; opacity: {isRaidResettable ? 1 : 0.4}; width: 100%;"
        >
          <div style="width: 34px; height: 34px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
                      flex-shrink: 0; background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.22);">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <line x1="4" y1="4" x2="16" y2="16" stroke="#fb923c" stroke-width="1.6" stroke-linecap="round"/>
              <line x1="3.5" y1="7.5" x2="7.5" y2="3.5" stroke="#fb923c" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
              <circle cx="15.5" cy="15.5" r="1.2" fill="#fb923c" opacity="0.6"/>
              <line x1="16" y1="4" x2="4" y2="16" stroke="#fb923c" stroke-width="1.6" stroke-linecap="round"/>
              <line x1="16.5" y1="7.5" x2="12.5" y2="3.5" stroke="#fb923c" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
              <circle cx="4.5" cy="15.5" r="1.2" fill="#fb923c" opacity="0.6"/>
            </svg>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 600; color: #fb923c;">Raid</div>
            <div style="font-size: 10px; color: #525252; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              {isRaidResettable ? raidResetLabel : "No library gates in this raid"}
            </div>
          </div>
        </button>

        <!-- Divider -->
        <div style="height: 1px; background: #222; margin: 3px 0;"></div>

        <!-- Everything option -->
        <button
          onclick={handleResetEverything}
          style="display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 7px;
                 border: 1px solid {confirmEverything ? 'rgba(248,113,113,0.4)' : '#272727'};
                 background: {confirmEverything ? 'rgba(248,113,113,0.08)' : '#141414'};
                 cursor: pointer; font-family: inherit; text-align: left; width: 100%; transition: all 0.15s;"
        >
          <div style="width: 34px; height: 34px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
                      flex-shrink: 0; background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.22);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="8" rx="7" ry="5.5" fill="#f87171" opacity="0.2" stroke="#f87171" stroke-width="1.3"/>
              <ellipse cx="12" cy="7.5" rx="4.5" ry="3.5" fill="#f87171" opacity="0.25"/>
              <path d="M10 13.5C10 13.5 10.5 16 11 17H13C13.5 16 14 13.5 14 13.5" stroke="#f87171" stroke-width="1.3" stroke-linecap="round" fill="none"/>
              <path d="M8 17.5C8 17.5 9.5 19 12 19C14.5 19 16 17.5 16 17.5" stroke="#f87171" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>
              <path d="M6 18C6 18 8.5 20.5 12 20.5C15.5 20.5 18 18 18 18" stroke="#f87171" stroke-width="1" stroke-linecap="round" opacity="0.3"/>
              <line x1="5.5" y1="6" x2="4" y2="4.5" stroke="#f87171" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
              <line x1="18.5" y1="6" x2="20" y2="4.5" stroke="#f87171" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
              <line x1="12" y1="2.5" x2="12" y2="1" stroke="#f87171" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
              <line x1="6" y1="9" x2="4" y2="9" stroke="#f87171" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
              <line x1="18" y1="9" x2="20" y2="9" stroke="#f87171" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
            </svg>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 600; color: #f87171;">
              {confirmEverything ? "⚠ Confirm?" : "Everything"}
            </div>
            <div style="font-size: 10px; color: #525252; margin-top: 2px;">All raids — restore 3 newest defaults</div>
          </div>
        </button>

      </div>
    </div>
  {/if}

  <!-- Trigger button — unchanged appearance -->
  <button
    onclick={openResetPopover}
    style="width: 100%; background: transparent; border: 1px solid #1f1f1f; border-radius: 4px;
           padding: 4px 6px; color: #3a3a3a; cursor: pointer; font-size: 12px; font-weight: 600;
           font-family: inherit; transition: all 0.15s;"
    onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = '#a3a3a3')}
    onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = '#3a3a3a')}
  >
    ↺ Reset to Defaults
  </button>
</div>
```

- [ ] **Step 4 — Add Escape key dismiss via svelte:window**

Just before the closing `</div>` of the outer sidebar div (around line 306), add:

```svelte
<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && showResetPopover) closeResetPopover(); }} />
```

- [ ] **Step 5 — Type-check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 6 — Commit**

```bash
git add src/lib/components/mech/GateSidebar.svelte
git commit -m "feat: replace reset confirm with gate/raid/everything scope popover"
```

---

## Final verification

- [ ] Run `npm run check` one more time across the full project — confirm `0 ERRORS 0 WARNINGS`
- [ ] Open the app with `npm run tauri:dev` (or `npm run dev` for frontend-only preview)
- [ ] Open Import Raids — verify no already-imported gates appear; verify fully-imported raids disappear
- [ ] Click "↺ Reset to Defaults" — verify popover opens, rest of UI dims
- [ ] Click outside the popover — verify it closes with no action taken
- [ ] Press Escape while popover is open — verify it closes
- [ ] Click "Gate" — verify only the selected gate's mechanics are restored; other gates unchanged
- [ ] Click "Raid" — verify all gates in that raid are restored; other raids unchanged  
- [ ] Click "Everything" once — verify button changes to "⚠ Confirm?"; click again — verify full reset
- [ ] Click "Everything" once, wait 3s — verify it reverts to "Everything" without executing

