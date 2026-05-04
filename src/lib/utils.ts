export async function checkForUpdate(_isBeta = false) {
  // TODO: re-enable when updater plugin is configured (see CLAUDE.md TODO list).
  // tauri_plugin_updater is currently disabled to avoid a startup panic from an
  // unconfigured endpoint — calling it would crash the process.
  return false;
}
