# Announcement Lead Time Text

**Date:** 2026-05-05
**Status:** Approved

## Problem

When the HP Trigger Lead Time or Repeating Pattern Lead Time fires a TTS announcement, it currently speaks only the mechanic name (e.g. "Stack"). The user has no audio cue that the mechanic is *upcoming* rather than happening right now.

## Goal

- HP trigger lead: speak `"<name> in N bars"` where N is the bars remaining until the mechanic fires
- Repeat lead: speak `"<name> in N seconds"` where N is the `repeatLead` setting value

The visual `lastAnnounced` banner and Discord webhook title are unchanged — they still show just the mechanic name.

## Scope

Two files, two call sites each:
- `src/routes/(mech)/mech-overlay/+page.svelte` — live overlay
- `src/lib/components/mech/OverlayPreviewPanel.svelte` — settings preview

The `announce()` / `fireAnnouncement()` function signatures are **not** changed. The computed spoken text is built at each call site and passed as the `ttsText` argument.

## Design

### HP trigger (existing `$effect` block)

At fire time `bar` is in `(m.hpBar, m.hpBar + cfg.lead]`. Bars remaining = `bar - m.hpBar`.

**Before:**
```js
announce(m.name, m.severity, m.ttsEnabled, m.ttsText);
```

**After:**
```js
const barsLeft = bar - m.hpBar;
announce(
  m.name, m.severity, m.ttsEnabled,
  `${m.ttsText || m.name} in ${barsLeft} bar${barsLeft === 1 ? '' : 's'}`
);
```

Also replace the cycleKey `${m.id}-${Math.floor(bar / (m.repeatSecs ?? 999999))}` with `${m.id}-initial` — the old key inherited the repeat-cycle pattern unnecessarily.

### Repeat cycle (new block, same `$effect`)

`repeatLead` is stored in `MechSettings` (default 5s) and labeled "X seconds" in the UI, but was never used in the firing logic. This block implements it.

Added **after** the HP trigger block, inside the same `gate.mechanics.forEach`:

```js
if (m.repeatSecs && bar < m.hpBar) {
  const H = m.hpBar;
  const R = m.repeatSecs;
  const n = Math.ceil((H - bar) / R);   // next upcoming repeat cycle number
  const triggerBar = H - n * R;
  const repeatKey = `${m.id}-repeat-${n}`;
  if (
    triggerBar >= 0 &&
    bar > triggerBar &&
    bar <= triggerBar + cfg.repeatLead &&
    !lastFiredKey.has(repeatKey)
  ) {
    lastFiredKey.add(repeatKey);
    const secsLeft = cfg.repeatLead;
    announce(
      m.name, m.severity, m.ttsEnabled,
      `${m.ttsText || m.name} in ${secsLeft} second${secsLeft === 1 ? '' : 's'}`
    );
  }
}
```

Key invariants:
- `n = Math.ceil((H - bar) / R)` resolves the correct upcoming cycle without iteration
- `triggerBar >= 0` prevents firing after the fight ends (negative bar values)
- `repeatKey` is unique per cycle; `lastFiredKey` is cleared on gate change so old keys don't persist across fights
- Spoken text uses `m.ttsText || m.name` as the base, consistent with the HP trigger

### OverlayPreviewPanel

Apply identical changes to the `$effect` + `fireAnnouncement` call inside `OverlayPreviewPanel.svelte`. The panel also needs `cfg.repeatLead` pulled from `mechStore.mechSettings` (it currently only reads `lead`).

## Out of scope

- TTS speed/rate control
- Mid-gate boss name change / false isDead handling
- Settings persistence audit

These are tracked separately.
