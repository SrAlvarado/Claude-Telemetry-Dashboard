mod model;
mod parser;
mod watcher;

use model::Metrics;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_metrics, get_project_dir])
        .setup(|app| {
            watcher::spawn(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
