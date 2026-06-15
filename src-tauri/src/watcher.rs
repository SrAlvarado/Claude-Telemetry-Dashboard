//! Watches the telemetry sources and emits `telemetry-updated` to the frontend
//! whenever a `.jsonl` file changes, so the dashboard refreshes live.

use crate::parser;
use notify_debouncer_mini::{new_debouncer, notify::RecursiveMode};
use std::path::Path;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub fn spawn(app: AppHandle) {
    std::thread::spawn(move || {
        let project_dir = parser::resolve_project_dir();
        let events_dir = project_dir.join(".claude").join("telemetry");
        let transcripts = transcript_watch_dir(&project_dir);

        let app_for_cb = app.clone();
        let mut debouncer = match new_debouncer(
            Duration::from_millis(800),
            move |res: Result<Vec<_>, _>| {
                if res.is_ok() {
                    let project_dir = parser::resolve_project_dir();
                    let metrics = parser::collect(&project_dir);
                    let _ = app_for_cb.emit("telemetry-updated", metrics);
                }
            },
        ) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("watcher init failed: {e}");
                return;
            }
        };

        if events_dir.is_dir() {
            let _ = debouncer
                .watcher()
                .watch(&events_dir, RecursiveMode::NonRecursive);
        }
        if let Some(tdir) = transcripts {
            if tdir.is_dir() {
                let _ = debouncer
                    .watcher()
                    .watch(&tdir, RecursiveMode::NonRecursive);
            }
        }

        // Keep the debouncer alive for the lifetime of the app.
        loop {
            std::thread::sleep(Duration::from_secs(3600));
        }
    });
}

fn transcript_watch_dir(project_dir: &Path) -> Option<std::path::PathBuf> {
    let home = dirs::home_dir()?;
    let encoded: String = project_dir
        .to_string_lossy()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();
    Some(
        home.join(".claude")
            .join("projects")
            .join(encoded),
    )
}
