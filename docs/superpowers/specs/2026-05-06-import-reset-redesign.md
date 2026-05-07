# Import Modal Cleanup + Reset Scope Popover — Design Spec

**Date:** 2026-05-06
**Status:** Approved
**Branch:** feat/import-reset-redesign

---

## Problem

Two related UX issues:

1. **Import modal clutter**: Already-imported gates appear in the import list alongside unimported ones, forcing users to scroll past gates they have already added to find new ones.

2. **Reset granularity**: The existing "reset to defaults" button resets everything to the 3 newest raid defaults. Users have no way to reset a single gate or a single raid without nuking their whole setup.

---

## Decisions

| Question | Answer |
|---|---|
| Should imported gates be hidden from the import modal? | Yes — hide entirely, no toggle |
| Where does per-gate reset live? | Existing button opens a scope popover |
| Reset scopes available | Gate, Raid, Everything |
| Should the button label change? | No — same label at rest |
| Two-step confirmation needed? | Gate/Raid execute immediately; Everything retains second-click confirm |
| Non-library gates in reset? | Custom user-created gates are unaffected (no-op) |

---

## Import Modal Changes (`ImportRaidsModal.svelte`)

### New behaviour
- Gates where `isImported(raids, entry.encounterKey)` returns `true` are filtered out of `filteredRaids` before rendering
- The "Add All" button only appears if at least one gate in the raid is not yet imported
- If ALL gates in a raid group are imported, the entire raid group header is hidden
- No toggle, no "show imported" option — the modal is purely an "add new gates" surface

Recovery of deleted/customised gates happens through the reset popover, not the import modal.

---

## Reset Scope Popover (`GateSidebar.svelte`)

### Trigger
Existing "resest to Defaults" button at the bottom of the sidebar. Visual appearance unchanged at rest.

### Popover behaviour
Clicking opens a popover anchored above the button. The rest of the sidebar and the editor dim (opacity 0.35) while the popover is open. Clicking outside or pressing Escape dismisses without action.

### Three options

| Option | Icon | Colour | Label | Sub-label | Scope |
|---|---|---|---|---|---|
| Gate | Portal arch SVG | Sky `#38bdf8` | Gate | `G{n} · {boss} — restore library mechanics` | Selected gate only |
| Raid | Crossed swords SVG | Orange `#fb923c` | Raid | `All {raid} gates (G1–G{n})` | All gates in the active raid |
| Everything | Mushroom cloud SVG | Red `#f87171` | Everything | `All raids — restore 3 newest defaults` | Full reset (current behaviour) |

A thin divider separates Raid from Everything.

### Gate reset logic (new `mechStore.resetGate`)
```ts
resetGate(gateId: string) {
  const gate = raids.find(r => r.id === gateId);
  if (!gate) return;
  const entry = LIBRARY.find(e => e.encounterKey === gate.encounterKey);
  if (!entry) return; // custom gate — no-op
  const fresh = buildLibraryGate(entry);
  raids = raids.map(r => r.id === gateId ? { ...fresh, id: r.id } : r);
  saveRaids();
}
```

### Raid reset logic (new `mechStore.resetRaid`)
```ts
resetRaid(raidName: string) {
  raids = raids.map(r => {
    if (r.raid !== raidName) return r;
    const entry = LIBRARY.find(e => e.encounterKey === r.encounterKey);
    if (!entry) return r; // custom gate — preserve as-is
    return { ...buildLibraryGate(entry), id: r.id };
  });
  saveRaids();
}
```

### Everything reset
Calls existing `mechStore.resetRaids()` unchanged.

### Confirmation
- **Gate** and **Raid**: single click executes immediately
- **Everything**: retains existing two-step confirm — button turns red, second click within 3s executes

### Disabled states
If the selected gate has no library match, Gate option shows disabled with sub-label "Custom gate — no library version". Raid option is disabled if none of its gates have library entries.

---

## SVG Icons (all viewBox="0 0 24 24", rendered 20x20)

Stored as inline SVG directly in GateSidebar.svelte — no new files needed.

**Gate — portal arch** (blue `#38bdf8`)
**Raid — crossed swords** (orange `#fb923c`)
**Everything — mushroom cloud** (red `#f87171`)

Full SVG paths documented in the approved mockup at:
`.superpowers/brainstorm/139436-1778092096/content/reset-final.html`

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/components/mech/ImportRaidsModal.svelte` | Filter imported gates from `filteredRaids`; hide fully-imported raid groups |
| `src/lib/components/mech/GateSidebar.svelte` | Replace two-step confirm with popover; add `showResetPopover` state; add Gate/Raid/Everything options |
| `src/lib/mech-store.svelte.ts` | Add `resetGate(gateId)` and `resetRaid(raidName)` methods |

---

## What Does NOT Change

- The button label, position, and appearance at rest
- `mechStore.resetRaids()` — Everything calls it unchanged
- The "Add Raid" custom gate creation form
- Any overlay, settings, or announcement logic
