# Overlay UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add window-bounds outline + corner controls to the overlay, auto-resize the overlay window to content on fight start, reorder Settings tabs, and surface the PeerConnect status as a persistent footer on all app pages.

**Architecture:** Four independent tasks executed in order: (1) rename LOA Logs internals to Raid Mech Announcer vocabulary across Rust + config, (2) frontend-only settings layout changes, (3) new `OverlayControls` Svelte component, (4) ResizeObserver-driven window auto-sizing in the overlay page.

**Tech Stack:** Rust / Tauri v2, Svelte 5 (runes), TypeScript, TailwindCSS 4, `@tauri-apps/api/webviewWindow`, `@tauri-apps/api/window`

**Spec:** `docs/superpowers/specs/2026-05-04-overlay-ux-improvements-design.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src-tauri/src/constants.rs` | Modify | Rename METER/LOGS constants |
| `src-tauri/src/ui/extensions.rs` | Modify | Rename MeterWindow → OverlayWindow, get_meter/logs_window |
| `src-tauri/src/ui/tray.rs` | Modify | Rename ShowLogs/ShowMeter/Hide enum variants |
| `src-tauri/src/ui/events.rs` | Modify | Update all renamed symbol references |
| `src-tauri/src/setup.rs` | Modify | Update references + fix `shell_manger` typo |
| `src-tauri/src/handlers/mod.rs` | Modify | Update OVERLAY_WINDOW_LABEL + get_overlay_window calls |
| `src-tauri/tauri.conf.json` | Modify | Window label `"logs"` → `"settings"` |
| `src-tauri/capabilities/desktop.json` | Modify | `"logs"` → `"settings"` in windows array |
| `src/routes/(app)/+layout.svelte` | Modify | Add PeerConnect sticky footer |
| `src/routes/(app)/Header.svelte` | Modify | Remove PeerConnect from drawer |
| `src/routes/(app)/mech-settings/+page.svelte` | Modify | Reorder tab renders |
| `src/lib/components/mech/overlays/OverlayControls.svelte` | **Create** | Dashed outline + gear/dash corner buttons |
| `src/routes/(mech)/mech-overlay/+page.svelte` | Modify | Add OverlayControls + ResizeObserver auto-size |

---

## Task 1: Rename Sweep — Rust + Config

Rename all LOA Logs vocabulary in Rust source and config files. No logic changes — pure renaming. Verify with `cargo check` at the end.

**Files:**
- Modify: `src-tauri/src/constants.rs`
- Modify: `src-tauri/src/ui/extensions.rs`
- Modify: `src-tauri/src/ui/tray.rs`
- Modify: `src-tauri/src/ui/events.rs`
- Modify: `src-tauri/src/setup.rs`
- Modify: `src-tauri/src/handlers/mod.rs`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/desktop.json`

---

- [ ] **Step 1.1 — Rename constants**

Replace the full contents of `src-tauri/src/constants.rs`:

```rust
#![allow(dead_code)]

use tauri::{LogicalPosition, LogicalSize, Position, Size};
use tauri_plugin_window_state::StateFlags;
use window_vibrancy::Color;

pub const WINDOW_MS: i64 = 5_000;
pub const WINDOW_S: i64 = 5;
pub const OVERLAY_WINDOW_LABEL: &str = "main";
pub const SETTINGS_WINDOW_LABEL: &str = "settings";
pub const SETTINGS_PATH: &str = "settings.json";
pub const LOCAL_PLAYERS_PATH: &str = "local_players.json";
pub const REGION_PATH: &str = "current_region";
pub const STEAM_GAME_URL: &str = "steam://rungameid/1599340";
pub const GAME_EXE_NAME: &str = "LOSTARK.exe";
pub const TASK_NAME: &str = "RaidMechAnnouncer_Auto_Start";
pub const DEFAULT_BLUR: Color = (10, 10, 10, 50);
pub const DEFAULT_PORT: u16 = 6040;
pub const BETA_ENDPOINT: &str = ""; // TODO: set your beta update endpoint URL
pub const WINDOW_POSITION: Position = Position::Logical(LogicalPosition { x: 100.0, y: 100.0 });
pub const DEFAULT_OVERLAY_WINDOW_SIZE: Size = Size::Logical(LogicalSize {
    width: 500.0,
    height: 350.0,
});
pub const WINDOW_STATE_FLAGS: StateFlags = StateFlags::from_bits_truncate(
    StateFlags::FULLSCREEN.bits()
        | StateFlags::MAXIMIZED.bits()
        | StateFlags::POSITION.bits()
        | StateFlags::SIZE.bits()
        | StateFlags::VISIBLE.bits(),
);
```

---

- [ ] **Step 1.2 — Rename extensions (MeterWindow → OverlayWindow)**

Replace the full contents of `src-tauri/src/ui/extensions.rs`:

```rust
use std::ops::Deref;

use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_plugin_window_state::WindowExt;

use crate::constants::{OVERLAY_WINDOW_LABEL, SETTINGS_WINDOW_LABEL, WINDOW_STATE_FLAGS};

pub trait AppHandleExtensions {
    fn get_overlay_window(&self) -> Option<OverlayWindow>;
    fn get_settings_window(&self) -> Option<WebviewWindow>;
}

pub trait WindowExtensions {
    fn restore_default_state(&self);
    fn restore_and_focus(&self);
}

impl AppHandleExtensions for &AppHandle {
    fn get_overlay_window(&self) -> Option<OverlayWindow> {
        self.get_webview_window(OVERLAY_WINDOW_LABEL)
            .map(OverlayWindow::new)
    }

    fn get_settings_window(&self) -> Option<WebviewWindow> {
        self.get_webview_window(SETTINGS_WINDOW_LABEL)
    }
}

impl AppHandleExtensions for AppHandle {
    fn get_overlay_window(&self) -> Option<OverlayWindow> {
        (&self).get_overlay_window()
    }

    fn get_settings_window(&self) -> Option<WebviewWindow> {
        (&self).get_settings_window()
    }
}

pub struct OverlayWindow(WebviewWindow);

impl WindowExtensions for OverlayWindow {
    fn restore_and_focus(&self) {
        self.0.show().unwrap();
        self.0.unminimize().unwrap();
        self.0.set_focus().unwrap();
        self.0.set_ignore_cursor_events(false).unwrap();
    }

    fn restore_default_state(&self) {
        self.0.restore_state(WINDOW_STATE_FLAGS).unwrap()
    }
}

impl OverlayWindow {
    pub fn new(window: WebviewWindow) -> Self {
        Self(window)
    }
}

impl Deref for OverlayWindow {
    type Target = WebviewWindow;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
```

---

- [ ] **Step 1.3 — Rename tray enum variants**

Replace the full contents of `src-tauri/src/ui/tray.rs`:

```rust
use strum::EnumProperty;
use strum_macros::{AsRefStr, EnumProperty, EnumString};
use tauri::{
    AppHandle, Runtime,
    menu::{Menu, MenuBuilder},
    tray::TrayIconBuilder,
};

use crate::ui::{on_menu_event, on_tray_icon_event};

#[derive(Debug, EnumString, EnumProperty, AsRefStr)]
#[strum(serialize_all = "kebab_case")]
pub enum TrayCommand {
    #[strum(props(label = "Show Settings"))]
    ShowSettings,

    #[strum(props(label = "Show Overlay"))]
    ShowOverlay,

    #[strum(props(label = "Hide Overlay"))]
    HideOverlay,

    #[strum(props(label = "Start Lost Ark"))]
    StartLoa,

    #[strum(props(label = "Reset Window"))]
    Reset,

    #[strum(props(label = "Quit"))]
    Quit,
}

pub struct LoaMenuBuilder<'a, R: Runtime>(MenuBuilder<'a, R, AppHandle<R>>);

impl<'a, R: Runtime> LoaMenuBuilder<'a, R> {
    pub fn new(app: &'a AppHandle<R>) -> Self {
        Self(MenuBuilder::new(app))
    }

    pub fn command(mut self, cmd: TrayCommand) -> Self {
        self.0 = self.0.text(cmd.as_ref(), cmd.get_str("label").unwrap());
        self
    }

    pub fn separator(mut self) -> Self {
        self.0 = self.0.separator();
        self
    }

    pub fn build(self) -> tauri::Result<Menu<R>> {
        self.0.build()
    }
}

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = LoaMenuBuilder::new(app)
        .command(TrayCommand::ShowSettings)
        .separator()
        .command(TrayCommand::ShowOverlay)
        .command(TrayCommand::HideOverlay)
        .separator()
        .command(TrayCommand::StartLoa)
        .separator()
        .command(TrayCommand::Reset)
        .separator()
        .command(TrayCommand::Quit)
        .build()?;

    let tray = TrayIconBuilder::new()
        .icon(tauri::include_image!("icons/icon.png"))
        .menu(&menu)
        .on_menu_event(on_menu_event)
        .on_tray_icon_event(on_tray_icon_event)
        .show_menu_on_left_click(false);

    tray.build(app).map(|_| ())
}
```

---

- [ ] **Step 1.4 — Update events.rs references**

Replace the full contents of `src-tauri/src/ui/events.rs`:

```rust
use std::str::FromStr;

use anyhow::Result;
use log::*;
use tauri::{
    AppHandle, Manager, Window, WindowEvent,
    menu::MenuEvent,
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconEvent},
};
use tauri_plugin_window_state::AppHandleExt;

use crate::{
    background::BackgroundWorker,
    constants::*,
    shell::ShellManager,
    ui::{AppHandleExtensions, TrayCommand, WindowExtensions},
};

pub fn block_on_local<F, T>(future: F) -> T
where
    F: Future<Output = T>,
{
    tokio::task::block_in_place(|| {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        rt.block_on(future)
    })
}

pub fn on_tray_icon_event(tray: &TrayIcon, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        let app_handle = tray.app_handle();
        if let Some(overlay) = app_handle.get_overlay_window() {
            overlay.restore_and_focus();
        }
    }
}

pub fn on_menu_event(app: &AppHandle, event: MenuEvent) {
    if let Err(err) = on_menu_event_inner(app, event) {
        error!("An error occurred whilst handling menu event {}", err);
    }
}

pub fn on_menu_event_inner(app_handle: &AppHandle, event: MenuEvent) -> Result<()> {
    let menu_item_id = event.id().0.as_str();

    match TrayCommand::from_str(menu_item_id)? {
        TrayCommand::Quit => {
            app_handle.save_window_state(WINDOW_STATE_FLAGS)?;
            teardown(app_handle);
        }
        TrayCommand::HideOverlay => {
            if let Some(overlay) = app_handle.get_overlay_window() {
                overlay.hide()?;
            }
        }
        TrayCommand::ShowOverlay => {
            if let Some(overlay) = app_handle.get_overlay_window() {
                overlay.restore_and_focus();
            }
        }
        TrayCommand::Reset => {
            if let Some(overlay) = app_handle.get_overlay_window() {
                overlay.set_size(DEFAULT_OVERLAY_WINDOW_SIZE)?;
                overlay.set_position(WINDOW_POSITION)?;
                overlay.restore_and_focus();
            }
        }
        TrayCommand::ShowSettings => {
            if let Some(settings) = app_handle.get_settings_window() {
                settings.show()?;
                settings.unminimize()?;
                settings.set_focus()?;
            }
        }
        TrayCommand::StartLoa => {
            let shell_manager = app_handle.state::<ShellManager>();
            shell_manager.start_loa_process();
        }
    }

    Ok(())
}

pub fn on_window_event(window: &Window, event: &WindowEvent) {
    on_window_event_inner(window, event)
        .expect("An error occurred whilst handling window event");
}

pub fn on_window_event_inner(window: &Window, event: &WindowEvent) -> Result<()> {
    match event {
        WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();

            let app_handle = window.app_handle();

            if let Some(overlay_window) = app_handle.get_overlay_window() {
                if overlay_window.is_minimized()? {
                    overlay_window.unminimize()?;
                }
            }

            teardown(app_handle);

            Ok(())
        }
        WindowEvent::Focused(focused) => {
            if *focused {
                return Ok(());
            }

            let app_handle = window.app_handle();
            app_handle.save_window_state(WINDOW_STATE_FLAGS)?;

            Ok(())
        }
        _ => Ok(()),
    }
}

pub fn teardown(app_handle: &AppHandle) {
    let background = app_handle.state::<BackgroundWorker>();
    let shell_manager = app_handle.state::<ShellManager>();

    block_on_local(async {
        if let Err(err) = background.stop().await {
            warn!("Could not stop background worker: {}", err);
        }

        shell_manager.unload_driver().await;
    });

    logger().flush();
    app_handle.exit(0);
}
```

---

- [ ] **Step 1.5 — Fix setup.rs typo + update references**

In `src-tauri/src/setup.rs`, apply these two edits:

**Edit A** — fix `shell_manger` typo and update function signature (lines 29–37):
```rust
    let context = app.state::<AppContext>();
    let shell_manager = ShellManager::new(app_handle.clone());
    let settings_manager = app.state::<SettingsManager>();

    let settings = settings_manager.read().expect("Could not read settings");

    let port = initialize_windows_and_settings(app_handle, settings.as_ref(), &shell_manager);

    app_handle.manage(shell_manager);
```

**Edit B** — update `initialize_windows_and_settings` (lines 89–125):
```rust
fn initialize_windows_and_settings(
    app_handle: &AppHandle,
    settings: Option<&Settings>,
    shell_manager: &ShellManager,
) -> u16 {
    let mut port = DEFAULT_PORT;
    let overlay_window = app_handle.get_overlay_window().unwrap();

    if let Some(settings) = settings {
        info!("settings loaded");
        if !settings.general.hide_meter_on_start {
            overlay_window.restore_default_state();
            overlay_window.show().unwrap();
        } else {
            overlay_window.hide().unwrap();
        }

        if settings.general.always_on_top {
            overlay_window.set_always_on_top(true).unwrap();
        } else {
            overlay_window.set_always_on_top(false).unwrap();
        }

        if settings.general.auto_iface && settings.general.port > 0 {
            port = settings.general.port;
        }

        if settings.general.start_loa_on_start {
            info!("auto launch game enabled");
            shell_manager.start_loa_process();
        }
    } else {
        overlay_window.show().unwrap();
    }

    port
}
```

---

- [ ] **Step 1.6 — Update handlers/mod.rs**

In `src-tauri/src/handlers/mod.rs`, apply these targeted edits:

**Edit A** — `toggle_meter_window` function: replace `METER_WINDOW_LABEL` with `OVERLAY_WINDOW_LABEL`:
```rust
#[command]
pub fn toggle_meter_window(app: AppHandle) -> Result<()> {
    if let Some(overlay) = app.get_webview_window(OVERLAY_WINDOW_LABEL) {
        if overlay.is_visible().unwrap() {
            if overlay.is_minimized().unwrap() {
                overlay.unminimize().unwrap();
            }
            overlay.hide().unwrap();
        } else {
            overlay.show().unwrap();
        }
    }

    Ok(())
}
```

**Edit B** — replace every `get_meter_window()` call with `get_overlay_window()` and every local variable named `meter_window` with `overlay_window`. Affected functions: `disable_blur`, `enable_blur`, `enable_aot`, `disable_aot`, `set_clickthrough`.

Example after edit (all five follow this pattern):
```rust
#[command]
pub fn disable_blur(app_handle: AppHandle) -> Result<()> {
    if let Some(overlay_window) = app_handle.get_overlay_window() {
        clear_blur(&*overlay_window)?;
    }
    Ok(())
}

#[command]
pub fn enable_blur(app_handle: AppHandle) -> Result<()> {
    if let Some(overlay_window) = app_handle.get_overlay_window() {
        apply_blur(&*overlay_window, Some(DEFAULT_BLUR))?;
    }
    Ok(())
}

#[command]
pub fn enable_aot(app_handle: AppHandle) -> Result<()> {
    if let Some(overlay_window) = app_handle.get_overlay_window() {
        overlay_window.set_always_on_top(true)?;
    }
    Ok(())
}

#[command]
pub fn disable_aot(app_handle: AppHandle) -> Result<()> {
    if let Some(overlay_window) = app_handle.get_overlay_window() {
        overlay_window.set_always_on_top(false)?;
    }
    Ok(())
}

#[command]
pub fn set_clickthrough(app_handle: AppHandle, set: bool) -> Result<()> {
    if let Some(overlay_window) = app_handle.get_overlay_window() {
        overlay_window.set_ignore_cursor_events(set)?;
    }
    Ok(())
}
```

---

- [ ] **Step 1.7 — Update tauri.conf.json window label**

In `src-tauri/tauri.conf.json`, change the `"logs"` window label to `"settings"`:

```json
{
  "label": "settings",
  "title": "Raid Mech Announcer",
  ...
}
```

---

- [ ] **Step 1.8 — Update capabilities/desktop.json**

In `src-tauri/capabilities/desktop.json`, change `"logs"` to `"settings"` in the `windows` array:

```json
"windows": [
  "settings",
  "main"
],
```

---

- [ ] **Step 1.9 — Verify with cargo check**

```bash
cd src-tauri && cargo check
```

Expected: `Finished \`dev\` profile` with zero errors. Fix any compile errors before continuing. Common issues: missed rename in a `use` statement or a `match` arm.

---

- [ ] **Step 1.10 — Commit**

```bash
git add src-tauri/src/constants.rs src-tauri/src/ui/extensions.rs src-tauri/src/ui/tray.rs src-tauri/src/ui/events.rs src-tauri/src/setup.rs src-tauri/src/handlers/mod.rs src-tauri/tauri.conf.json src-tauri/capabilities/desktop.json
git commit -m "refactor: rename meter/logs to overlay/settings throughout"
```

---

## Task 2: Frontend Settings Changes

Reorder Settings tabs and move PeerConnect to a persistent footer in the app layout. Remove it from the hamburger drawer.

**Files:**
- Modify: `src/routes/(app)/mech-settings/+page.svelte`
- Modify: `src/routes/(app)/+layout.svelte`
- Modify: `src/routes/(app)/Header.svelte`

---

- [ ] **Step 2.1 — Reorder Settings tabs**

In `src/routes/(app)/mech-settings/+page.svelte`, find the tab bar block (around line 307) and reorder the `{@render tab(...)}` calls:

```svelte
<!-- Tab bar -->
<div class="flex gap-2 overflow-x-auto px-2 max-md:max-w-[100vw]">
  {@render tab("General")}
  {@render tab("Overlay")}
  {@render tab("Overlay Preview")}
  {@render tab("Announcements")}
  {@render tab("Shortcuts")}
  {@render tab("Discord")}
</div>
```

The `{#if}` / `{:else if}` content blocks below are keyed by name string so they do **not** need reordering.

---

- [ ] **Step 2.2 — Add PeerConnect footer to app layout**

Replace the full contents of `src/routes/(app)/+layout.svelte`:

```svelte
<script lang="ts">
  import { goto } from "$app/navigation";
  import UpdateAvailable from "$lib/components/UpdateAvailable.svelte";
  import Toaster from "$lib/components/Toaster.svelte";
  import PeerConnect from "$lib/components/mech/PeerConnect.svelte";
  import { getSettings } from "$lib/api";
  import { emit } from "@tauri-apps/api/event";
  import { settings } from "$lib/stores.svelte";
  import { peerState } from "$lib/mech-peer.svelte";
  import { registerShortcuts } from "$lib/utils/shortcuts";
  import { getVersion } from "@tauri-apps/api/app";
  import { readText } from "@tauri-apps/plugin-clipboard-manager";
  import { onMount } from "svelte";

  let { children }: { children?: import("svelte").Snippet } = $props();

  const LOA_LIVE_PREFIX = "https://live.lostark.bible/";
  let lastSeenClip = "";

  onMount(() => {
    (async () => {
      const data = await getSettings();
      if (data) settings.app = data;

      const version = await getVersion();
      if (settings.version !== version) settings.version = version;

      await registerShortcuts();

      try {
        await emit("mech:overlay-preview");
      } catch {}

      goto("/mech-editor");
    })();

    const pollId = setInterval(async () => {
      if (peerState.status === "connecting" || peerState.isConnected) return;
      try {
        const text = await readText();
        if (!text || text === lastSeenClip || !text.trim().startsWith(LOA_LIVE_PREFIX)) return;
        lastSeenClip = text;
        peerState.connect(text.trim());
      } catch {}
    }, 1000);

    return () => clearInterval(pollId);
  });
</script>

<UpdateAvailable />
<Toaster />
<div class="flex flex-col h-screen bg-neutral-900 select-none">
  <div class="flex-1 overflow-auto min-h-0">
    {@render children?.()}
  </div>
  <PeerConnect />
</div>
```

---

- [ ] **Step 2.3 — Remove PeerConnect from the hamburger drawer**

In `src/routes/(app)/Header.svelte`:

**Edit A** — remove the import line:
```svelte
import PeerConnect from "$lib/components/mech/PeerConnect.svelte";
```

**Edit B** — remove the PeerConnect block and its comment from the drawer (around line 134):
```svelte
      <!-- LOA Logs connection — pinned to bottom -->
      <div class="mt-auto">
        <PeerConnect />
      </div>
```

The `mt-auto` spacer is no longer needed once PeerConnect is removed from the drawer. Verify the version row still appears at the bottom — it should naturally shift up.

---

- [ ] **Step 2.4 — Verify frontend**

```bash
npm run check
```

Expected: `svelte-check` reports 0 errors. Fix any type errors before continuing.

---

- [ ] **Step 2.5 — Commit**

```bash
git add src/routes/\(app\)/mech-settings/+page.svelte src/routes/\(app\)/+layout.svelte src/routes/\(app\)/Header.svelte
git commit -m "feat: reorder settings tabs and move PeerConnect to persistent footer"
```

---

## Task 3: OverlayControls Component

Create the `OverlayControls` component and add it to the overlay page. Shows a dashed window-bounds outline and two corner buttons (settings gear, minimize dash) whenever click-through is off.

**Files:**
- Create: `src/lib/components/mech/overlays/OverlayControls.svelte`
- Modify: `src/routes/(mech)/mech-overlay/+page.svelte`

---

- [ ] **Step 3.1 — Create OverlayControls.svelte**

Create `src/lib/components/mech/overlays/OverlayControls.svelte` with this content:

```svelte
<script lang="ts">
  import { getCurrentWebviewWindow, WebviewWindow } from "@tauri-apps/api/webviewWindow";

  let { clickThrough }: { clickThrough: boolean } = $props();

  async function openSettings() {
    const win = await WebviewWindow.getByLabel("settings");
    if (win) {
      await win.show();
      await win.setFocus();
    }
  }

  async function hideOverlay() {
    await getCurrentWebviewWindow().hide();
  }
</script>

{#if !clickThrough}
  <!-- Window bounds outline — helps user see invisible hit area while positioning -->
  <div
    style="position: fixed; inset: 0; border: 1px dashed rgba(148,163,184,0.2); border-radius: 6px; pointer-events: none;"
  ></div>

  <!-- Corner controls -->
  <div style="position: fixed; top: 8px; right: 8px; display: flex; gap: 4px; z-index: 100;">
    <!-- Settings -->
    <button
      onclick={openSettings}
      title="Open Settings"
      style="width: 22px; height: 22px; background: rgba(15,23,42,0.88); border: 1px solid rgba(100,116,139,0.35); border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>

    <!-- Minimize (hide overlay) -->
    <button
      onclick={hideOverlay}
      title="Hide Overlay"
      style="width: 22px; height: 22px; background: rgba(15,23,42,0.88); border: 1px solid rgba(100,116,139,0.35); border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  </div>
{/if}
```

---

- [ ] **Step 3.2 — Add OverlayControls to the overlay page**

In `src/routes/(mech)/mech-overlay/+page.svelte`:

**Edit A** — add the import at the top of the `<script>` block alongside the other overlay imports:
```typescript
import OverlayControls from "$lib/components/mech/overlays/OverlayControls.svelte";
```

**Edit B** — add `<OverlayControls {clickThrough} />` at the bottom of the template, after the closing `{/if}` of the main content block:
```svelte
{#if currentBar == null}
  <!-- existing preview pill -->
{:else if gate}
  <!-- existing live overlay -->
{/if}

<OverlayControls {clickThrough} />
```

---

- [ ] **Step 3.3 — Verify frontend**

```bash
npm run check
```

Expected: 0 errors. If `WebviewWindow.getByLabel` shows a type error, check that `@tauri-apps/api/webviewWindow` exports it — in Tauri v2 it is a static method on the class.

---

- [ ] **Step 3.4 — Commit**

```bash
git add src/lib/components/mech/overlays/OverlayControls.svelte src/routes/\(mech\)/mech-overlay/+page.svelte
git commit -m "feat: add overlay corner controls and window-bounds outline"
```

---

## Task 4: Auto-Resize Anchored to Top-Left

When a fight is detected (`gate` becomes non-null), resize the overlay window to tightly wrap the active variant's content. Reset to a compact waiting size when the fight ends. The window top-left corner stays fixed on Windows — `setSize()` anchors there by default.

**Files:**
- Modify: `src/routes/(mech)/mech-overlay/+page.svelte`

---

- [ ] **Step 4.1 — Add LogicalSize import and contentEl state**

In `src/routes/(mech)/mech-overlay/+page.svelte`, add to the imports at the top of the `<script>` block:

```typescript
import { LogicalSize } from "@tauri-apps/api/window";
```

Then add `contentEl` state near the other state declarations (after `let lastFiredKey`):

```typescript
let contentEl = $state<HTMLElement | null>(null);
```

---

- [ ] **Step 4.2 — Add resize effects**

Add two `$effect` blocks in `+page.svelte` after the existing effects. Place them before `onMount`:

```typescript
// Auto-resize to content when a gate loads. Fires once per gate — ResizeObserver
// disconnects after the first measurement so it doesn't fight manual resizes mid-fight.
$effect(() => {
  if (!gate || !contentEl) return;
  const el = contentEl;
  const ro = new ResizeObserver(() => {
    const { width, height } = el.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    getCurrentWebviewWindow()
      .setSize(new LogicalSize(Math.ceil(width) + 48, Math.ceil(height) + 32))
      .catch(() => {});
    ro.disconnect();
  });
  ro.observe(el);
  return () => ro.disconnect();
});

// Reset to compact waiting size when the fight ends.
$effect(() => {
  if (gate) return;
  getCurrentWebviewWindow()
    .setSize(new LogicalSize(360, 90))
    .catch(() => {});
});
```

---

- [ ] **Step 4.3 — Bind contentEl to the live overlay wrapper div**

In the template section of `+page.svelte`, find the outer `<div>` that wraps the live overlay variants (the one with `class="absolute top-4 left-1/2 -translate-x-1/2 select-none"` inside the `{:else if gate}` block) and add `bind:this={contentEl}`:

```svelte
{:else if gate}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={contentEl}
    onmousedown={startDrag}
    class="absolute top-4 left-1/2 -translate-x-1/2 select-none"
    style="z-index: 10; cursor: {clickThrough ? 'default' : 'grab'};"
  >
    {#if variant === "combined"}
      <OLCombined ... />
    {:else if variant === "compact"}
      ...
    {/if}

    {#if lastAnnounced}
      ...
    {/if}
  </div>
{/if}
```

---

- [ ] **Step 4.4 — Verify frontend**

```bash
npm run check
```

Expected: 0 errors. If `LogicalSize` is not found from `@tauri-apps/api/window`, try `@tauri-apps/api/dpi` as the import path (Tauri v2 moved size primitives there in some versions).

---

- [ ] **Step 4.5 — Commit**

```bash
git add src/routes/\(mech\)/mech-overlay/+page.svelte
git commit -m "feat: auto-resize overlay window to content on fight start"
```

---

## Verification Checklist

After all four tasks are done, run a quick smoke test in `npm run tauri:dev`:

- [ ] Tray menu shows "Show Settings", "Show Overlay", "Hide Overlay" (not "Show Logs" / "Show Meter")
- [ ] "Show Settings" opens the settings window
- [ ] Settings tabs are in order: General, Overlay, Overlay Preview, Announcements, Shortcuts, Discord
- [ ] PeerConnect status strip is visible at the bottom of both Raid Editor and Settings pages
- [ ] PeerConnect is gone from the hamburger drawer
- [ ] Overlay shows dashed border + corner buttons when click-through is OFF
- [ ] Dashed border + corner buttons disappear when click-through is ON
- [ ] Gear button on overlay opens the Settings window
- [ ] Dash button on overlay hides the overlay; tray "Show Overlay" brings it back
- [ ] Starting a raid sim (Overlay Preview) causes the overlay window to resize to the active variant's content
- [ ] Window top-left stays anchored when resizing
- [ ] Overlay returns to compact size (360×90) when fight ends
