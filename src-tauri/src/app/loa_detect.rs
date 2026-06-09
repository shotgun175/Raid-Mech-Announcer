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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_return_value_contract() {
        // Can't guarantee LOA Logs is installed in CI, but we can verify
        // the return type contract: either Some(existing_dir) or None.
        let result = find_loa_meter_data();
        if let Some(ref p) = result {
            assert!(p.exists(), "returned path must exist");
            assert!(
                p.join("encounters.json").exists(),
                "must contain encounters.json"
            );
        }
        // If None, the test passes — LOA Logs just isn't installed here.
    }
}
