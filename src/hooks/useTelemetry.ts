import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { EMPTY_METRICS, type Metrics } from "../types";

/**
 * Loads metrics on mount, then refreshes live via the `telemetry-updated`
 * event emitted by the Rust file watcher.
 */
export function useTelemetry() {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [projectDir, setProjectDir] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const m = await invoke<Metrics>("get_metrics");
      setMetrics(m);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("get_metrics failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    invoke<string>("get_project_dir").then(setProjectDir).catch(() => {});
    refresh();
    const unlisten = listen<Metrics>("telemetry-updated", (event) => {
      setMetrics(event.payload);
      setLastUpdate(new Date());
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refresh]);

  return { metrics, projectDir, loading, lastUpdate, refresh };
}
