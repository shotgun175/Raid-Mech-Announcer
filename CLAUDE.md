# Raid Mech Announcer

## TODO — Fill in before shipping
- [ ] `src/routes/(app)/Header.svelte` — uncomment and fill in your Discord invite link
- [ ] `src/routes/(app)/Header.svelte` — uncomment and fill in your donation link

## Releases
The Tauri updater is wired up against GitHub Releases. Public key lives in `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`; private key is at `~/.tauri/raid-mech-announcer.key` (gitignored via `.tauri/`). Endpoint: `https://github.com/shotgun175/Raid-Mech-Announcer/releases/latest/download/latest.json`.

Manual release procedure (until automated via GitHub Actions):
1. Bump `version` in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`
2. Set env vars for signing:
   ```powershell
   $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content ~/.tauri/raid-mech-announcer.key -Raw
   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<your passphrase>"
   ```
3. `npm run tauri build` — produces `.msi`, `.msi.sig`, and `latest.json` in `src-tauri/target/release/bundle/msi/`
4. Create a GitHub release tagged `v<version>`, upload the `.msi`, `.msi.sig`, and `latest.json` as release assets
5. Verify: existing app on `<version-1>` should detect the update on next launch (`(app)/+layout.svelte` calls `checkForUpdate` on mount)

The `latest.json` Tauri produces during build is what users' running apps fetch — its `url` field points at the `.msi` asset URL on the same release. Don't hand-edit; always upload what the bundler emits.

## Git Workflow
- **Always create a branch before editing files.** A pre-commit hook blocks all edits, writes, and creates directly on `main` (except inside `.claude/`). Run `git checkout -b <branch-name>` before touching any source file.

## Overview
Raid Mech Announcer is a Tauri v2 desktop overlay tool for Lost Ark. It uses a SvelteKit frontend to render a transparent always-on-top mech overlay window while a Rust backend detects LOA Logs data via WinDivert and a PeerJS live-share connection.

The app has two primary surfaces:
- **Raid Editor** (`/mech-editor`) — build and manage mechanic patterns per raid gate; connects to LOA Logs via PeerJS for live HP bar data
- **Settings** (`/mech-settings`) — TTS voice, Discord webhook, overlay variant, shortcuts, preview

## Stack
- **Frontend**: Svelte 5 (runes API), SvelteKit 2, TypeScript, TailwindCSS 4, ECharts, Melt UI
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
      mech-editor/          Raid Editor page (GateSidebar + mechanic table + live HP)
      mech-settings/        Settings page (tabs: General, Overlay, Overlay Preview,
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
    live/                   Encounter state machine (packet-driven, feature-gated)
    handlers/               Tauri invoke handlers (thin wrappers)
    models/                 Shared Rust data models (all serde-derived)
    settings/               Settings file manager
    ui/                     Tray icon, window events, WebView extensions
    app/loa_detect.rs       LOA Logs install detection; find_loa_meter_data() -> Option<PathBuf>
    app/log_watch.rs        Log file watcher; emits loa:fight-end Tauri event on fight end
  WinDivert.dll             WinDivert binaries — compiled into the binary via include_bytes!
  WinDivert64.sys           Required at compile time; extracted to disk on first run if missing
  meter-core-stub/          Stub crate replacing private meter-core-rs for open builds
```

## Build / Run Commands
```bash
npm install              # install JS deps
npm run setup:python     # install edge-tts (required for Andrew/Jenny TTS voices)
npm run dev              # frontend only at http://localhost:5173 (no overlay)
npm run tauri:dev        # full desktop app with overlays (requires Rust >= 1.90)
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
- Library currently covers all 18 raid release groups: **48 gates, 220 mechanics** — all with `notes` populated from Maxroll per-gate guides
- `LibraryMechanic` interface includes `notes?: string`; passed through to `Mechanic.notes` by both `makeMechanics()` and `stableGate()`
- `totalBars` on every imported/default gate is derived from `bossHpMap[entry.boss]` (defined at the top of `raid-library.ts`) — intentionally uses hand-curated values, NOT raw `Npc.json` `hpBars`, so the simulation starts near the first mechanic threshold rather than far above it
- `buildDefaultRaids()` derives the 3 newest raids automatically from `releaseOrder` — no hardcoded list
- When adding new raids to the library: assign the next `releaseOrder`, add the boss to `bossHpMap` at the top of `raid-library.ts`, no other changes needed
- **Mechanic naming convention**: prefer the community shorthand (what players say in party chat) over purely descriptive names. Use Maxroll cheat sheets as the reference — adopt their name only when it is clearly the established shorthand, not just because it differs from ours. TTS announces these names so recognition mid-fight matters.
- **Multi-gate number encoding**: gates like G2-1, G2-2, G2-3 are stored as integers 21, 22, 23. Always use `formatGate()` from `$lib/mech-constants` to display them — it renders as "2.1", "2.2", "2.3". Never interpolate `gate.gate` directly into UI strings.
- Authoritative source for boss HP bar counts is `Npc.json` → `hpBars` in `src-tauri/meter-data/` (upstream repo: github.com/snoww/loa-logs); use the entry with `grade: "commander"` — other entries for the same boss name have `hpBars: 1` (phase variants). Cross-reference with `encounters.json` for the correct raid entry.
- GateSidebar orders raids newest-first using `libraryByRaid[name]?.[0]?.releaseOrder` — the `Gate` objects stored in localStorage don't carry `releaseOrder`, so it's looked up from the library at render time. Custom (user-added) raids with no library entry fall to the bottom.
- `BossStatusData` includes `gateId?: string | null` — resolved by the main window and sent in the event payload so the overlay window skips re-matching independently with potentially stale data
- Gate matching is sticky: `mechStore.setBossStatus()` only calls `bestGateMatch()` when `liveGateId` is null (fight start). Mid-fight boss name changes do not flip the overlay to a different raid.
- Two-tier heartbeat in `mech-store.svelte.ts`: `OVERLAY_HIDE_MS = 8_000` (hides overlay + clears HP display, keeps `liveGateId`); `GATE_RESET_MS = 60_000` (resets `liveGateId` — genuine encounter end).

### Rust
- `anyhow::Result` for fallible functions; `thiserror` for typed domain errors
- Tauri commands in `src/handlers/`; keep them thin
- All models passed across Tauri bridge must `#[derive(Serialize, Deserialize)]`
- State injected through `.manage()` in `main.rs`; handlers receive `State<T>` params
- No `.unwrap()` in handler code — propagate with `?`

## Common Gotchas
- **No live meter in dev builds**: `meter-core-rs` is private; dev builds patch it with `meter-core-stub`. Live packet capture is disabled.
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
- **Updater plugin disabled**: `tauri_plugin_updater` is commented out in `main.rs`. Do not re-enable until signing keys and endpoints are configured (see TODO above).
- **LOA Logs has no local API**: port 6040 in LOA Logs `settings.json` is a packet-capture config value, not a server port. The only real-time data path from LOA Logs into this app is the PeerJS share URL.
- **Boss names change mid-fight**: e.g. Echidna G2 cycles through multiple phase names. Gate matching is sticky (first-match-wins per fight) so the overlay does not flip to a different raid on a phase transition.
- **`loa:fight-end` Tauri event**: emitted by `log_watch` whenever LOA Logs writes a fight-end line. Payload: `{ boss: string, difficulty: string, cleared: boolean }`. Only fires when LOA Logs is installed and running.
- **Overlay auto-resize**: when a fight starts the overlay window resizes to wrap its content (top-left anchored). Resets to 360×90 when idle. This requires `core:window:allow-set-size` in capabilities.
- **`alwaysOnTop` is applied in real time**: the overlay page has a `$effect` that calls `setAlwaysOnTop()` whenever `mechStore.mechSettings.alwaysOnTop` changes — no restart needed.
- **OverlayControls**: the dashed window-bounds outline and corner buttons (gear = open Settings, dash = hide overlay) only render when `clickThrough` is `false`. They disappear completely in click-through mode.
- **PowerShell text replacement corrupts UTF-8**: Never use PowerShell `-replace` / `Get-Content | Set-Content` on source files without `-Encoding utf8`. PS 5.1 reads as Windows-1252 by default; multi-byte UTF-8 characters whose bytes collide with the target codepoint get silently destroyed (e.g. `×` U+00D7 was corrupted when replacing em dashes because its byte 0x97 = em dash in Win-1252). Always use the Edit tool for in-source text changes.
