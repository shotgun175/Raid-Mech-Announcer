use std::ops::Deref;

use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_plugin_window_state::WindowExt;

use crate::constants::{METER_WINDOW_LABEL, WINDOW_STATE_FLAGS};

pub trait AppHandleExtensions {
    fn get_meter_window(&self) -> Option<MeterWindow>;
}

pub trait WindowExtensions {
    fn restore_default_state(&self);
    fn restore_and_focus(&self);
}

impl AppHandleExtensions for &AppHandle {
    fn get_meter_window(&self) -> Option<MeterWindow> {
        self.get_webview_window(METER_WINDOW_LABEL)
            .map(MeterWindow::new)
    }
}

impl AppHandleExtensions for AppHandle {
    fn get_meter_window(&self) -> Option<MeterWindow> {
        (&self).get_meter_window()
    }
}

pub struct MeterWindow(WebviewWindow);

impl WindowExtensions for MeterWindow {
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

impl MeterWindow {
    pub fn new(window: WebviewWindow) -> Self {
        Self(window)
    }
}

impl Deref for MeterWindow {
    type Target = WebviewWindow;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

