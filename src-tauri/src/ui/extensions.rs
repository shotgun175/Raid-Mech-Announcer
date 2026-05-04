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
