use std::{
    error::Error,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
};

use log::*;
use tauri::{App, AppHandle, Manager};

#[cfg(not(debug_assertions))]
use crate::app;
use crate::{
    background::{BackgroundWorker, BackgroundWorkerArgs},
    constants::DEFAULT_PORT,
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

    let port = initialize_windows_and_settings(app_handle, settings.as_ref(), &shell_manager);

    app_handle.manage(shell_manager);

    info!("starting app v{}", context.version);
    setup_tray(app_handle)?;
    let update_checked: Arc<AtomicBool> = check_updates(app_handle);

    let mut background = BackgroundWorker::new(app_handle.clone());

    let args = BackgroundWorkerArgs {
        update_checked,
        port,
        settings,
        version: context.version.clone(),
    };

    background.start(args)?;
    app_handle.manage(background);

    // Keep the watcher alive for the app's lifetime. Returns None if LOA Logs isn't installed.
    let log_watcher = crate::app::log_watch::start_log_watcher(app_handle.clone());
    app_handle.manage(std::sync::Mutex::new(log_watcher));

    Ok(())
}

fn check_updates(app_handle: &AppHandle) -> Arc<AtomicBool> {
    let update_checked = Arc::new(AtomicBool::new(false));

    {
        let update_checked = update_checked.clone();
        let app_handle = app_handle.clone();

        let check_update = async move {
            let shell_manager = app_handle.state::<ShellManager>();
            shell_manager.unload_driver().await;

            // Updater plugin disabled — restore when tauri_plugin_updater is re-added to main.rs
            warn!("updater plugin disabled — skipping update check");
            update_checked.store(true, Ordering::Relaxed);
        };

        tauri::async_runtime::spawn(check_update);
    }

    update_checked
}

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
