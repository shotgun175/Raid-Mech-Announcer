use std::collections::HashMap;
use std::path::PathBuf;

/// Returns the LOA Logs meter-data directory if the installation exists.
/// Default install: %LOCALAPPDATA%\LOA Logs\meter-data\
pub fn find_loa_meter_data() -> Option<PathBuf> {
    let base = dirs::data_local_dir()?;
    let candidate = base.join("LOA Logs").join("meter-data");
    // Probe with a file we know must exist in a valid install
    if candidate.join("encounters.json").is_file() {
        Some(candidate)
    } else {
        None
    }
}

/// LOA Logs' saved global shortcuts (action -> key) from %LOCALAPPDATA%\LOA Logs\settings.json,
/// e.g. {"hideMeter": "Ctrl+ArrowUp"}. Unbound actions (empty strings) are left out. Empty when
/// LOA Logs, the file or its "shortcuts" block is missing or unreadable; that is logged rather than
/// raised, because the Shortcuts tab only uses it to word its conflict notes.
pub fn read_loa_shortcuts() -> HashMap<String, String> {
    let Some(base) = dirs::data_local_dir() else {
        return HashMap::new();
    };
    let path = base.join("LOA Logs").join("settings.json");
    let text = match std::fs::read_to_string(&path) {
        Ok(text) => text,
        Err(e) => {
            log::debug!("LOA Logs settings not read from {}: {e}", path.display());
            return HashMap::new();
        }
    };
    let json: serde_json::Value = match serde_json::from_str(&text) {
        Ok(json) => json,
        Err(e) => {
            log::warn!(
                "LOA Logs settings at {} are not valid JSON: {e}",
                path.display()
            );
            return HashMap::new();
        }
    };
    json.get("shortcuts")
        .and_then(|s| s.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(action, key)| {
                    key.as_str()
                        .filter(|k| !k.is_empty())
                        .map(|k| (action.clone(), k.to_string()))
                })
                .collect()
        })
        .unwrap_or_default()
}
