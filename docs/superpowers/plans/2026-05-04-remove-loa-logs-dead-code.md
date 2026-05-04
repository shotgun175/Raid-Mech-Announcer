# Remove LOA Logs Dead Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all inherited LOA Logs DPS meter code (encounter history, live meter, player breakdowns, encounter database) that is permanently dead in Raid Mech Announcer — the app is a pure mechanic overlay driven by PeerJS data from LOA Logs, not a DPS logger.

**Architecture:** The fork left two fully-wired-but-unused systems: a live DPS meter overlay (`(live)/live/`) with no Tauri window declared, and an encounter history UI (`(app)/logs/`) reading from a SQLite database that is never written to (packet capture is feature-gated behind the unavailable `meter-core` crate). Deletion proceeds frontend-first (routes → components → utilities → shared files), then static assets, then Rust backend. After cleanup the only active routes are `(mech)/mech-overlay/`, `(app)/mech-editor/`, `(app)/mech-settings/`, and `(app)/changelog/`.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Tauri v2, Rust (edition 2024)

**Verify commands:**
- Frontend: `npm run check` (svelte-check) from project root
- Rust: `cargo check` from `src-tauri/`

---

## File Map

### Delete entirely
| Path | Reason |
|------|--------|
| `src/routes/(live)/` | Live DPS overlay — no Tauri window, meter-core disabled |
| `src/routes/(app)/logs/` | Encounter history — database always empty |
| `src/routes/(app)/settings/` | Old LOA Logs settings page — superseded by mech-settings |
| `src/routes/(app)/upload/` | Log upload page — sync feature unused |
| `src/lib/components/ArcanistCardTable.svelte` | Logs only |
| `src/lib/components/BossBreakdown.svelte` | Logs/live only |
| `src/lib/components/BossBreakdownRow.svelte` | Logs/live only |
| `src/lib/components/BossOnlyDamage.svelte` | Logs/live only |
| `src/lib/components/BossRow.svelte` | Logs/live only |
| `src/lib/components/BossTable.svelte` | Logs/live only |
| `src/lib/components/BuffHeader.svelte` | Logs/live only |
| `src/lib/components/BuffRow.svelte` | Logs/live only |
| `src/lib/components/Buffs.svelte` | Logs/live only |
| `src/lib/components/BuffSkillBreakdown.svelte` | Logs/live only |
| `src/lib/components/BuffSkillBreakdownRow.svelte` | Logs/live only |
| `src/lib/components/DamageMeterColumns.svelte` | Logs/live only |
| `src/lib/components/DamageMeterHeader.svelte` | Logs/live only |
| `src/lib/components/DamageMeterPartySplit.svelte` | Logs/live only |
| `src/lib/components/DamageTaken.svelte` | Logs/live only |
| `src/lib/components/DamageTakenRow.svelte` | Logs/live only |
| `src/lib/components/LiveShareButton.svelte` | Logs/live only |
| `src/lib/components/PartyBuffRow.svelte` | Logs/live only |
| `src/lib/components/PlayerBreakdown.svelte` | Logs/live only |
| `src/lib/components/PlayerBreakdownColumns.svelte` | Logs/live only |
| `src/lib/components/PlayerBreakdownHeader.svelte` | Logs/live only |
| `src/lib/components/PlayerBreakdownRow.svelte` | Logs/live only |
| `src/lib/components/PlayerRow.svelte` | Logs/live only |
| `src/lib/components/ShieldHeader.svelte` | Logs/live only |
| `src/lib/components/Snippets.svelte` | Logs/live only |
| `src/lib/components/tooltips/ArkPassiveTooltip.svelte` | Logs/live only |
| `src/lib/components/tooltips/BuffDetailTooltip.svelte` | Logs/live only |
| `src/lib/components/tooltips/BuffTooltip.svelte` | Logs/live only |
| `src/lib/components/tooltips/ClassTooltip.svelte` | Logs/live only |
| `src/lib/components/tooltips/ShieldDetailTooltip.svelte` | Logs/live only |
| `src/lib/components/tooltips/SkillTooltip.svelte` | Logs/live only |
| `src/lib/buffs.svelte.ts` | Buff state for live meter only |
| `src/lib/charts.ts` | Chart config for logs only |
| `src/lib/column.ts` | Column definitions for logs only |
| `src/lib/encounter.svelte.ts` | Encounter state for live meter only |
| `src/lib/entity.svelte.ts` | Entity state for live meter only |
| `src/lib/skill.svelte.ts` | Skill state for logs only |
| `src/lib/types.ts` | All LOA Logs TS types — mech uses mech-types.ts |
| `src/lib/utils/buffs.ts` | Buff analysis for logs/live only |
| `src/lib/utils/dpsCharts.ts` | DPS chart generation for logs/live only |
| `src/lib/utils/live.svelte.ts` | PeerJS host-side for live meter only |
| `src/lib/utils/setup.ts` | Live meter initialisation only |
| `src/lib/utils/supportBuffCharts.ts` | Support buff charts for logs/live only |
| `src/lib/utils/sync.ts` | Log upload feature |
| `src/lib/constants/cards.ts` | Arcanist card data for logs only |
| `src/lib/constants/EFTable_ArkPassive.ts` | Ark Passive data for logs only |
| `src/lib/constants/esthers.ts` | Esther data — used by `getEstherFromNpcId` in utils.ts which is logs-only |
| `static/images/classes/` | Class icons for DPS meter only |
| `static/images/skills/` | Skill icons for DPS meter only |
| `static/images/icons/` | boss.png used by live meter only |
| `src-tauri/src/database/` | Entire module — encounter DB never written |

### Modify
| Path | Changes |
|------|---------|
| `src-tauri/tauri.conf.json` | Remove the `logs` window entry |
| `src/lib/api.ts` | Remove encounter/live/sync functions; keep mech/settings/TTS |
| `src/lib/stores.svelte.ts` | Remove EncounterFilter, SyncProgress, SkillCastInfo, syncSettings |
| `src/lib/utils.ts` | Remove `getSkillIcon`, `getClassIcon`, `getEstherFromNpcId`, estherMap import |
| `src-tauri/src/handlers/mod.rs` | Remove all encounter/sync/db handlers; keep mech/settings/TTS/LOA handlers |
| `src-tauri/src/main.rs` | Remove database initialization, `mod database` |

### Keep (do not touch)
- `src/routes/(app)/mech-editor/`
- `src/routes/(app)/mech-settings/`
- `src/routes/(app)/changelog/`
- `src/routes/(mech)/mech-overlay/`
- `src/routes/(app)/Header.svelte` — already clean, no logs nav
- `src/routes/(app)/+layout.svelte` — already clean
- `src/lib/components/mech/` — all mech components
- `src/lib/components/Back.svelte`, `Card.svelte`, `Markdown.svelte`, `QuickTooltip.svelte`, `Toast.svelte`, `Toaster.svelte`, `UpdateAvailable.svelte`
- `src/lib/utils/shortcuts.ts`, `toasts.ts`, `tts.ts`
- `src/lib/mech-store.svelte.ts`, `mech-peer.svelte.ts`, `mech-types.ts`, `mech-constants.ts`
- `src/lib/constants/encounters.ts` — contains `bossHpMap` used by `raid-library.ts`
- `src/lib/constants/classes.ts` — verify before keeping (may be used by mech accent colors)
- `src/lib/settings.ts` — type definitions used by settings store
- `src/lib/icons.ts` — SVG icons used globally
- `src-tauri/src/handlers/` (the mod.rs is modified, not deleted)
- `src-tauri/src/app/loa_detect.rs` — needed by main.rs for meter-data path
- `src-tauri/src/app/log_watch.rs` — emits `loa:fight-end` events used by mech

---

## Task 1: Remove the logs Tauri window

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Remove the logs window block from tauri.conf.json**

  Open `src-tauri/tauri.conf.json`. Remove the entire second window object (lines 48–61). The `app.windows` array should contain only the `main` (mech overlay) window:

  ```json
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Mech Announcer Overlay",
        "userAgent": "Raid Mech Announcer",
        "url": "mech-overlay",
        "fullscreen": false,
        "width": 500,
        "height": 350,
        "resizable": true,
        "shadow": false,
        "decorations": false,
        "transparent": true,
        "minWidth": 400,
        "minHeight": 120,
        "alwaysOnTop": true,
        "visible": false,
        "focus": false,
        "skipTaskbar": false,
        "useHttpsScheme": true
      }
    ],
    "security": {
      "csp": "default-src *; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src * ipc: http://ipc.localhost"
    }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src-tauri/tauri.conf.json
  git commit -m "chore: remove logs window from tauri config"
  ```

---

## Task 2: Delete dead route trees

**Files:**
- Delete: `src/routes/(live)/` (entire directory)
- Delete: `src/routes/(app)/logs/` (entire directory)
- Delete: `src/routes/(app)/settings/` (old LOA Logs settings, not mech-settings)
- Delete: `src/routes/(app)/upload/` (log upload page)

- [ ] **Step 1: Delete the route directories**

  Run from the project root in PowerShell:

  ```powershell
  Remove-Item -Recurse -Force "src\routes\(live)", "src\routes\(app)\logs", "src\routes\(app)\settings", "src\routes\(app)\upload"
  ```

- [ ] **Step 2: Run check — expect errors, do not fix yet**

  ```bash
  npm run check
  ```

  Expected: TypeScript errors about missing imports. Note them — following tasks clear them.

- [ ] **Step 3: Commit**

  ```bash
  git add -A
  git commit -m "chore: delete dead LOA Logs route trees"
  ```

---

## Task 3: Delete dead DPS meter components

**Files:**
- Delete: 22 components in `src/lib/components/`
- Delete: 6 tooltip components in `src/lib/components/tooltips/`

- [ ] **Step 1: Delete components**

  Run from the project root in PowerShell:

  ```powershell
  Remove-Item -Force `
    "src\lib\components\ArcanistCardTable.svelte",
    "src\lib\components\BossBreakdown.svelte",
    "src\lib\components\BossBreakdownRow.svelte",
    "src\lib\components\BossOnlyDamage.svelte",
    "src\lib\components\BossRow.svelte",
    "src\lib\components\BossTable.svelte",
    "src\lib\components\BuffHeader.svelte",
    "src\lib\components\BuffRow.svelte",
    "src\lib\components\Buffs.svelte",
    "src\lib\components\BuffSkillBreakdown.svelte",
    "src\lib\components\BuffSkillBreakdownRow.svelte",
    "src\lib\components\DamageMeterColumns.svelte",
    "src\lib\components\DamageMeterHeader.svelte",
    "src\lib\components\DamageMeterPartySplit.svelte",
    "src\lib\components\DamageTaken.svelte",
    "src\lib\components\DamageTakenRow.svelte",
    "src\lib\components\LiveShareButton.svelte",
    "src\lib\components\PartyBuffRow.svelte",
    "src\lib\components\PlayerBreakdown.svelte",
    "src\lib\components\PlayerBreakdownColumns.svelte",
    "src\lib\components\PlayerBreakdownHeader.svelte",
    "src\lib\components\PlayerBreakdownRow.svelte",
    "src\lib\components\PlayerRow.svelte",
    "src\lib\components\ShieldHeader.svelte",
    "src\lib\components\Snippets.svelte",
    "src\lib\components\tooltips\ArkPassiveTooltip.svelte",
    "src\lib\components\tooltips\BuffDetailTooltip.svelte",
    "src\lib\components\tooltips\BuffTooltip.svelte",
    "src\lib\components\tooltips\ClassTooltip.svelte",
    "src\lib\components\tooltips\ShieldDetailTooltip.svelte",
    "src\lib\components\tooltips\SkillTooltip.svelte"
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add -A
  git commit -m "chore: delete dead DPS meter and tooltip components"
  ```

---

## Task 4: Delete dead lib root files and utilities

**Files:**
- Delete: 6 lib root files
- Delete: 6 utility files
- Delete: 3 constant files

- [ ] **Step 1: Delete lib root files**

  ```powershell
  Remove-Item -Force `
    "src\lib\buffs.svelte.ts",
    "src\lib\charts.ts",
    "src\lib\column.ts",
    "src\lib\encounter.svelte.ts",
    "src\lib\entity.svelte.ts",
    "src\lib\skill.svelte.ts",
    "src\lib\types.ts"
  ```

- [ ] **Step 2: Delete dead utility files**

  ```powershell
  Remove-Item -Force `
    "src\lib\utils\buffs.ts",
    "src\lib\utils\dpsCharts.ts",
    "src\lib\utils\live.svelte.ts",
    "src\lib\utils\setup.ts",
    "src\lib\utils\supportBuffCharts.ts",
    "src\lib\utils\sync.ts"
  ```

- [ ] **Step 3: Delete dead constant files**

  ```powershell
  Remove-Item -Force `
    "src\lib\constants\cards.ts",
    "src\lib\constants\EFTable_ArkPassive.ts",
    "src\lib\constants\esthers.ts"
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "chore: delete dead LOA Logs lib files, utilities, and constants"
  ```

---

## Task 5: Prune api.ts

Remove all encounter/live/sync-related functions. Keep only what the mech overlay and settings pages need.

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Replace api.ts with the pruned version**

  Replace the entire file with:

  ```typescript
  import { getVersion } from "@tauri-apps/api/app";
  import { invoke } from "@tauri-apps/api/core";
  import { relaunch } from "@tauri-apps/plugin-process";
  import type { AppSettings } from "./settings";

  export const getAppVersion = async (): Promise<string> => `v${await getVersion()}`;

  export const openUrl = (url: string): Promise<void> => invoke("open_url", { url });

  export const checkStartOnBoot = (): Promise<boolean> => invoke("check_start_on_boot");

  export const checkLoaRunning = (): Promise<boolean> => invoke("check_loa_running");

  export const setClickthrough = (set: boolean): Promise<void> => invoke("set_clickthrough", { set });

  export const saveSettings = (settings: AppSettings): Promise<void> => invoke("save_settings", { settings });

  export const getSettings = (): Promise<AppSettings> => invoke("get_settings");

  export const setStartOnBoot = (set: boolean): Promise<void> => invoke("set_start_on_boot", { set });

  export const setAlwaysOnTop = (enabled: boolean): Promise<void> => {
    if (enabled) {
      return invoke("enable_aot");
    }

    return invoke("disable_aot");
  };

  export const writeLog = (message: string): Promise<void> => invoke("write_log", { message });

  export const checkBetaUpdate = (): Promise<{ version: string; body?: string } | null> => invoke("check_beta_update");

  export const installBetaUpdate = (): Promise<void> => invoke("install_beta_update");

  export const installStableUpdate = (): Promise<void> => invoke("install_stable_update");

  export const startLoaProcess = (): Promise<void> => invoke("start_loa_process");

  export const listTtsVoices = (): Promise<string[]> => invoke("list_tts_voices");

  export const getLOAMeterDataPath = (): Promise<string | null> => invoke("get_loa_meter_data_path");

  export const setBlur = (enabled: boolean): Promise<void> => {
    if (enabled) {
      return invoke("enable_blur");
    }

    return invoke("disable_blur");
  };

  export const relaunchApp = async () => {
    await invoke("unload_driver");
    await invoke("remove_driver");
    await relaunch();
  };

  export const toggleMechOverlay = (): Promise<void> => invoke("toggle_meter_window");
  ```

  Note: `toggleMechOverlay` replaces the old `toggleWindow(Window.Meter)` — update any callers (search for `toggleWindow` or `Window.Meter` in the codebase).

- [ ] **Step 2: Find and update callers of the old toggleWindow**

  ```bash
  grep -rn "toggleWindow\|Window\.Meter\|Window\.Logs" src/
  ```

  For each result, replace `toggleWindow(Window.Meter)` with `toggleMechOverlay()` and remove any import of `toggleWindow` or `Window`.

- [ ] **Step 3: Run check**

  ```bash
  npm run check
  ```

  Expected: errors will reduce significantly. Fix any remaining `api.ts`-related import errors by removing the broken import lines from files that used deleted functions.

- [ ] **Step 4: Commit**

  ```bash
  git add src/lib/api.ts
  git commit -m "chore: prune api.ts to mech/settings/TTS invoke wrappers only"
  ```

---

## Task 6: Prune stores.svelte.ts

Remove encounter filter, sync progress, screenshot, and focusedCast state — all logs-only.

**Files:**
- Modify: `src/lib/stores.svelte.ts`

- [ ] **Step 1: Remove the EncounterFilter class (lines 130–155)**

  Delete from `export type sortColumns` through the closing `}` of `EncounterFilter`.

- [ ] **Step 2: Remove SyncProgress class (lines 363–370)**

  Delete the `SyncProgress` class.

- [ ] **Step 3: Remove SkillCastInfo class (lines 371–374)**

  Delete the `SkillCastInfo` class.

- [ ] **Step 4: Remove syncSettings and SyncSettings type (lines 312–318)**

  Delete `export type SyncSettings`, `export const syncSettings`, and the `sync = $state(syncSettings)` line inside the `Settings` class.

- [ ] **Step 5: Remove sync-related localStorage handling from the Settings constructor**

  Inside the `Settings` constructor, delete:
  - The `updateSyncSettings` function body
  - The call `updateSyncSettings(localStorage.getItem("syncSettings"))`
  - The `$effect` block that writes `syncSettings` to localStorage
  - The `key === "syncSettings"` branch in the `storage` event listener

- [ ] **Step 6: Remove dead exports at the bottom of the file**

  Delete these four export lines:

  ```typescript
  export const encounterFilter = new EncounterFilter();
  export const syncProgress = new SyncProgress();
  export const focusedCast = new SkillCastInfo();
  export const screenshot = (() => { ... })();
  ```

- [ ] **Step 7: Run check and fix any broken imports**

  ```bash
  npm run check
  ```

  If any file imports `encounterFilter`, `syncProgress`, `focusedCast`, `screenshot`, `SyncProgress`, `EncounterFilter`, or `SkillCastInfo` — those callers were in the deleted routes; they should already be gone. Fix any remaining stragglers.

- [ ] **Step 8: Commit**

  ```bash
  git add src/lib/stores.svelte.ts
  git commit -m "chore: remove logs-only state from stores.svelte.ts"
  ```

---

## Task 7: Prune utils.ts

Remove the three functions that reference deleted static assets and the deleted esthers constant.

**Files:**
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Remove getSkillIcon (approx line 296)**

  Delete the function:

  ```typescript
  export function getSkillIcon(skillIcon: string): string {
    return "/images/skills/" + (skillIcon !== "" ? skillIcon : "unknown.png");
  }
  ```

- [ ] **Step 2: Remove getClassIcon (approx line 300)**

  Delete the function:

  ```typescript
  export function getClassIcon(classId: number | string): string {
    return "/images/classes/" + classId + ".png";
  }
  ```

- [ ] **Step 3: Remove getEstherFromNpcId and its estherMap import**

  Delete the function:

  ```typescript
  export function getEstherFromNpcId(npcId: number): string {
    for (const esther of estherMap) {
      if (esther.npcs.includes(npcId)) return esther.name;
    }
    return "Unknown";
  }
  ```

  Then find and delete the import of `estherMap` at the top of the file (it imported from `$lib/constants/esthers` which was deleted in Task 4).

- [ ] **Step 4: Run check**

  ```bash
  npm run check
  ```

  Expected: clean or near-clean. Fix any remaining errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/utils.ts
  git commit -m "chore: remove getSkillIcon, getClassIcon, getEstherFromNpcId from utils.ts"
  ```

---

## Task 8: Delete static image assets

**Files:**
- Delete: `static/images/classes/`
- Delete: `static/images/skills/`
- Delete: `static/images/icons/`

- [ ] **Step 1: Verify nothing in mech code references /images/**

  ```bash
  grep -rn "/images/" src/routes/\(mech\)/ src/lib/components/mech/ src/routes/\(app\)/mech-editor/ src/routes/\(app\)/mech-settings/
  ```

  Expected: no output. If any result appears, do not delete and investigate.

- [ ] **Step 2: Delete the image directories**

  ```powershell
  Remove-Item -Recurse -Force "static\images\classes", "static\images\skills", "static\images\icons"
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add -A
  git commit -m "chore: delete DPS meter static image assets (35 MB)"
  ```

---

## Task 9: Prune Rust handlers

Remove all encounter/database/sync/live Tauri command handlers. Keep settings, TTS, LOA detection, and window management.

**Files:**
- Modify: `src-tauri/src/handlers/mod.rs`

- [ ] **Step 1: Replace handlers/mod.rs with the pruned version**

  ```rust
  use anyhow::Context;
  use error::*;
  use log::*;
  use tauri::ipc::Invoke;
  use tauri::{AppHandle, Manager, State, command, generate_handler};
  use window_vibrancy::{apply_blur, clear_blur};

  use crate::app::autostart::{AutoLaunch, AutoLaunchManager};
  use crate::constants::*;
  use crate::settings::{Settings, SettingsManager};
  use crate::shell::ShellManager;
  use crate::ui::AppHandleExtensions;

  mod error;
  mod models;

  pub fn generate_handlers() -> Box<dyn Fn(Invoke) -> bool + Send + Sync> {
      Box::new(generate_handler![
          toggle_meter_window,
          open_url,
          save_settings,
          get_settings,
          disable_blur,
          enable_blur,
          write_log,
          enable_aot,
          disable_aot,
          set_clickthrough,
          check_start_on_boot,
          set_start_on_boot,
          check_loa_running,
          start_loa_process,
          remove_driver,
          unload_driver,
          get_loa_meter_data_path,
          crate::tts_cmd::speak_tts,
          crate::tts_cmd::list_tts_voices,
      ])
  }

  #[command]
  pub fn toggle_meter_window(app: AppHandle) -> Result<()> {
      if let Some(meter) = app.get_webview_window(METER_WINDOW_LABEL) {
          if meter.is_visible().unwrap() {
              if meter.is_minimized().unwrap() {
                  meter.unminimize().unwrap();
              }
              meter.hide().unwrap();
          } else {
              meter.show().unwrap();
          }
      }

      Ok(())
  }

  #[command]
  pub fn open_url(app_handle: AppHandle, url: String) {
      info!("open_url called: {}", url);
  }

  #[command]
  pub fn save_settings(settings_manager: State<SettingsManager>, settings: Settings) -> Result<()> {
      settings_manager
          .save(&settings)
          .context("could not write to settings file")?;

      Ok(())
  }

  #[command]
  pub fn get_settings(settings_manager: State<SettingsManager>) -> Result<Option<Settings>> {
      let settings = settings_manager.read().ok().flatten();

      Ok(settings)
  }

  #[command]
  pub fn disable_blur(app_handle: AppHandle) -> Result<()> {
      if let Some(meter_window) = app_handle.get_meter_window() {
          clear_blur(&*meter_window)?;
      }

      Ok(())
  }

  #[command]
  pub fn enable_blur(app_handle: AppHandle) -> Result<()> {
      if let Some(meter_window) = app_handle.get_meter_window() {
          apply_blur(&*meter_window, Some(DEFAULT_BLUR))?;
      }

      Ok(())
  }

  #[command]
  pub fn enable_aot(app_handle: AppHandle) -> Result<()> {
      if let Some(meter_window) = app_handle.get_meter_window() {
          meter_window.set_always_on_top(true)?;
      }

      Ok(())
  }

  #[command]
  pub fn disable_aot(app_handle: AppHandle) -> Result<()> {
      if let Some(meter_window) = app_handle.get_meter_window() {
          meter_window.set_always_on_top(false)?;
      }

      Ok(())
  }

  #[command]
  pub fn set_clickthrough(app_handle: AppHandle, set: bool) -> Result<()> {
      if let Some(meter_window) = app_handle.get_meter_window() {
          meter_window.set_ignore_cursor_events(set)?;
      }

      Ok(())
  }

  #[command]
  pub async fn remove_driver(shell_manager: State<'_, ShellManager>) -> Result<()> {
      shell_manager.remove_driver().await;
      Ok(())
  }

  #[command]
  pub async fn unload_driver(shell_manager: State<'_, ShellManager>) -> Result<()> {
      shell_manager.unload_driver().await;
      Ok(())
  }

  #[command]
  pub fn check_start_on_boot(auto: State<AutoLaunchManager>) -> bool {
      auto.is_enabled().unwrap_or(false)
  }

  #[command]
  pub fn set_start_on_boot(auto: State<AutoLaunchManager>, set: bool) {
      let _ = match set {
          true => auto.enable(),
          false => auto.disable(),
      };
  }

  #[command]
  pub fn check_loa_running(shell_manager: State<ShellManager>) -> bool {
      shell_manager.check_loa_running()
  }

  #[command]
  pub fn start_loa_process(shell_manager: State<ShellManager>) {
      shell_manager.start_loa_process();
  }

  #[command]
  pub fn write_log(message: String) {
      info!("[frontend] {}", message);
  }

  #[command]
  pub fn get_loa_meter_data_path() -> Option<String> {
      crate::app::loa_detect::find_loa_meter_data()
          .map(|p| p.display().to_string())
  }
  ```

- [ ] **Step 2: Run cargo check**

  ```bash
  cd src-tauri && cargo check
  ```

  If there are import errors from unused `use crate::database::...` lines, remove them.

- [ ] **Step 3: Commit**

  ```bash
  git add src-tauri/src/handlers/mod.rs
  git commit -m "chore: remove encounter/sync/database Rust handlers"
  ```

---

## Task 10: Remove Rust database module from main.rs

The encounter database (SQLite) is never written to — `meter-core` is disabled. Remove its initialization.

**Files:**
- Modify: `src-tauri/src/main.rs`
- Delete: `src-tauri/src/database/` (entire module)

- [ ] **Step 1: Remove database from main.rs**

  In `src-tauri/src/main.rs`, make these changes:

  Remove the `mod database;` line.

  Remove these imports:
  ```rust
  use crate::database::Database;
  ```

  Remove the database initialization lines:
  ```rust
  let database = Database::new(context.database_path.clone(), &context.version)
      .expect("error setting up database: {}");
  let repository = database.create_repository();
  ```

  Remove the `.manage()` calls:
  ```rust
  .manage(database)
  .manage(repository)
  ```

- [ ] **Step 2: Delete the database module**

  ```powershell
  Remove-Item -Recurse -Force "src-tauri\src\database"
  ```

- [ ] **Step 3: Run cargo check**

  ```bash
  cd src-tauri && cargo check
  ```

  Fix any remaining errors — likely unused import warnings or references to `Repository` / `Database` types in other files. Search for them:

  ```bash
  grep -rn "Repository\|Database\|database\|repository" src-tauri/src/ --include="*.rs" | grep -v "^src-tauri/src/handlers"
  ```

  Remove any dead references found.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "chore: remove Rust encounter database module — never written to in this build"
  ```

---

## Task 11: Final verification

- [ ] **Step 1: Full TypeScript check**

  ```bash
  npm run check
  ```

  Expected: 0 errors.

- [ ] **Step 2: Full Rust check with clippy**

  ```bash
  cd src-tauri && cargo clippy
  ```

  Expected: 0 errors, warnings only for unused constants (acceptable).

- [ ] **Step 3: Lint**

  ```bash
  npm run lint
  ```

  Fix any formatting issues:

  ```bash
  npm run format
  git add src/
  git commit -m "style: prettier format after dead code removal"
  ```

- [ ] **Step 4: Verify mech overlay still builds**

  ```bash
  npm run tauri:dev
  ```

  Open the app:
  - Raid Editor loads correctly
  - Mech Settings loads correctly
  - PeerConnect panel appears in sidebar
  - No console errors about missing modules

- [ ] **Step 5: Final commit**

  ```bash
  git add -A
  git commit -m "chore: complete removal of inherited LOA Logs DPS meter dead code"
  ```
