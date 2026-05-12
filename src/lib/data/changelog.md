<!-- @release Unreleased -->
<div class="rounded-md flex space-x-2 items-center">
  <div class="text-lg font-semibold text-white">
    Unreleased
  </div>
  <div class="bg-accent-500 px-2 font-medium rounded-md text-white">
    New
  </div>
</div>

#### NEW FEATURES

#### BUG FIXES AND IMPROVEMENTS

- Overlay no longer opens oversized at startup. Idle pill stays on a single line when LOA Logs connects, instead of wrapping awkwardly until you nudge the window edge.

<!-- @release-end -->

<!-- @release v0.1.8 -->
<div class="rounded-md flex space-x-2 items-center">
  <div class="text-lg font-semibold text-white">
    v0.1.8 - May 11th, 2026
  </div>
  <div class="bg-accent-500 px-2 font-medium rounded-md text-white">
    New
  </div>
</div>

#### NEW FEATURES

- App launch is quieter: the settings window stays hidden by default. Right-click the tray icon and pick "Show Settings" when you want to make a change.
- Overlay is visible at launch for new installs (was previously hidden until a fight started). If you already use the app, your Auto Show / Hide setting stays as-is.
- Overlay idle text now tells you whether it is waiting on LOA Logs to connect, or waiting for a fight to start.

#### BUG FIXES AND IMPROVEMENTS

- Release workflow no longer scrambles bullet order in the stamped changelog.
- Fixed white flash when opening the settings window.
- Update notifications now bring the settings window into view automatically when a new release is available.
- Internal cleanup: route paths renamed to match the in-app names (Raid Editor, Settings). No app changes.

<!-- @release-end -->

<!-- @release v0.1.7 -->
### v0.1.7 - May 8th, 2026

- Internal cleanup: removed unused code and tightened the build. No app changes.
- Fixed a doubled-voice issue in rare cases
- Pitch slider removed

#### BUG FIXES AND IMPROVEMENTS

- Release dates now reflect Eastern time instead of UTC.
<!-- @release-end -->

<!-- @release v0.1.6 -->
### v0.1.6 - May 8th, 2026

#### BUG FIXES AND IMPROVEMENTS

- Cleaner changelog template with NEW FEATURES / BUG FIXES headings.
<!-- @release-end -->

<!-- @release v0.1.5 -->

### v0.1.5 - May 8th, 2026

Improvements to the release workflow, all in one cohesive YAML diff: 1. New "Release notes" textarea on the workflow_dispatch panel. 2. Date stamp now uses Eastern time (TZ=America/New_York) instead of UTC.

<!-- @release-end -->

<!-- @release v0.1.4 -->

### v0.1.4 - May 8th, 2026

Minor updates.

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


#### Initial Release

**Raid Editor**
<!-- @release-end -->
