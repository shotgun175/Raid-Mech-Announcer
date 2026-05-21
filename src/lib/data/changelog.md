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

- Master TTS toggle in Settings → Announcements. Flip it off to silence all spoken mechanic callouts in one click; the rest of the Announcements tab dims so it's clear nothing is going to speak. Discord webhook posts (if configured) still fire independently.

#### BUG FIXES AND IMPROVEMENTS

- Reset arrow on a customized mech now also restores Phase, the per-mech TTS toggle, and the TTS announcement text back to library defaults (previously those three fields stayed at whatever you'd last set them).
- "Show installed voices" link in Settings → Announcements now toggles - click again to hide the list.

<!-- @release-end -->

<!-- @release v0.2.1 -->
<div class="rounded-md flex space-x-2 items-center">
  <div class="text-lg font-semibold text-white">
    v0.2.1 - May 21st, 2026
  </div>
  <div class="bg-accent-500 px-2 font-medium rounded-md text-white">
    New
  </div>
</div>

#### BUG FIXES AND IMPROVEMENTS

- Truing up solo modes for Thaemine, Echidna, Aegir, Brelshaza, and Mordum
- Modal windows now close when you press Esc

<!-- @release-end -->

<!-- @release v0.2.0 -->
### v0.2.0 - May 20th, 2026

#### NEW FEATURES

- Raid library updates (boss name fixes, mechanic tweaks, new mechs added per patch) now flow into your already-imported raids automatically on app launch. No more re-importing a raid every time a mechanic detail changes.
- Your edits are preserved. If you've renamed a mech or tweaked an HP threshold, that mech gets a small "↺" button next to its edit/delete buttons and stops auto-updating. Click ↺ at any time to revert it to the library default.
- Custom mechs you added yourself are always preserved. Library updates never touch them.
- Sidebar shows a small accent-colored dot next to gates that received updates. The dot clears when you open that gate.
- `Reset to Defaults > Gate` and `Reset to Defaults > Raid` now ask "Keep custom mechs / Wipe all" when you've added custom mechs to those gates, so a one-click reset doesn't accidentally erase your work.
- `Reset to Defaults > Everything` keeps its existing 2-click confirm and remains the full nuclear-reset path.
- Heads-up for existing users: click `Reset to Defaults > Everything` in the sidebar once after installing this update. This stamps your existing raids with the new tracking fields so future library updates flow in cleanly. Anything that wasn't stamped is silently skipped (no duplicates, no broken state).

#### BUG FIXES AND IMPROVEMENTS

- The "push" encouragement message ("Push! Kill the boss.", "Execute phase, go go go!", etc.) now actually appears in the overlay window during the execute phase.
- Overlay now stays visible during brief phase transitions instead of disappearing.
- Auto-hide now only fires at true end of fight, not from short mid-fight silences.
- Going straight from G1 into G2 now flips the overlay to the new gate instead of staying stuck on the previous gate for up to 60 seconds.
- Difficulty picker in the raid sidebar now opens upward when it would otherwise be clipped at the bottom of the list, so the choices stay on-screen for every raid.

<!-- @release-end -->

<!-- @release v0.1.15 -->

### v0.1.15 - May 15th, 2026

#### BUG FIXES AND IMPROVEMENTS

- Fix overlay getting stuck on the previous gate's mechanics when you start a new fight right after finishing one.
- Stop repeating mechanic announcements from firing after the boss dies.

<!-- @release-end -->

<!-- @release v0.1.14 -->

### v0.1.14 - May 14th, 2026

#### BUG FIXES AND IMPROVEMENTS

- App updates now refresh the taskbar icon on their own going forward.

<!-- @release-end -->

<!-- @release v0.1.13 -->

### v0.1.13 - May 14th, 2026

#### BUG FIXES AND IMPROVEMENTS

- New app icon - a custom character portrait now appears in the taskbar, system tray, and Windows shortcut instead of the previous default.
- Overlay Preview: announcements and the post-mechanic "Push" card now respect the active difficulty, matching what fires during a real fight.
- Overlay Preview: dragging the simulate HP slider down to 0 no longer jitters or snaps back.

<!-- @release-end -->

<!-- @release v0.1.12 -->

### v0.1.12 - May 13th, 2026

#### NEW FEATURES

- Once every mechanic for the current gate has fired and the boss is still alive, the overlay now shows a short "push" message instead of going blank. One of a few short lines (e.g. "Push! Kill the boss.", "Execute phase, go go go!") is picked per fight.

#### BUG FIXES AND IMPROVEMENTS

- Fixed overlay flicker during multi-target phases where the overlay would briefly hide because only the sub-target was reporting HP. The overlay now stays put as long as the fight is still going.

<!-- @release-end -->

<!-- @release v0.1.11 -->

### v0.1.11 - May 12th, 2026

#### NEW FEATURES

- Solo Mode is now available for **Aegir**, **Act 2: Brelshaza**, and **Act 3: Mordum** when you import them from the raid library.

#### BUG FIXES AND IMPROVEMENTS

- Reconciled mechanic data for **every raid in the library** (Valtan through Serca) against the current Maxroll guides.
- Mechanics that exist in multiple difficulties no longer appear twice. Paired entries like "1st Heart" + "1st Heart (HM)" are now a single mechanic tagged with all the modes it appears in; per-mode differences live in the notes.
- Mechanics that share the same HP trigger no longer announce back-to-back. Pairs like Aegir G2's "1st Heart" + "Armor Break" (both at x260) are now a single combined entry so TTS announces once.
- Every mechanic in the updated raids now carries an explicit difficulty tag (Solo / Normal / Hard / Nightmare). Picking a difficulty in the editor shows exactly the mechanics that fire in that mode.
- Difficulty badges in the mech editor are cleaner — they only show on mechanics restricted to specific difficulties (HM-only, Solo-only, etc.) instead of cluttering every row.
- Tags also always render in canonical order (Solo → Normal → Hard → Nightmare).
- LIVE badge in the gate sidebar now clears as soon as the fight ends instead of lingering for ~60 seconds.
- Fixed voice announcements doubling when the Settings window's Overlay Preview tab was open during a real fight. The preview panel now stays silent during a live fight so only the overlay window announces.
- Debug strip at the bottom of the editor now logs everything the app does internally — PeerJS connection events, gate matching, fight lifecycle (start /heartbeat hide / 60s reset), difficulty changes, settings/raid sync between windows, overlay show/hide/auto-resize, Discord webhook fires, and TTS announcements. Useful when something doesn't fire as expected. Strip now holds 200 lines (was 15).
- Heads-up: existing raid imports keep their previous mechanic data unchanged. Re-import the affected raid from "Import Raids" to pick up the updated mechanics.

<!-- @release-end -->

<!-- @release v0.1.10 -->

### v0.1.10 - May 12th, 2026

#### BUG FIXES AND IMPROVEMENTS

- Shortcut defaults refreshed: Hide Overlay is now `Ctrl + ↑` (was `Ctrl + ↓`) and the Confirm Pattern hotkey now defaults to `F9`. If you had custom bindings for either, they have been reset - re-bind them under Settings → Shortcuts.
- Clipboard paste button in the bottom-bar Connect strip no longer dumps arbitrary clipboard text into the footer. If what you pasted is not an LOA Logs share URL, you'll see a short "Not a share URL" hint instead.

<!-- @release-end -->

<!-- @release v0.1.9 -->

### v0.1.9 - May 12th, 2026

#### BUG FIXES AND IMPROVEMENTS

- Overlay no longer opens oversized at startup. Idle pill stays on a single line when LOA Logs connects, instead of wrapping awkwardly until you nudge the window edge.

<!-- @release-end -->

<!-- @release v0.1.8 -->

### v0.1.8 - May 11th, 2026

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
