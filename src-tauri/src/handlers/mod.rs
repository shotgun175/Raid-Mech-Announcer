use anyhow::Context;
use error::*;
use tauri::ipc::Invoke;
use tauri::{AppHandle, Manager, State, command, generate_handler};

use crate::constants::*;
use crate::settings::{Settings, SettingsManager};
use crate::shell::ShellManager;
use crate::ui::AppHandleExtensions;

mod error;

pub fn generate_handlers() -> Box<dyn Fn(Invoke) -> bool + Send + Sync> {
    Box::new(generate_handler![
        toggle_overlay_window,
        save_settings,
        get_settings,
        set_clickthrough,
        remove_driver,
        unload_driver,
        get_loa_meter_data_path,
        capture_append,
        capture_read_all,
        capture_clear,
        capture_path,
        crate::tts_cmd::speak_tts,
        crate::tts_cmd::stop_tts,
        crate::tts_cmd::pregenerate_tts,
        crate::tts_cmd::cancel_tts_pregen,
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
pub fn get_loa_meter_data_path() -> Option<String> {
    crate::app::loa_detect::find_loa_meter_data()
        .map(|p| p.display().to_string())
}

#[command]
pub fn capture_append(lines: String) -> Result<()> {
    crate::app::capture::append(&lines).context("appending capture")?;
    Ok(())
}

#[command]
pub fn capture_read_all() -> Result<String> {
    let content = crate::app::capture::read_all().context("reading captures")?;
    Ok(content)
}

#[command]
pub fn capture_clear() -> Result<()> {
    crate::app::capture::clear().context("clearing captures")?;
    Ok(())
}

#[command]
pub fn capture_path() -> String {
    crate::app::capture::path().display().to_string()
}
