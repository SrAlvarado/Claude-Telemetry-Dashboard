import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  EMPTY_GITHUB_STATES,
  EMPTY_METRICS,
  type GithubStates,
  type Metrics,
} from "../types";

/**
 * Loads metrics on mount, then refreshes live via the `telemetry-updated`
 * event emitted by the Rust file watcher. GitHub state (the authoritative
 * open/closed status) is fetched alongside but on its own cadence, since it
 * hits the network via the `gh` CLI.
 */
export function useTelemetry() {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [github, setGithub] = useState<GithubStates>(EMPTY_GITHUB_STATES);
  const [projectDir, setProjectDir] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refreshMetrics = useCallback(async () => {
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

  const refreshGithub = useCallback(async () => {
    try {
      const g = await invoke<GithubStates>("get_github_states");
      setGithub(g);
    } catch (e) {
      console.error("get_github_states failed", e);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([refreshMetrics(), refreshGithub()]);
  }, [refreshMetrics, refreshGithub]);

  useEffect(() => {
    invoke<string>("get_project_dir").then(setProjectDir).catch(() => {});
    refresh();
    // Telemetry files change often; GitHub state changes slowly — only the
    // local metrics follow the watcher, GitHub refreshes on manual ↻.
    const unlisten = listen<Metrics>("telemetry-updated", (event) => {
      setMetrics(event.payload);
      setLastUpdate(new Date());
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refresh]);

  return { metrics, github, projectDir, loading, lastUpdate, refresh };
}
