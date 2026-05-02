---
glob: src-tauri/**
---

# Tauri / Rust Backend Rules

## Error Handling
- Use `anyhow::Result` at app/handler boundaries
- Use `thiserror` for typed domain errors within modules
- Never `.unwrap()` in handler code — propagate with `?`

## Database
- All DB access through `src/database/repository.rs` — never call rusqlite directly from handlers
- Migrations live in `src/database/migrator.rs` — add new ones sequentially, never modify existing ones
- Use r2d2 connection pool; never hold connections across await points

## Tauri Commands
- Define commands in `src/handlers/`; register via `generate_handlers()` in `main.rs`
- Keep command bodies thin — delegate logic to repository or model methods
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

## Game Data
- Static JSON tables in `meter-data/` — loaded at startup by `AssetPreloader` in `src/data.rs`
- Do not load meter-data files on-demand; they are cached in memory after startup

## Build Notes
- `meter-core` feature enables live packet capture (requires private dep — unavailable in open builds)
- `meter-core-stub` patches the private crate for open builds — do not remove it
- WinDivert DLLs must remain in `src-tauri/` for correct bundling
