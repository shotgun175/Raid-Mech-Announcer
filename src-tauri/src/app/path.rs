use std::path::PathBuf;

/// Returns the path where we store application logs
pub fn log_dir() -> PathBuf {
    let path = std::env::current_exe().unwrap().parent().map(Into::into);

    path.expect("could not get app data dir")
}
