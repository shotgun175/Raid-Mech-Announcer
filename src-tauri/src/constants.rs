use tauri::{LogicalPosition, LogicalSize, Position, Size};
use tauri_plugin_window_state::StateFlags;

pub const OVERLAY_WINDOW_LABEL: &str = "main";
pub const SETTINGS_WINDOW_LABEL: &str = "settings";
pub const SETTINGS_PATH: &str = "settings.json";
pub const LOCAL_PLAYERS_PATH: &str = "local_players.json";
pub const REGION_PATH: &str = "current_region";
pub const DEFAULT_PORT: u16 = 6040;
pub const WINDOW_POSITION: Position = Position::Logical(LogicalPosition { x: 100.0, y: 100.0 });
pub const DEFAULT_OVERLAY_WINDOW_SIZE: Size = Size::Logical(LogicalSize {
    width: 500.0,
    height: 350.0,
});
pub const WINDOW_STATE_FLAGS: StateFlags = StateFlags::from_bits_truncate(
    StateFlags::FULLSCREEN.bits()
        | StateFlags::MAXIMIZED.bits()
        | StateFlags::POSITION.bits()
        | StateFlags::SIZE.bits()
        | StateFlags::VISIBLE.bits(),
);
