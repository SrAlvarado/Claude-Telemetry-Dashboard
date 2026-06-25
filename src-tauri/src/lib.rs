mod github;
mod model;
mod parser;
mod watcher;

use model::{GithubStates, Metrics, PrDetail};

/// On-demand snapshot of all telemetry metrics.
#[tauri::command]
fn get_metrics() -> Metrics {
    let project_dir = parser::resolve_project_dir();
    parser::collect(&project_dir)
}

/// The resolved project directory, shown in the UI header.
#[tauri::command]
fn get_project_dir() -> String {
    parser::resolve_project_dir().to_string_lossy().to_string()
}

/// Authoritative open/closed state for issues and PRs, pulled from GitHub.
#[tauri::command]
fn get_github_states() -> GithubStates {
    let project_dir = parser::resolve_project_dir();
    github::github_states(&project_dir)
}

/// Live detail (state, CI checks, review decision) for one pull request.
#[tauri::command]
fn get_pr_detail(number: i64) -> Option<PrDetail> {
    let project_dir = parser::resolve_project_dir();
    github::pr_detail(&project_dir, number)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_metrics,
            get_project_dir,
            get_github_states,
            get_pr_detail
        ])
        .setup(|app| {
            watcher::spawn(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
