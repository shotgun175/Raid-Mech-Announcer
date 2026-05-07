#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod tts_cmd;
mod constants;
mod context;
mod data;
mod handlers;
mod misc;
mod models;
mod settings;
mod setup;
mod shell;
mod ui;

use crate::constants::*;
use crate::context::AppContext;
use crate::data::AssetPreloader;
use crate::handlers::generate_handlers;
use crate::misc::load_windivert;
use crate::settings::SettingsManager;
use crate::setup::setup;
use crate::ui::on_window_event;
use anyhow::Result;
use tauri::async_runtime;
use tokio::runtime::Handle;

#[tokio::main]
async fn main() -> Result<()> {
    let _ = app::logger::init()?;
    app::panic::set_hook_with_logger();

    let tauri_context = tauri::generate_context!();
    let package_info = tauri_context.package_info();
    let context =
        AppContext::new(package_info.version.to_string()).expect("could not create context");
    let settings_manager =
        SettingsManager::new(context.settings_path.clone()).expect("could not create settings");
    load_windivert(&context.current_dir).expect("could not load windivert dependencies");
    // Load game data from LOA Logs installation — required, app cannot run without it.
    let meter_data_dir = crate::app::loa_detect::find_loa_meter_data()
        .expect("LOA Logs installation not found — install LOA Logs before running Raid Mech Announcer");
    log::info!("meter-data source: {}", meter_data_dir.display());
    AssetPreloader::new(&meter_data_dir).expect("could not load meter-data from LOA Logs");
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
        // TODO: restore when updater endpoints are configured
        // .plugin(tauri_plugin_updater::Builder::new().build())
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
