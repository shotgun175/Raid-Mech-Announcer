use std::error::Error;

use log::*;
use tauri::{App, AppHandle, Manager};

#[cfg(not(debug_assertions))]
use crate::app;
use crate::{
    context::AppContext,
    settings::*,
    shell::ShellManager,
    ui::{AppHandleExtensions, WindowExtensions, setup_tray},
};

pub fn setup(app: &mut App) -> Result<(), Box<dyn Error>> {
    #[cfg(not(debug_assertions))]
    app::panic::add_hook_with_dialog(app.handle());

    let app_handle = app.handle();

    let context = app.state::<AppContext>();
    let shell_manager = ShellManager::new(app_handle.clone());
    let settings_manager = app.state::<SettingsManager>();

    let settings = settings_manager.read().expect("Could not read settings");

    initialize_windows_and_settings(app_handle, settings.as_ref());

    app_handle.manage(shell_manager);

    info!("starting app v{}", context.version);
    setup_tray(app_handle)?;

    // Eagerly unload the WinDivert kernel driver on startup so it does not stay
    // loaded across runs (e.g. after a crash or after the updater replaces the
    // bundled .sys binary).
    {
        let app_handle = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            let shell_manager = app_handle.state::<ShellManager>();
            shell_manager.unload_driver().await;
        });
    }

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

fn initialize_windows_and_settings(app_handle: &AppHandle, settings: Option<&Settings>) {
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
    } else {
        overlay_window.show().unwrap();
    }
}
