# LOA Logs Integration Implementation Plan

> **STATUS: COMPLETE** — All viable phases shipped. Phase 2 (port 6040) confirmed dead end after live investigation.

**Goal:** Leverage the local LOA Logs installation to keep game data current automatically, discover a zero-config live-data path via port 6040, and add fight-state detection via log file watching.

**Architecture:** Three independent phases — each is shippable on its own and does not block the others. Phase 1 swaps the meter-data source at startup (pure Rust, no UI risk). Phase 2 probed LOA Logs' local port 6040 — confirmed no local API exists. Phase 3 tails `loa_logs_rCURRENT.log` with the `notify` crate to surface fight-end signals as Tauri events.

**Tech Stack:** Rust (Tauri v2, `notify` crate for file watching, `dirs` crate already present, `reqwest` already present), SvelteKit 2 / Svelte 5 runes, TypeScript

---

## Phase 1 — Meter-data from LOA Logs install ✅ SHIPPED

At startup, `loa_detect::find_loa_meter_data()` checks `%LOCALAPPDATA%\LOA Logs\meter-data\` and returns the path if LOA Logs is installed. `main.rs` uses this as the `AssetPreloader` source, falling back to bundled copy if absent. Settings → General tab shows which source is active.

**Commits:** `fb8e359`, `a1710a1`, `4c1075f`, `2681530`

**Files changed:**
- Created: `src-tauri/src/app/loa_detect.rs`
- Modified: `src-tauri/src/app/mod.rs`, `src-tauri/src/main.rs`, `src-tauri/src/handlers/mod.rs`, `src/lib/api.ts`, `src/routes/(app)/mech-settings/+page.svelte`

---

## Phase 2 — Port 6040 Discovery ❌ DEAD END

**Investigation result (2026-05-03, live game session):**

Port 6040 in LOA Logs `settings.json` is a **packet capture config value** — it never listens as an HTTP or WebSocket server.

LOA Logs network architecture:
```
LOSTARK.exe → WinDivert (intercepts packets) → nineveh.exe (port 6971 IPC) → LOA Logs.exe
```

When the game is running, `nineveh.exe` opens ephemeral ports (e.g. 59749, 59762, 59781) bound to `0.0.0.0` — these are WinDivert raw packet capture channels speaking the binary Lost Ark game protocol. They accept TCP connections but do not speak HTTP.

**Conclusion:** No local API exists in LOA Logs. PeerJS share URL remains the only real-time live HP data path.

The `probe_loa_port` command and `probeLOAPort` TS wrapper were added then removed (dead code cleanup commit).

---

## Phase 3 — Log File Watching ✅ SHIPPED

`log_watch::start_log_watcher()` tails `%LOCALAPPDATA%\LOA Logs\loa_logs_rCURRENT.log` using the `notify` crate. Parses lines matching:
```
[TIMESTAMP] INFO [app::live::encounter_state] saving to db - cleared: [BOOL], difficulty: [DIFF] BOSS
```
Emits `loa:fight-end` Tauri event with `{ boss, difficulty, cleared }`. Watcher is started in `setup.rs` and kept alive via `app_handle.manage()`. `PeerConnect.svelte` displays the last fight result.

**Commits:** `41ff3eb`, `f8a2a49`, `41b18fe`, `5ef2c67`

**Files changed:**
- Created: `src-tauri/src/app/log_watch.rs`
- Modified: `src-tauri/Cargo.toml`, `src-tauri/src/app/mod.rs`, `src-tauri/src/setup.rs`, `src/lib/components/mech/PeerConnect.svelte`

---

## Also shipped this session (not in original plan)

### Boss overlay matching fixes

**Problem:** Echidna G2 cycles through multiple boss names mid-fight ("Echidna" → "Covetous Master Echidna" → other phases). The score-based `bestGateMatch` was re-running on every boss-status event, and "Covetous Master Echidna" scored higher against the Armoche gate than against the plain "Echidna" gate.

**Fixes:**
1. `BossStatusData` gains `gateId?: string | null` — main window resolves the match once and sends it in the event payload. Overlay uses it directly instead of re-matching.
2. **Sticky gate matching** — `setBossStatus` only calls `bestGateMatch` when `liveGateId` is null (fight start). Mid-fight name changes are ignored.
3. **Two-tier heartbeat** — 8s silence hides the overlay but keeps `liveGateId` alive (phase transitions); 60s silence resets `liveGateId` (genuine encounter end).
4. **Editor no longer auto-selects gate** — `selectedGateId` (editor highlight) is decoupled from `liveGateId` (overlay gate).

**Commits:** in earlier session work, before the LOA integration plan.
