//! Watches the telemetry sources and emits `telemetry-updated` to the frontend
//! whenever a `.jsonl` file changes, so the dashboard refreshes live.

use crate::parser;
use notify_debouncer_mini::{new_debouncer, notify::RecursiveMode};
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

// El watcher se dispara en cada escritura del transcript (muy frecuente con una
// sesión activa). 800ms re-parseaba el historial casi en bucle y trababa la UI;
// 1500ms reduce los re-parseos sin que el dashboard se sienta retrasado.
const DEBOUNCE_MS: u64 = 1500;

/// Firma estable de unas métricas, ignorando `generatedAt` (que cambia en cada
/// `collect()` aunque el contenido sea idéntico). Sirve para no re-emitir —y por
/// tanto no re-renderizar el frontend— cuando el fichero cambió pero los datos no.
fn signature(metrics: &crate::model::Metrics) -> Option<String> {
    let mut value = serde_json::to_value(metrics).ok()?;
    if let Some(obj) = value.as_object_mut() {
        obj.remove("generatedAt");
    }
    serde_json::to_string(&value).ok()
}

pub fn spawn(app: AppHandle) {
    std::thread::spawn(move || {
        let project_dir = parser::resolve_project_dir();
        let events_dir = project_dir.join(".claude").join("telemetry");
        let transcripts = transcript_watch_dir(&project_dir);

        let app_for_cb = app.clone();
        let last_signature: Mutex<Option<String>> = Mutex::new(None);
        let mut debouncer = match new_debouncer(
            Duration::from_millis(DEBOUNCE_MS),
            move |res: Result<Vec<_>, _>| {
                if res.is_ok() {
                    let project_dir = parser::resolve_project_dir();
                    let metrics = parser::collect(&project_dir);
                    // Dedup: si las métricas son idénticas a la última emisión,
                    // no emitimos (evita un re-render del árbol completo en balde).
                    let sig = signature(&metrics);
                    let mut last = last_signature.lock().unwrap();
                    if sig.is_some() && *last == sig {
                        return;
                    }
                    *last = sig;
                    drop(last);
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
