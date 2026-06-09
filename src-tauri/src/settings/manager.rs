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
        Ok(serde_json::from_reader(reader).ok())
    }

    pub fn save(&self, settings: &Settings) -> Result<()> {
        // Write to a temp file in the same directory, then atomically rename it
        // into place. A crash mid-write can only damage the temp file, never the
        // live settings. Same publish-via-rename pattern as the TTS clip cache in
        // tts_cmd.rs.
        let dir = self.0.parent().unwrap_or_else(|| Path::new("."));
        let tmp = dir.join(format!(".settings_{}.tmp", Uuid::new_v4()));

        let writer = File::create(&tmp)?;
        serde_json::to_writer_pretty(writer, settings)?;

        std::fs::rename(&tmp, &self.0)?;

        Ok(())
    }
}
