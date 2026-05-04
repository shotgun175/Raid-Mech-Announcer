# Raid Mech Announcer

## TODO — Fill in before shipping
- [ ] `src-tauri/src/main.rs` → uncomment `.plugin(tauri_plugin_updater::Builder::new().build())` (disabled to fix startup crash — requires config below first)
- [ ] `src-tauri/tauri.conf.json` → restore `plugins.updater` block when ready:
  ```json
  "plugins": {
    "updater": {
      "pubkey": "<output of: tauri signer generate>",
      "endpoints": ["<URL where latest.json is hosted>"]
    }
  }
  ```
- [ ] `src-tauri/tauri.conf.json` → set `bundle.createUpdaterArtifacts` back to `true` when updater is restored
- [ ] `latest.json` — populate with real release version, notes, installer URL, and signature after first build
- [ ] `src-tauri/src/constants.rs` → `BETA_ENDPOINT` — URL for beta update manifest (or remove beta channel feature)
- [ ] `src/lib/utils/sync.ts` → `API_URL` — URL for log upload API (or remove upload feature)
- [ ] `src/routes/(app)/Header.svelte` — uncomment and fill in your Discord invite link
- [ ] `src/routes/(app)/Header.svelte` — uncomment and fill in your donation link
- [ ] `src-tauri/Cargo.toml` → `repository` — add your GitHub repo URL once created
- [ ] `package.json` → update repo/author fields once GitHub repo is up

## Overview
Raid Mech Announcer is a Tauri v2 desktop overlay tool for Lost Ark, forked from LOA Logs. It uses a SvelteKit frontend to render a transparent always-on-top mech overlay window while a Rust backend captures live game packets via WinDivert, tracks encounter state, and persists data in a local SQLite database.

The app has two primary surfaces:
- **Raid Editor** (`/mech-editor`) — build and manage mechanic patterns per raid gate; connects to LOA Logs via PeerJS for live HP bar data
- **Settings** (`/mech-settings`) — TTS voice, Discord webhook, overlay variant, shortcuts, preview

## Stack
- **Frontend**: Svelte 5 (runes API), SvelteKit 2, TypeScript, TailwindCSS 4, ECharts, Melt UI
- **Desktop shell**: Tauri v2, Rust edition 2024 (min 1.90)
- **Backend/DB**: Rust + rusqlite (bundled SQLite), r2d2 connection pool, Tokio async
- **Node**: ≥ 24.0.0 / npm ≥ 11.0.0
- **Formatter**: Prettier (tabWidth: 2, printWidth: 120, CRLF, plugins: svelte + tailwindcss)

## Directory Layout
```
src/                        SvelteKit frontend
  app.css                   Global Tailwind styles + @keyframes (mech-pulse etc.)
  lib/
    components/             Reusable Svelte UI components (damage meter, buffs, tooltips)
    components/mech/        Mech-specific components:
      overlays/             OLCombined, OLCompact, OLHudStrip, OLCardStack, OLPill
      GateSidebar           Raid list + Import Raids trigger
      HPTimeline            HP bar visualiser for the editor
      ImportRaidsModal      Library browser — import pre-built gate templates
      MechModal             Add/edit mechanic dialog
      MechRow               Single mechanic row in the editor
      OverlayPreviewPanel   Live sim preview (embedded in Settings → Overlay Preview tab)
      PeerConnect           LOA Logs live-share connection UI (status + manual URL input)
    components/tooltips/    Tooltip overlays
    constants/              Static game data (classes, cards, encounters, esthers)
    data/
      raid-library.ts       Pre-built mechanic templates per gate; releaseOrder drives defaults
    utils/                  Pure TS utilities (dps charts, buff math, shortcuts, tts, toasts)
    api.ts                  Tauri invoke() wrappers — ALL invoke calls go here
    mech-constants.ts       SEVERITY, PHASE_COLORS, BOSS_HP_COLORS, formatTimer
    mech-peer.svelte.ts     PeerJS live-share connection state (peerState singleton)
    mech-store.svelte.ts    Raid list, gate selection, live HP state (mechStore singleton)
    mech-types.ts           Gate, Mechanic, MechSettings, BossStatusData interfaces
    stores.svelte.ts        Global app/settings state
    types.ts                All shared LOA Logs TypeScript interfaces and enums
  routes/
    (app)/                  Main windowed shell: logs list, log detail, settings, raid editor
      mech-editor/          Raid Editor page (GateSidebar + mechanic table + live HP)
      mech-settings/        Settings page (tabs: General, Announcements, Overlay,
                            Overlay Preview, Shortcuts, Discord)
    (live)/live/            Live DPS meter overlay window (transparent, always-on-top)
    (mech)/mech-overlay/    Mech announcer overlay window (transparent, always-on-top)
static/                     Favicon, class/skill/esther PNG icons (300+)
src-tauri/
  tauri.conf.json           Window definitions: main (mech overlay), logs
  capabilities/
    desktop.json            Tauri permission grants — applies to windows: ["logs", "main"]
  src/
    main.rs                 App entry point + Tauri builder
    tts_cmd.rs              speak_tts and list_tts_voices Tauri commands
    live/                   Encounter state machine (packet-driven, feature-gated)
    database/               SQLite migrations, queries, repository pattern
    handlers/               Tauri invoke handlers (thin — delegate to repository/models)
    models/                 Shared Rust data models (all serde-derived)
    settings/               Settings file manager
    ui/                     Tray icon, window events, WebView extensions
    app/loa_detect.rs       LOA Logs install detection; find_loa_meter_data() -> Option<PathBuf>
    app/log_watch.rs        Log file watcher using notify crate; FightEndEvent, parse_fight_end(),
                            start_log_watcher() — emits loa:fight-end Tauri event on fight end
  meter-data/               Bundled JSON game tables (Skill, SkillBuff, Npc, encounters, etc.)
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
- All shared types in `src/lib/types.ts` (LOA Logs types) or `src/lib/mech-types.ts` (mech-specific)
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
- `totalBars` on every imported/default gate is derived from `bossHpMap[entry.boss]` (imported from `$lib/constants/encounters`) — intentionally uses hand-curated values, NOT raw `Npc.json` `hpBarCount`, so the simulation starts near the first mechanic threshold rather than far above it
- `buildDefaultRaids()` derives the 3 newest raids automatically from `releaseOrder` — no hardcoded list
- When adding new raids to the library: assign the next `releaseOrder`, add the boss to `bossHpMap` in `encounters.ts`, no other changes needed
- Authoritative source for boss HP bar counts is `Npc.json` → `hpBarCount` in `src-tauri/meter-data/` (upstream repo: github.com/snoww/loa-logs); note it has multiple entries per boss name — cross-reference with `encounters.json` for the correct raid entry
- `BossStatusData` includes `gateId?: string | null` — resolved by the main window and sent in the event payload so the overlay window skips re-matching independently with potentially stale data
- Gate matching is sticky: `mechStore.setBossStatus()` only calls `bestGateMatch()` when `liveGateId` is null (fight start). Mid-fight boss name changes do not flip the overlay to a different raid.
- Two-tier heartbeat in `mech-store.svelte.ts`: `OVERLAY_HIDE_MS = 8_000` (hides overlay + clears HP display, keeps `liveGateId` — covers phase transitions and cutscenes); `GATE_RESET_MS = 60_000` (resets `liveGateId` — genuine encounter end). The old single 8s full-reset is gone.

### Rust
- `anyhow::Result` for fallible functions; `thiserror` for typed domain errors
- Database access only via `src/database/repository.rs` — never call rusqlite directly from handlers
- Tauri commands in `src/handlers/`; keep them thin (delegate logic to repository/models)
- All models passed across Tauri bridge must `#[derive(Serialize, Deserialize)]`
- State injected through `.manage()` in `main.rs`; handlers receive `State<T>` params
- No `.unwrap()` in handler code — propagate with `?`
- Frontend log entries emitted via `write_log` are prefixed `[frontend]` in the log output

## Common Gotchas
- **No live meter in dev builds**: `meter-core-rs` is private; dev builds patch it with `meter-core-stub`. Live packet capture is disabled.
- **Overlay windows start hidden**: `tauri.conf.json` sets `"visible": false`; the Rust backend controls show/hide. The mech overlay window label is `"main"`.
- **WinDivert**: `WinDivert.dll` / `WinDivert64.sys` must exist next to the binary at runtime. Antivirus often quarantines them — add a folder exception.
- **NordVPN conflict**: Both this app and NordVPN use WinDivert; they cannot run simultaneously.
- **`meter-data/` must be alongside the binary**: loaded at startup by `AssetPreloader`; included as a Tauri bundle resource.
- **`meter-data/` auto-detected from LOA Logs**: at startup, `main.rs` calls `loa_detect::find_loa_meter_data()` and uses `%LOCALAPPDATA%\LOA Logs\meter-data\` if present (stays current with game patches). Falls back to the bundled copy if LOA Logs is not installed. Settings → General shows a badge indicating which source is active.
- **Tauri capability changes**: any new permission requires editing `capabilities/desktop.json` and restarting `tauri:dev`. The capability applies to windows `["logs", "main"]`.
- **Raid data storage**: user raids live in WebView2 `localStorage`, not a plain JSON file. Path: `%APPDATA%\com.shotgun175.raid-mech-announcer\EBWebView\Default\Local Storage\`. Not directly editable outside the app.
- **Raid library `totalBars`**: derived from `bossHpMap` in `encounters.ts`, NOT from `Npc.json`. This is intentional — the hand-curated values place the simulation start point near the first mechanic rather than at the true game HP. Do not replace with `Npc.json` values.
- **`$derived.by()` vs `$derived(() => ...)`**: `$derived(() => fn)` stores the arrow function as a reactive value — the body is never re-evaluated. Always use `$derived.by(() => { ... })` for multi-statement derivations.
- **Shortcut registration**: shortcuts are registered on app startup (in the layout's `onMount`) and re-registered when leaving the Settings page. If a key conflicts with another app's global hotkey, registration fails silently with a `console.warn`.
- **Rust edition 2024**: requires rustc ≥ 1.90 — `rustup update stable` if build fails.
- **BETA_ENDPOINT**: if beta channel is enabled in settings but `BETA_ENDPOINT` constant is empty, the update check is skipped with a warning rather than panicking.
- **Updater plugin disabled**: `tauri_plugin_updater` is commented out in `main.rs` and `updater:default` is NOT in `capabilities/desktop.json`. Do not re-enable until BETA_ENDPOINT and signing keys are configured (see TODO above).
- **LOA Logs has no local API**: port 6040 in LOA Logs `settings.json` is a packet-capture config value, not a server port. `nineveh.exe` speaks the binary WinDivert game protocol only (ephemeral ports, not HTTP). The only real-time data path from LOA Logs into this app is the PeerJS share URL.
- **Boss names change mid-fight**: e.g. Echidna G2 cycles through "Echidna" → "Covetous Master Echidna" → other phase names within one encounter. Gate matching is sticky (first-match-wins per fight) so the overlay does not flip to a different raid on a phase transition.
- **`loa:fight-end` Tauri event**: emitted by `log_watch` whenever LOA Logs writes a fight-end line. Payload: `{ boss: string, difficulty: string, cleared: boolean }`. Only fires when LOA Logs is installed and running. `PeerConnect.svelte` listens for this event to display the last fight result.
