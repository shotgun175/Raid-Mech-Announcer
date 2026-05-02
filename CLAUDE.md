# Raid Mech Announcer

## TODO — Fill in before shipping
- [ ] `src-tauri/tauri.conf.json` → `plugins.updater.pubkey` — generate with `tauri signer generate`
- [ ] `src-tauri/tauri.conf.json` → `plugins.updater.endpoints` — URL where `latest.json` is hosted
- [ ] `latest.json` — populate with real release version, notes, installer URL, and signature after first build
- [ ] `src-tauri/src/constants.rs` → `BETA_ENDPOINT` — URL for beta update manifest (or remove beta channel feature)
- [ ] `src-tauri/src/api/ban_list.rs` → `API_URL` — URL for ban list JSON (or remove ban list feature)
- [ ] `src-tauri/src/background.rs` → stats API base URL (or remove stats/heartbeat feature)
- [ ] `src/lib/utils/sync.ts` → `API_URL` — URL for log upload API (or remove upload feature)
- [ ] `src/routes/(app)/Header.svelte` — uncomment and fill in your Discord invite link
- [ ] `src/routes/(app)/Header.svelte` — uncomment and fill in your donation link
- [ ] `src-tauri/Cargo.toml` → `repository` — add your GitHub repo URL once created
- [ ] `package.json` → update repo/author fields once GitHub repo is up

## Overview
Raid Mech Announcer is a Tauri v2 desktop overlay tool for Lost Ark, forked from LOA Logs. It uses a SvelteKit frontend to render transparent always-on-top overlay windows while a Rust backend captures live game packets via WinDivert, tracks encounter state, and persists data in a local SQLite database.

## Stack
- **Frontend**: Svelte 5 (runes API), SvelteKit 2, TypeScript, TailwindCSS 4, ECharts, Melt UI
- **Desktop shell**: Tauri v2, Rust edition 2024 (min 1.90)
- **Backend/DB**: Rust + rusqlite (bundled SQLite), r2d2 connection pool, Tokio async
- **Node**: ≥ 24.0.0 / npm ≥ 11.0.0
- **Formatter**: Prettier (tabWidth: 2, printWidth: 120, CRLF, plugins: svelte + tailwindcss)

## Directory Layout
```
src/                    SvelteKit frontend
  app.css               Global Tailwind styles
  lib/
    components/         Reusable Svelte UI components (damage meter, buffs, tooltips)
    components/tooltips/ Tooltip overlays
    constants/          Static game data (classes, cards, encounters, esthers)
    utils/              Pure TS utilities (dps charts, buff math, live share, toasts)
    types.ts            All shared TypeScript interfaces and enums
    api.ts              Tauri invoke() wrappers — frontend/backend bridge
    *.svelte.ts         Rune-based reactive state modules
  routes/
    (app)/              Main app shell: logs list, log detail, settings, upload
    (live)/live/        Live DPS overlay window (transparent, always-on-top)
    (mini)/mini/        Mini overlay window (compact, always-on-top)
static/                 Fonts, favicon, class/skill/esther PNG icons (300+)
src-tauri/
  tauri.conf.json       Window definitions — main (live overlay), logs, mini overlay
  capabilities/         Tauri permission grants (clipboard, shortcuts, fs, etc.)
  src/
    main.rs             App entry point + Tauri builder
    live/               Encounter state machine (packet-driven, feature-gated)
    database/           SQLite migrations, queries, repository pattern
    handlers/           Tauri invoke handlers (thin — delegate to repository/models)
    models/             Shared Rust data models (all serde-derived)
    settings/           Settings file manager
    ui/                 Tray icon, window events, WebView extensions
    api/                External REST calls (heartbeat, stats)
  meter-data/           Bundled JSON game tables (Skill, SkillBuff, Npc, encounters, etc.)
  meter-core-stub/      Stub crate replacing private meter-core-rs for open builds
```

## Build / Run Commands
```bash
npm install              # install JS deps
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
First `tauri:dev` compile takes 5–10 minutes. Subsequent runs are fast (incremental).

## Conventions

### TypeScript / Svelte
- All shared types in `src/lib/types.ts` — add new interfaces there, don't redeclare locally
- Svelte 5 **runes only**: `$state()`, `$derived()`, `$effect()`, `$props()` — no legacy `writable`/`readable` stores or `$:` reactive declarations
- Backend calls go through `src/lib/api.ts` wrappers — don't call `invoke()` directly in components
- Path alias `$lib/` for everything under `src/lib/`
- camelCase for variables/functions; PascalCase for components and interfaces
- Lines ≤ 120 chars, CRLF line endings (enforced by Prettier)

### Rust
- `anyhow::Result` for fallible functions; `thiserror` for typed domain errors
- Database access only via `src/database/repository.rs` — never call rusqlite directly from handlers
- Tauri commands in `src/handlers/`; keep them thin (delegate logic to repository/models)
- All models passed across Tauri bridge must `#[derive(Serialize, Deserialize)]`
- State injected through `.manage()` in `main.rs`; handlers receive `State<T>` params

## Common Gotchas
- **No live meter in dev builds**: `meter-core-rs` is private; dev builds patch it with `meter-core-stub`. Live packet capture is disabled — only previously saved logs are viewable.
- **Overlay windows start hidden**: `tauri.conf.json` sets `"visible": false` on all windows; the Rust backend controls show/hide based on game state.
- **WinDivert**: `WinDivert.dll` / `WinDivert64.sys` must exist next to the binary at runtime. Antivirus often quarantines them — add a folder exception.
- **NordVPN conflict**: Both this app and NordVPN use WinDivert; they cannot run simultaneously.
- **`meter-data/` must be alongside the binary**: loaded at startup by `AssetPreloader`; included as a Tauri bundle resource.
- **Tauri capability changes**: any new permission (fs, clipboard, shortcuts) requires editing `capabilities/desktop.json` and restarting `tauri:dev`.
- **tsconfig warning on `npm run dev`**: benign — `.svelte-kit/tsconfig.json` is generated by `svelte-kit sync` (run `npm run check` once to create it).
- **Rust edition 2024**: requires rustc ≥ 1.90 — `rustup update stable` if build fails.
