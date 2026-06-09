# Raid Mech Announcer

## TODO — Fill in before shipping
- [ ] `src/routes/(app)/Header.svelte` — uncomment and fill in your Discord invite link
- [ ] `src/routes/(app)/Header.svelte` — uncomment and fill in your donation link

## Releases
The Tauri updater is wired up against GitHub Releases. Public key lives in `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`; private key is at `~/.tauri/raid-mech-announcer.key` (gitignored via `.tauri/`). Endpoint: `https://github.com/shotgun175/Raid-Mech-Announcer/releases/latest/download/latest.json`.

Automated release (via `.github/workflows/release.yml`):

**Easiest path — release from the Actions UI without touching local files:**
1. Go to repo → Actions tab → "Release" workflow → "Run workflow"
2. Pick `patch` / `minor` / `major`
3. Type bullets into the "Release notes" textarea (e.g. `- Auto-updates now retry on flaky network.`)
4. Click Run
5. Workflow rebuilds the Unreleased section with your bullets, auto-bumps version in all 3 files (`package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`), stamps the heading with the new version + Eastern-time date, demotes the previous version's styled heading to plain markdown, prepends a fresh empty Unreleased block, commits to main, tags, builds, signs, and publishes the GitHub release.

**Manual path — edit changelog.md by hand instead:**
1. Edit `src/lib/data/changelog.md` — add bullets between the closing `-->` of the guidance comment and `<!-- @release-end -->` in the Unreleased block at the top. (Don't touch the heading or markers — workflow stamps them.) Commit + push to main (web UI commits work since the pre-commit hook is local-only).
2. Trigger the Release workflow as above. Leave the textarea empty — the workflow uses your hand-written bullets.

**Single source of truth for release notes:** `src/lib/data/changelog.md`. The workflow extracts the section between `<!-- @release Unreleased -->` and `<!-- @release-end -->`, strips HTML comments, then uses the remaining content for:
- the in-app Changelog page (whole file is bundled into the binary; markdown-it strips comments at render)
- the GitHub release body
- `latest.json` `notes` field (what the in-app updater modal shows users)

If both the textarea and the Unreleased section are empty, the workflow falls back to auto-generating notes from commits since the previous tag.

**Manual path — for when you want to choose an exact version string:**
1. Bump version in all 3 files, commit, push
2. Tag and push:
   ```powershell
   git tag v0.1.1
   git push origin v0.1.1
   ```
3. The release workflow's tag-push trigger picks it up — same build/sign/publish steps run.

Repo secrets required (one-time setup):
- `TAURI_SIGNING_PRIVATE_KEY` — full content of `.tauri/raid-mech-announcer.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the passphrase you set when generating the key

Set them via gh CLI:
```powershell
"C:\Program Files\GitHub CLI\gh.exe" secret set TAURI_SIGNING_PRIVATE_KEY < .tauri\raid-mech-announcer.key
"C:\Program Files\GitHub CLI\gh.exe" secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD
# (paste passphrase, press Enter, Ctrl+Z, Enter)
```

Manual fallback (if you need a release without the workflow): run `npm run tauri build` locally with `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` env vars set, then `gh release create v<version>` with the artifacts from `src-tauri/target/release/bundle/nsis/`.

## Git Workflow
- **Always create a branch before editing files.** A pre-commit hook blocks all edits, writes, and creates directly on `main` (except inside `.claude/`). Run `git checkout -b <branch-name>` before touching any source file.

## Overview
Raid Mech Announcer is a Tauri v2 desktop overlay tool for Lost Ark. It uses a SvelteKit frontend to render a transparent always-on-top mech overlay window while a Rust backend detects LOA Logs data via WinDivert and a PeerJS live-share connection.

The app has two primary surfaces:
- **Raid Editor** (`/raid-editor`) — build and manage mechanic patterns per raid gate; connects to LOA Logs via PeerJS for live HP bar data
- **Settings** (`/settings`) — TTS voice, Discord webhook, overlay variant, shortcuts, preview

## Stack
- **Frontend**: Svelte 5 (runes API), SvelteKit 2, TypeScript, TailwindCSS 4, Melt UI
- **Desktop shell**: Tauri v2, Rust edition 2024 (min 1.90)
- **Backend**: Rust + Tokio async (no database — all user data in WebView2 localStorage)
- **Node**: ≥ 24.0.0 / npm ≥ 11.0.0
- **Formatter**: Prettier (tabWidth: 2, printWidth: 120, CRLF, quoteProps: consistent, plugins: svelte + tailwindcss)

## Directory Layout
```
src/                        SvelteKit frontend
  app.css                   Global Tailwind styles + @keyframes (mech-pulse etc.)
  lib/
    components/             Reusable Svelte UI components
    components/mech/        Mech-specific components:
      overlays/             OLCombined, OLCompact, OLHudStrip, OLCardStack, OLPill,
                            OverlayControls (corner gear/minimize buttons + window outline)
      GateSidebar           Raid list + Import Raids trigger
      HPTimeline            HP bar visualiser for the editor
      ImportRaidsModal      Library browser — import pre-built gate templates
      MechModal             Add/edit mechanic dialog
      MechRow               Single mechanic row in the editor
      OverlayPreviewPanel   Live sim preview (embedded in Settings → Overlay Preview tab)
      PeerConnect           LOA Logs live-share connection status bar (footer)
    data/
      raid-library.ts       Pre-built mechanic templates per gate; releaseOrder drives defaults
    utils/                  Pure TS utilities (shortcuts, tts, toasts)
    api.ts                  Tauri invoke() wrappers — ALL invoke calls go here
    mech-constants.ts       SEVERITY, PHASE_COLORS, BOSS_HP_COLORS, formatTimer, formatGate
    mech-peer.svelte.ts     PeerJS live-share connection state (peerState singleton)
    mech-store.svelte.ts    Raid list, gate selection, live HP state (mechStore singleton)
    mech-types.ts           Gate, Mechanic, MechSettings, BossStatusData interfaces
    stores.svelte.ts        Global app/settings state
  routes/
    (app)/                  Main windowed shell: raid editor, settings, changelog
      raid-editor/          Raid Editor page (GateSidebar + mechanic table + live HP)
      settings/             Settings page (tabs: General, Overlay, Overlay Preview,
                            Announcements, Shortcuts, Discord)
      changelog/            Changelog page
    (mech)/mech-overlay/    Mech announcer overlay window (transparent, always-on-top)
static/                     Favicon
src-tauri/
  tauri.conf.json           Window definitions: settings (main app), main (mech overlay)
  capabilities/
    desktop.json            Tauri permission grants — applies to windows: ["settings", "main"]
  src/
    main.rs                 App entry point + Tauri builder
    tts_cmd.rs              speak_tts and list_tts_voices Tauri commands
    handlers/               Tauri invoke handlers (thin wrappers)
    settings/               Settings file manager
    ui/                     Tray icon, window events, WebView extensions
    app/loa_detect.rs       LOA Logs install detection; find_loa_meter_data() -> Option<PathBuf>
    app/log_watch.rs        Log file watcher; emits loa:fight-end Tauri event on fight end
  nsis/                     NSIS installer template (installer.nsi) + post-install hook (hooks.nsh)
  WinDivert.dll             WinDivert binaries — compiled into the binary via include_bytes!
  WinDivert64.sys           Required at compile time; extracted to disk on first run if missing
```

## Build / Run Commands
```bash
npm install              # install JS deps
npm run setup:python     # install edge-tts (required for Andrew/Jenny TTS voices)
npm run dev              # frontend only at http://localhost:5173 (no overlay)
npm run tauri:dev        # full desktop app with overlays (requires Rust >= 1.90)
npm run tauri:exe        # build unsigned standalone .exe → src-tauri/target/release/
npm run build            # production frontend build (static adapter)
npm run check            # svelte-kit sync + svelte-check TypeScript validation
npm run lint             # prettier --check src
npm run format           # prettier --write src

# Rust (from src-tauri/)
cargo build
cargo clippy
cargo test
```
First `tauri:dev` compile takes 5–10 minutes (longer after deleting `target/`). Subsequent runs are fast (incremental). The `src-tauri/target/` directory (~3–5 GB) is gitignored and safe to delete to reclaim disk space.

## Conventions

### TypeScript / Svelte
- All mech-specific types in `src/lib/mech-types.ts`; app/settings types in `src/lib/settings.ts`
- Svelte 5 **runes only**: `$state()`, `$derived()`, `$derived.by()`, `$effect()`, `$props()`
  - Use `$derived(expr)` for simple single-expression derivations
  - Use `$derived.by(() => { ... })` for multi-statement derivations — **never** `$derived(() => ...)`; that stores a function, not a value
  - Use `$effect()` — always clear intervals/timers at the **top** of the effect body before re-creating them
- **All `invoke()` calls go through `src/lib/api.ts`** — never call `invoke()` directly in components or utilities
- Path alias `$lib/` for everything under `src/lib/`
- camelCase for variables/functions; PascalCase for components and interfaces
- Lines ≤ 120 chars, CRLF line endings (enforced by Prettier)

### Mech Store & Raid Library
- `mechStore` (`mech-store.svelte.ts`) owns the user's raid list — persisted in `localStorage` under key `"mech-announcer-raids"` in the WebView2 profile
- `raid-library.ts` is the source of truth for pre-built templates; each `LibraryGate` has a `releaseOrder` (from the LOA Logs `encounters.json` ordering — higher = newer)
- Library currently covers all 16 raid release groups: **42 gates, 244 mechanics** — all with `notes` populated from Maxroll per-gate guides
- `LibraryMechanic` interface includes `notes?: string`; passed through to `Mechanic.notes` by both `makeMechanics()` and `stableGate()`
- `totalBars` on every imported/default gate is derived from `bossHpMap[entry.boss]` (defined at the top of `raid-library.ts`) — intentionally uses hand-curated values, NOT raw `Npc.json` `hpBars`, so the simulation starts near the first mechanic threshold rather than far above it
- `buildDefaultRaids()` derives the 3 newest raids automatically from `releaseOrder` — no hardcoded list
- When adding new raids to the library: assign the next `releaseOrder`, add the boss to `bossHpMap` at the top of `raid-library.ts`, no other changes needed
- **Mechanic naming convention**: prefer the community shorthand (what players say in party chat) over purely descriptive names. Use Maxroll cheat sheets as the reference — adopt their name only when it is clearly the established shorthand, not just because it differs from ours. TTS announces these names so recognition mid-fight matters.
- **Multi-gate number encoding**: gates like G2-1, G2-2, G2-3 are stored as integers 21, 22, 23. Always use `formatGate()` from `$lib/mech-constants` to display them — it renders as "2.1", "2.2", "2.3". Never interpolate `gate.gate` directly into UI strings.
- Authoritative source for boss HP bar counts is `Npc.json` → `hpBars` in `src-tauri/meter-data/` (upstream repo: github.com/snoww/loa-logs); use the entry with `grade: "commander"` — other entries for the same boss name have `hpBars: 1` (phase variants). Cross-reference with `encounters.json` for the correct raid entry.
- GateSidebar orders raids newest-first using `libraryByRaid[name]?.[0]?.releaseOrder` — the `Gate` objects stored in localStorage don't carry `releaseOrder`, so it's looked up from the library at render time. Custom (user-added) raids with no library entry fall to the bottom.
- `BossStatusData` includes `gateId?: string | null` — resolved by the main window and sent in the event payload so the overlay window skips re-matching independently with potentially stale data
- Encounter end is signal-driven, not timer-driven. Three signals clear `liveGateId` and broadcast `mech:encounter-end`: (a) LOA Logs writes "saving to db" → `loa:fight-end` → `endEncounter()`; (b) boss reports `isDead=true` and its name matches the active gate (`setBossStatus` clears immediately); (c) the safety-net Tier-2 timeout fires after 60s of total silence (LOA disconnected, packets lost). All three paths converge on the same teardown: clear gate, broadcast encounter-end, hide overlay if `autoShowHide` is on. Auto-hide only happens here — never mid-fight from a brief silence.
- Three-tier silence detection in `mech-store.svelte.ts` (a wipe sends no end signal — the boss stays alive and just stops sending HP, so end-of-fight is inferred from silence): `OVERLAY_HIDE_MS = 8_000` clears the HP display only (overlay stays visible showing a "phase transition…" placeholder via the preserved `gateId`); `PLACEHOLDER_HIDE_MS = 20_000` hides that placeholder (and, with `autoShowHide`, the window) by broadcasting `mech:overlay-quiet`, but keeps `gateId` + fired-mech keys so HP resuming before 60s picks up without a re-match/re-fire; `GATE_RESET_MS = 60_000` is the safety-net fallback that triggers full encounter-end teardown for the case where `isDead`/`loa:fight-end` never fire. The overlay's repeat-timer is stopped the moment HP goes silent (tier-1) so it never announces a mech during a wipe.
- The overlay's active repeating mech (the one with the live countdown + repeat TTS) is the most-recently-crossed `hp+timer` threshold — the **lowest** `hpBar` the bar has already dropped below, via `activeRepeatMech()` in `$lib/utils/mechanics.ts`. Picking the lowest (not highest) is what lets a later repeater take over from an earlier one as HP falls (Serca G1: Bomb Bingo x175 replaces Laser & Traps x270, Maiden Bingo x100 replaces it at x100). The handoff runs in the overlay's HP-watching `$effect` on every update, so it overrides even mid-cycle and regardless of the confirm hotkey (which only resyncs the active mech's countdown, never which mech is active).
- Gate matching has two re-match paths in `setBossStatus`. On the first HP event of a fight (`!liveGateId`), match by `bestGateMatch` and broadcast `mech:fight-start`. While a gate is locked in, re-match only flips the gate if the new boss name resolves to a DIFFERENT valid gate (genuine raid/gate switch via the live-data flip block); a same-gate or no-match result keeps the sticky gate so phase renames (Echidna → Covetous Master Echidna, Aegir's Heart-DPS phase, etc.) don't churn it. The flip block is mostly a safety net for cases where `isDead` never fires before the next fight begins.

### Rust
- `anyhow::Result` for fallible functions; `thiserror` for typed domain errors
- Tauri commands in `src/handlers/`; keep them thin
- All models passed across Tauri bridge must `#[derive(Serialize, Deserialize)]`
- State injected through `.manage()` in `main.rs`; handlers receive `State<T>` params
- No `.unwrap()` in handler code — propagate with `?`

## Common Gotchas
- **No live damage metering**: this app reuses LOA Logs infrastructure (packet capture via WinDivert, encounter detection) but only consumes the parts needed to drive mechanic announcements. There is no DPS-meter UI or live combat readout.
- **Overlay window (`"main"`) starts hidden**: `tauri.conf.json` sets `"visible": false`; the Rust backend controls show/hide. The settings window (`"settings"`) starts visible.
- **Settings window close button hides, not exits**: closing the settings window hides it rather than quitting the app. Restore via tray → Show Settings or the overlay's gear button.
- **WinDivert**: `WinDivert.dll` / `WinDivert64.sys` are compiled into the binary via `include_bytes!` and extracted to disk on first run. Antivirus often quarantines them — add a folder exception.
- **NordVPN conflict**: Both this app and NordVPN use WinDivert; they cannot run simultaneously.
- **`meter-data/` is required**: loaded at startup from `%LOCALAPPDATA%\LOA Logs\meter-data\` via `loa_detect::find_loa_meter_data()`. App will not start without it — this is intentional. LOA Logs must be installed.
- **Tauri capability changes**: any new permission requires editing `capabilities/desktop.json` and restarting `tauri:dev`. The capability applies to windows `["settings", "main"]`.
- **Raid data storage**: user raids live in WebView2 `localStorage`, not a plain JSON file. Path: `%APPDATA%\com.shotgun175.raid-mech-announcer\EBWebView\Default\Local Storage\`. Not directly editable outside the app.
- **Raid library `totalBars`**: derived from `bossHpMap` at the top of `raid-library.ts`, NOT from `Npc.json`. This is intentional — the hand-curated values place the simulation start point near the first mechanic rather than at the true game HP. Do not replace with `Npc.json` values.
- **`$derived.by()` vs `$derived(() => ...)`**: `$derived(() => fn)` stores the arrow function as a reactive value — the body is never re-evaluated. Always use `$derived.by(() => { ... })` for multi-statement derivations.
- **Shortcut registration**: shortcuts are registered on app startup (in the layout's `onMount`) and re-registered when leaving the Settings page. If a key conflicts with another app's global hotkey, registration fails silently with a `console.warn`.
- **Rust edition 2024**: requires rustc ≥ 1.90 — `rustup update stable` if build fails.
- **Updater plugin is enabled**: `tauri_plugin_updater` is registered in `main.rs` and wired against GitHub Releases (keys/endpoint in the Releases section above).
- **LOA Logs has no local API**: port 6040 in LOA Logs `settings.json` is a packet-capture config value, not a server port. The only real-time data path from LOA Logs into this app is the PeerJS share URL.
- **Boss names change mid-fight**: e.g. Echidna G2 cycles through multiple phase names. Gate matching is sticky (first-match-wins per fight) so the overlay does not flip to a different raid on a phase transition.
- **`loa:fight-end` Tauri event**: emitted by `log_watch` whenever LOA Logs writes a fight-end line. Payload: `{ boss: string, difficulty: string, cleared: boolean }`. Only fires when LOA Logs is installed and running.
- **Overlay auto-resize**: when a fight starts the overlay window resizes to wrap its content (top-left anchored). Resets to 360×90 when idle. This requires `core:window:allow-set-size` in capabilities.
- **`alwaysOnTop` is applied in real time**: the overlay page has a `$effect` that calls `setAlwaysOnTop()` whenever `mechStore.mechSettings.alwaysOnTop` changes — no restart needed.
- **OverlayControls**: the dashed window-bounds outline and corner buttons (gear = open Settings, dash = hide overlay) only render when `clickThrough` is `false`. They disappear completely in click-through mode.
- **PowerShell text replacement corrupts UTF-8**: Never use PowerShell `-replace` / `Get-Content | Set-Content` on source files without `-Encoding utf8`. PS 5.1 reads as Windows-1252 by default; multi-byte UTF-8 characters whose bytes collide with the target codepoint get silently destroyed (e.g. `×` U+00D7 was corrupted when replacing em dashes because its byte 0x97 = em dash in Win-1252). Always use the Edit tool for in-source text changes.
