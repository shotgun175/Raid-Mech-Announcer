use std::error::Error;

use log::*;
use tauri::{App, AppHandle, Manager};

#[cfg(not(debug_assertions))]
use crate::app;
use crate::{
    context::AppContext,
    settings::*,
    ui::{AppHandleExtensions, setup_tray},
};

pub fn setup(app: &mut App) -> Result<(), Box<dyn Error>> {
    #[cfg(not(debug_assertions))]
    app::panic::add_hook_with_dialog(app.handle());

    let app_handle = app.handle();

    let context = app.state::<AppContext>();
    let settings_manager = app.state::<SettingsManager>();

    let settings = settings_manager.read().expect("Could not read settings");

    initialize_windows_and_settings(app_handle, settings.as_ref())?;

    info!("starting app v{}", context.version);
    setup_tray(app_handle)?;

    // Keep the watcher alive for the app's lifetime. Returns None if LOA Logs isn't installed.
    let log_watcher = crate::app::log_watch::start_log_watcher(app_handle.clone());
    app_handle.manage(std::sync::Mutex::new(log_watcher));

    // One-time LRU sweep of the TTS clip cache so it can't grow without bound. Off the main
    // thread since it touches the filesystem; the cache lives next to the exe (with settings).
    {
        let cache_dir = context.current_dir.join(crate::tts_cmd::TTS_CACHE_DIR);
        std::thread::spawn(move || crate::tts_cmd::prune_tts_cache(&cache_dir));
    }

    Ok(())
}

fn initialize_windows_and_settings(
    app_handle: &AppHandle,
    settings: Option<&Settings>,
) -> Result<(), Box<dyn Error>> {
    let overlay_window = app_handle
        .get_overlay_window()
        .ok_or_else(|| "overlay window not found".to_string())?;

    if settings.is_some() {
        info!("settings loaded");
        overlay_window.hide()?;
    } else {
        overlay_window.show()?;
    }

    Ok(())
}
