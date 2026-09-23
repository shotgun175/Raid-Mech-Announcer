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
