#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod constants;
mod context;
mod handlers;
mod misc;
mod settings;
mod setup;
mod shell;
mod tts_cmd;
mod ui;

use crate::constants::*;
use crate::context::AppContext;
use crate::handlers::generate_handlers;
use crate::misc::load_windivert;
use crate::settings::SettingsManager;
use crate::setup::setup;
use crate::ui::on_window_event;
use anyhow::Result;
use tauri::async_runtime;
use tokio::runtime::Handle;

/// Show a blocking error dialog and exit. For failures during early startup,
/// before the Tauri app (and its panic dialog hook) exists.
fn fatal_startup_error(message: &str) -> ! {
    log::error!("{message}");
    log::logger().flush();
    rfd::MessageDialog::new()
        .set_title("Raid Mech Announcer")
        .set_description(message)
        .set_level(rfd::MessageLevel::Error)
        .show();
    std::process::exit(1);
}

#[tokio::main]
async fn main() -> Result<()> {
    let _ = app::logger::init()?;
    app::panic::set_hook_with_logger();

    let tauri_context = tauri::generate_context!();
    let package_info = tauri_context.package_info();
    // These run before Tauri (and the panic dialog hook) exist; with
    // windows_subsystem = "windows" a bare expect would exit with no UI at
    // all, so each failure shows a dialog before exiting.
    let context = match AppContext::new(package_info.version.to_string()) {
        Ok(context) => context,
        Err(err) => fatal_startup_error(&format!("Could not initialize the app context: {err}")),
    };
    let settings_manager = match SettingsManager::new(context.settings_path.clone()) {
        Ok(manager) => manager,
        Err(err) => fatal_startup_error(&format!("Could not load settings: {err}")),
    };
    if let Err(err) = load_windivert(&context.current_dir) {
        fatal_startup_error(&format!("Could not load the WinDivert dependencies: {err}"));
    }
    // LOA Logs install is required so the Settings window can surface the meter-data
    // path back to the user. The path itself is the only thing this app reads.
    if crate::app::loa_detect::find_loa_meter_data().is_none() {
        fatal_startup_error(
            "LOA Logs installation not found.\n\nRaid Mech Announcer reads LOA Logs' \
             meter-data folder, so LOA Logs must be installed first. Install it, then \
             start Raid Mech Announcer again.",
        );
    }
    let handle = Handle::current();
    async_runtime::set(handle);

    tauri::Builder::default()
        .manage(context)
        .manage(settings_manager)
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(WINDOW_STATE_FLAGS)
                .build(),
        )
        .setup(setup)
        .on_window_event(on_window_event)
        .invoke_handler(generate_handlers())
        .run(tauri_context)
        .expect("error while running application");

    Ok(())
}
