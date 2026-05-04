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

            if window.label() == SETTINGS_WINDOW_LABEL {
                window.hide()?;
                return Ok(());
            }

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
