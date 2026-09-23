use anyhow::Result;
use std::{
    fs::File,
    path::{Path, PathBuf},
};
use uuid::Uuid;

use crate::settings::Settings;

pub struct SettingsManager(PathBuf);

impl SettingsManager {
    pub fn new(path: PathBuf) -> Result<Self> {
        Ok(Self(path))
    }

    pub fn read(&self) -> Result<Option<Settings>> {
        if !self.0.exists() {
            return Ok(None);
        }

        let reader = File::open(&self.0)?;
        match serde_json::from_reader(reader) {
            Ok(settings) => Ok(Some(settings)),
            Err(err) => {
                log::warn!(
                    "settings file at {} could not be parsed, starting with defaults: {err}",
                    self.0.display()
                );
                Ok(None)
            }
        }
    }

    pub fn save(&self, settings: &Settings) -> Result<()> {
        // Write to a temp file in the same directory, then atomically rename it
        // into place. A crash mid-write can only damage the temp file, never the
        // live settings. Same publish-via-rename pattern as the TTS clip cache in
        // tts_cmd.rs.
        let dir = self.0.parent().unwrap_or_else(|| Path::new("."));
        let tmp = dir.join(format!(".settings_{}.tmp", Uuid::new_v4()));

        let result = (|| -> Result<()> {
            let file = File::create(&tmp)?;
            serde_json::to_writer_pretty(&file, settings)?;
            file.sync_all()?;
            drop(file);
            std::fs::rename(&tmp, &self.0)?;
            Ok(())
        })();
        if result.is_err() {
            let _ = std::fs::remove_file(&tmp);
        }

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("settings_{tag}_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn leftover_temps(dir: &Path) -> usize {
        std::fs::read_dir(dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().starts_with(".settings_"))
            .count()
    }

    #[test]
    fn read_returns_none_for_a_corrupt_file() {
        let dir = temp_dir("corrupt");
        let path = dir.join("settings.json");
        std::fs::write(&path, "{ not json").unwrap();
        let manager = SettingsManager::new(path).unwrap();
        assert!(manager.read().unwrap().is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn save_then_read_leaves_no_temp_file() {
        let dir = temp_dir("roundtrip");
        let manager = SettingsManager::new(dir.join("settings.json")).unwrap();
        let settings = Settings::default();
        manager.save(&settings).unwrap();
        assert_eq!(manager.read().unwrap(), Some(settings));
        assert_eq!(leftover_temps(&dir), 0);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn failed_save_removes_its_temp_file() {
        let dir = temp_dir("failed");
        // A directory at the settings path makes the final rename fail.
        let path = dir.join("settings.json");
        std::fs::create_dir(&path).unwrap();
        let manager = SettingsManager::new(path).unwrap();
        assert!(manager.save(&Settings::default()).is_err());
        assert_eq!(leftover_temps(&dir), 0);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
