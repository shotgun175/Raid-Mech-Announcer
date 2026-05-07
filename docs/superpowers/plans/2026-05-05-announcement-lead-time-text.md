# Announcement Lead-Time Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TTS announcements say "X in N bars" for HP-trigger lead time and "X in N seconds" for repeat-cycle lead time instead of just the mechanic name.

**Architecture:** All changes are inside two `$effect` blocks — one in the live overlay page and one in the settings preview panel. No new functions, no signature changes. The spoken text is computed inline at each `announce()` / `fireAnnouncement()` call. The repeat cycle firing logic (previously unimplemented despite `repeatLead` existing in settings) is added to the same `$effect` blocks.

**Tech Stack:** Svelte 5 runes, TypeScript. No test framework — verification is `npm run check` (TypeScript) + manual smoke test via `npm run tauri:dev`.

---

## File Map

| File | Change |
|------|--------|
| `src/routes/(mech)/mech-overlay/+page.svelte` | Rewrite the announcement `$effect` (lines 85–98): swap cycleKey, add "in N bars" to HP trigger, add repeat cycle block |
| `src/lib/components/mech/OverlayPreviewPanel.svelte` | Same rewrite for the preview panel `$effect` (lines 36–48): swap `lead` local to `cfg`, same two blocks |

---

## Task 1: Update HP trigger text and add repeat cycle logic — overlay page

**Files:**
- Modify: `src/routes/(mech)/mech-overlay/+page.svelte:85-98`

- [ ] **Step 1: Replace the announcement `$effect` block**

Find this block (lines 85–98):

```svelte
  $effect(() => {
    if (currentBar == null || !gate) return;
    const bar = currentBar;
    const cfg = mechStore.mechSettings;
    gate.mechanics.forEach((m) => {
      if (m.hpBar == null) return;
      const fireAt = m.hpBar + cfg.lead;
      const cycleKey = `${m.id}-${Math.floor(bar / (m.repeatSecs ?? 999999))}`;
      if (bar <= fireAt && bar > m.hpBar && !lastFiredKey.has(cycleKey)) {
        lastFiredKey.add(cycleKey);
        announce(m.name, m.severity, m.ttsEnabled, m.ttsText);
      }
    });
  });
```

Replace it with:

```svelte
  $effect(() => {
    if (currentBar == null || !gate) return;
    const bar = currentBar;
    const cfg = mechStore.mechSettings;
    gate.mechanics.forEach((m) => {
      if (m.hpBar == null) return;

      // HP trigger: fires once as bar enters the lead window before the mechanic
      const fireAt = m.hpBar + cfg.lead;
      const initKey = `${m.id}-initial`;
      if (bar <= fireAt && bar > m.hpBar && !lastFiredKey.has(initKey)) {
        lastFiredKey.add(initKey);
        const barsLeft = bar - m.hpBar;
        announce(
          m.name, m.severity, m.ttsEnabled,
          `${m.ttsText || m.name} in ${barsLeft} bar${barsLeft === 1 ? '' : 's'}`
        );
      }

      // Repeat cycle: fires once per cycle as bar enters the repeatLead window
      if (m.repeatSecs && bar < m.hpBar) {
        const H = m.hpBar;
        const R = m.repeatSecs;
        const n = Math.ceil((H - bar) / R);
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
    });
  });
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 3: Commit**

```bash
git add src/routes/\(mech\)/mech-overlay/+page.svelte
git commit -m "feat: announce lead-time text in overlay — HP trigger and repeat cycles"
```

---

## Task 2: Mirror the same changes in OverlayPreviewPanel

**Files:**
- Modify: `src/lib/components/mech/OverlayPreviewPanel.svelte:36-48`

- [ ] **Step 1: Replace the announcement `$effect` block**

Find this block (lines 36–48):

```svelte
  $effect(() => {
    if (!gate || isLive) return;
    const lead = mechStore.mechSettings.lead;
    gate.mechanics.forEach((m) => {
      if (m.hpBar == null) return;
      const fireAt = m.hpBar + lead;
      const cycleKey = `${m.id}-${Math.floor(_simBar / (m.repeatSecs ?? 999999))}`;
      if (_simBar <= fireAt && _simBar > m.hpBar && !firedSet.has(cycleKey)) {
        firedSet.add(cycleKey);
        fireAnnouncement(m.name, m.severity, m.ttsEnabled, m.ttsText);
      }
    });
  });
```

Replace it with:

```svelte
  $effect(() => {
    if (!gate || isLive) return;
    const cfg = mechStore.mechSettings;
    gate.mechanics.forEach((m) => {
      if (m.hpBar == null) return;

      // HP trigger: fires once as _simBar enters the lead window before the mechanic
      const fireAt = m.hpBar + cfg.lead;
      const initKey = `${m.id}-initial`;
      if (_simBar <= fireAt && _simBar > m.hpBar && !firedSet.has(initKey)) {
        firedSet.add(initKey);
        const barsLeft = _simBar - m.hpBar;
        fireAnnouncement(
          m.name, m.severity, m.ttsEnabled,
          `${m.ttsText || m.name} in ${barsLeft} bar${barsLeft === 1 ? '' : 's'}`
        );
      }

      // Repeat cycle: fires once per cycle as _simBar enters the repeatLead window
      if (m.repeatSecs && _simBar < m.hpBar) {
        const H = m.hpBar;
        const R = m.repeatSecs;
        const n = Math.ceil((H - _simBar) / R);
        const triggerBar = H - n * R;
        const repeatKey = `${m.id}-repeat-${n}`;
        if (
          triggerBar >= 0 &&
          _simBar > triggerBar &&
          _simBar <= triggerBar + cfg.repeatLead &&
          !firedSet.has(repeatKey)
        ) {
          firedSet.add(repeatKey);
          const secsLeft = cfg.repeatLead;
          fireAnnouncement(
            m.name, m.severity, m.ttsEnabled,
            `${m.ttsText || m.name} in ${secsLeft} second${secsLeft === 1 ? '' : 's'}`
          );
        }
      }
    });
  });
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/mech/OverlayPreviewPanel.svelte
git commit -m "feat: announce lead-time text in preview panel — HP trigger and repeat cycles"
```

---

## Task 3: Manual smoke test

No automated test framework is present. Verify both paths manually using the Settings → Overlay Preview tab (no game required) and optionally a live PeerJS session.

**Path A — HP trigger lead time (Overlay Preview tab):**

- [ ] Open Settings → Overlay Preview tab
- [ ] Select any gate that has at least one mechanic with an HP bar trigger (e.g. Echidna G1 "Red Doom Narkiel", first mechanic)
- [ ] Note the mechanic's HP bar threshold (e.g. 350) and the current Lead Time setting (e.g. 10 bars)
- [ ] Press Play on the sim slider and watch the bar count down
- [ ] When the bar hits `threshold + lead` (e.g. 360), TTS should fire and say **"[mechanic name] in 10 bars"** (or whatever the actual `bar - hpBar` value is at that moment — will be ≤ lead)
- [ ] Confirm the `lastAnnounced` banner in the preview shows just the mechanic name (not the "in N bars" suffix)

**Path B — Repeat cycle lead time (Overlay Preview tab):**

- [ ] Select a gate that has a mechanic with `repeatSecs` set (hp+timer trigger type — visible in the mechanic editor as a ↻ badge)
- [ ] Note the mechanic's HP bar threshold (H), repeat interval (R bars), and Repeating Pattern Lead Time setting (repeatLead seconds, default 5)
- [ ] Play the sim past the first trigger (bar drops below H)
- [ ] As bar approaches `H - R` (first repeat trigger), TTS should fire `repeatLead` bars before it and say **"[mechanic name] in 5 seconds"**
- [ ] Confirm it fires again approaching `H - 2R`, `H - 3R`, etc. (a new announcement each repeat cycle)
- [ ] Confirm it does NOT fire a second time within the same cycle window

**Path C — Custom ttsText (regression):**

- [ ] Edit a mechanic to set a custom TTS text (e.g. "Stack up")
- [ ] Run the sim past its trigger window
- [ ] Confirm TTS says **"Stack up in N bars"**, not "Mechanic Name in N bars"
