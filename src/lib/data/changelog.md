<!-- @release Unreleased -->
<div class="rounded-md flex space-x-2 items-center">
  <div class="text-lg font-semibold text-white">
    Unreleased
  </div>
  <div class="bg-accent-500 px-2 font-medium rounded-md text-white">
    New
  </div>
</div>

<!--
  Bullets go below this comment. Write them for an end-user — a Lost Ark player
  who installed the app — not for a developer. The workflow strips this comment
  block from release notes, so detailed guidance here doesn't leak.

  Tone: plain English, present-tense or past-tense ("Auto-updates now work" /
  "Fixed a crash when…"). No file paths, no identifiers in backticks, no PR/commit
  references, no internal terms.

  GOOD vs BAD examples:
    GOOD: "Auto-updates now work properly. Earlier versions couldn't detect new releases."
    BAD:  "Fixed `updater:default` capability permission in capabilities/desktop.json"

    GOOD: "Added the new Aegir raid to the library."
    BAD:  "Added entries to raid-library.ts for Aegir gates 1-3"

    GOOD: "Mech list scrolls more smoothly when you've imported many raids."
    BAD:  "Refactored MechRow.svelte to use $derived.by instead of $effect"
-->

<!-- @release-end -->

<!-- @release v0.1.4 -->
<div class="rounded-md flex space-x-2 items-center">
  <div class="text-lg font-semibold text-white">
    v0.1.4 - May 8th, 2026
  </div>
  <div class="bg-accent-500 px-2 font-medium rounded-md text-white">
    New
  </div>
</div>

<!--
  Bullets go below this comment. Write them for an end-user — a Lost Ark player
  who installed the app — not for a developer. The workflow strips this comment
  block from release notes, so detailed guidance here doesn't leak.

  Tone: plain English, present-tense or past-tense ("Auto-updates now work" /
  "Fixed a crash when…"). No file paths, no identifiers in backticks, no PR/commit
  references, no internal terms.

  GOOD vs BAD examples:
    GOOD: "Auto-updates now work properly. Earlier versions couldn't detect new releases."
    BAD:  "Fixed `updater:default` capability permission in capabilities/desktop.json"

    GOOD: "Added the new Aegir raid to the library."
    BAD:  "Added entries to raid-library.ts for Aegir gates 1-3"

    GOOD: "Mech list scrolls more smoothly when you've imported many raids."
    BAD:  "Refactored MechRow.svelte to use $derived.by instead of $effect"
-->

#### Test

  - Verifying the auto-stamp + demote workflow works end-to-end.

<!-- @release-end -->

<!-- @release v0.1.3 -->
### v0.1.3 - 2026-05-07

#### Fixes
- Auto-updater now works properly.
<!-- @release-end -->

<!-- @release v0.1.2 -->
### v0.1.2 - May 2026

#### Fixes

- Auto-updates now work properly. Earlier versions could not detect new releases when they were published. This version fixes that, and from here on future updates arrive automatically when you launch the app.
<!-- @release-end -->

<!-- @release v0.1.0 -->
### v0.1.0 - May 2026

#### Initial Release

**Raid Editor**

- Build and manage mechanic patterns per raid gate with HP, timer, and repeat triggers
- Import pre-built templates from the raid library — all 18 raid groups covered (Valtan through Serca), 48 gates, 220 mechanics
- Each imported mechanic includes notes sourced from Maxroll guides: sidereal timing, HM/NM differences, and key callout patterns
- Live HP bar integration — auto-matches the active gate when LOA Logs sends boss status
- Drag to reorder raids; remove individual raids or reset to the 3 newest defaults

**Overlay**

- 5 overlay variants: Combined, Compact List, HUD Strip, Card Stack, Minimal Pill
- HP bar threshold shown inline with mechanic name (e.g. "Mirror Counter · 212×")
- Scalable (Small / Normal / Large / Largest) — no scrollbars at any size
- Overlay Preview tab in Settings for live simulation and drag-to-position testing
- Simulation HP bar starts near the first mechanic threshold for each boss

**LOA Logs Connection**

- Auto-detects LOA Logs share URL from clipboard app-wide (no need to be on a specific screen)
- Connection status visible in the hamburger menu on every page

**Settings**

- TTS announcements via neural edge-tts voices (Andrew / Jenny) or Windows SAPI fallback
- Discord webhook integration with per-mechanic firing
- Shortcuts tab: configurable Hide Overlay and Confirm Pattern hotkeys
- Shortcuts register on startup — no need to visit Settings first each session

**General**

- Taskbar icon shown when the overlay is on screen
- Windows app binary: Raid Mech Announcer
<!-- @release-end -->
