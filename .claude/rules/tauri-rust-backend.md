---
glob: src-tauri/**
---

# Tauri / Rust Backend Rules

## Error Handling
- Use `anyhow::Result` at app/handler boundaries
- Use `thiserror` for typed domain errors within modules
- Never `.unwrap()` in handler code — propagate with `?`

## Tauri Commands
- Define commands in `src/handlers/`; register via `generate_handlers()` in `main.rs`
- Keep command bodies thin — no business logic in handlers
- All types crossing the Tauri bridge must `#[derive(Serialize, Deserialize, Clone)]`
- Shared app state passed through `.manage()` in `main.rs`; handlers receive `State<T>`

## Live Encounter Tracking
- Live tracking is feature-gated: `#[cfg(feature = "meter-core")]`
- State machines in `src/live/` are packet-driven — don't add blocking operations
- Encounter events emitted to the frontend via Tauri events (see `src/ui/events.rs`)

## Window / UI Communication
- Window management in `src/ui/`
- Tray icon logic in `src/ui/tray.rs`
- Window configs (size, transparency, alwaysOnTop) in `src-tauri/tauri.conf.json` — not in Rust code
- Window labels: `"settings"` (main app UI) and `"main"` (mech overlay)
- Settings window close → hides the window; only the overlay window close triggers app exit

## Game Data
- Static JSON tables in `meter-data/` — loaded at startup by `AssetPreloader` in `src/data.rs`
- Do not load meter-data files on-demand; they are cached in memory after startup
- `meter-data/` is NOT bundled — loaded from `%LOCALAPPDATA%\LOA Logs\meter-data\` at runtime

## WinDivert
- `WinDivert.dll` and `WinDivert64.sys` live in `src-tauri/` and are compiled into the binary via `include_bytes!` in `src/misc.rs`
- They are extracted to disk on first run if not already present next to the binary
- Do NOT add them to `bundle.resources` — they are handled entirely by `misc::load_windivert()`

## Build Notes
- `meter-core` feature enables live packet capture (requires private dep — unavailable in open builds)
- `meter-core-stub` patches the private crate for open builds — do not remove it
