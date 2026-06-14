use std::path::PathBuf;

use anyhow::{Context, Result};

use crate::constants::*;

#[derive(Debug, Clone)]
pub struct AppContext {
    pub version: String,
    pub current_dir: PathBuf,
    pub settings_path: PathBuf,
}

impl AppContext {
    pub fn new(version: String) -> Result<Self> {
        let app_path = std::env::current_exe()?;
        let current_dir = app_path
            .parent()
            .context("executable path has no parent directory")?
            .to_path_buf();
        let settings_path = current_dir.join(SETTINGS_PATH);

        Ok(Self {
            version,
            current_dir,
            settings_path,
        })
    }
}
