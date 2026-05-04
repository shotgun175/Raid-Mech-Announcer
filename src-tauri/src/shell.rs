use log::*;
use sysinfo::{ProcessRefreshKind, RefreshKind, System};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::ShellExt;

use crate::constants::{GAME_EXE_NAME, STEAM_GAME_URL};

#[derive(Debug)]
pub struct ShellManager(AppHandle);

impl ShellManager {
    pub fn new(shell: AppHandle) -> Self {
        Self(shell)
    }

    pub fn start_loa_process(&self) {
        if self.check_loa_running() {
            return info!("lost ark already running");
        }

        info!("starting lost ark process...");

        if let Err(err) = self.0.opener().open_path(STEAM_GAME_URL, None::<String>) {
            error!("could not open lost ark: {err}");
        }
    }

    pub fn check_loa_running(&self) -> bool {
        let system = System::new_with_specifics(
            RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing().without_tasks()),
        );

        system
            .processes()
            .values()
            .any(|p| p.name().eq_ignore_ascii_case(GAME_EXE_NAME))
    }

    pub async fn remove_driver(&self) {
        #[cfg(target_os = "windows")]
        {
            use tauri_plugin_shell::ShellExt;

            let command = self.0.shell().command("sc").args(["delete", "windivert"]);

            match command.output().await {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout)
                        .lines()
                        .map(|line| line.trim())
                        .filter(|line| !line.is_empty())
                        .collect::<Vec<_>>()
                        .join(" ");

                    if output.status.success() {
                        info!("Driver removed successfully");
                    } else {
                        warn!(
                            "Failed to remove driver. Exit code {} - stdout: {}",
                            output.status.code().unwrap_or(-1),
                            stdout
                        );
                    }
                }
                Err(err) => {
                    warn!("Failed to execute remove driver command: {err}");
                }
            }
        }
    }

    pub async fn unload_driver(&self) {
        #[cfg(target_os = "windows")]
        {
            let command = self.0.shell().command("sc").args(["stop", "windivert"]);

            match command.output().await {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout)
                        .lines()
                        .map(|line| line.trim())
                        .filter(|line| !line.is_empty())
                        .collect::<Vec<_>>()
                        .join(" ");

                    if output.status.success() {
                        info!("Driver stopped successfully");
                    } else {
                        let code = output.status.code().unwrap_or(-1);
                        // ignore: 5 = access denied (no admin), 1060/1062 = not installed/already stopped
                        if matches!(code, 5 | 1060 | 1062) {
                            return;
                        }
                        warn!("Failed to stop driver. Exit code: {code} - stdout: {stdout}");
                    }
                }
                Err(err) => {
                    warn!("Failed to execute driver stop command: {err}");
                }
            }
        }
    }
}
