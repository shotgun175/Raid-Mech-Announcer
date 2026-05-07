<!-- @release Unreleased -->
<div class="rounded-md flex space-x-2 items-center">
  <div class="text-lg font-semibold text-white">
    Unreleased
  </div>
</div>

#### Fixes

- Auto-updater now actually works — added the missing `updater:default` Tauri v2 capability permission. The frontend's `check()` call was being silently denied before, which is why v0.1.0 never saw the v0.1.1 update. From this version on, the in-app updater prompts work as expected.
<!-- @release-end -->

<!-- @release v0.1.0 -->
<div class="rounded-md flex space-x-2 items-center">
  <div class="text-lg font-semibold text-white">
    v0.1.0 - May 2026
  </div>
  <div class="bg-accent-500 px-2 font-medium rounded-md text-white">
    New
  </div>
</div>

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
