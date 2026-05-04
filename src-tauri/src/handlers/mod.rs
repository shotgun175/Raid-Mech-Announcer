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
        toggle_overlay_window,
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
pub fn toggle_overlay_window(app: AppHandle) -> Result<()> {
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
