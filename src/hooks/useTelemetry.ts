import { useEffect, useState, useCallback, useRef } from "react";
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
 * open/closed status) is heavier (hits the network via `gh`), so it refreshes
 * on manual ↻ — and automatically when a brand-new run appears whose issue
 * GitHub doesn't know yet (otherwise its castle, filtered by "active" status,
 * would stay hidden until a manual refresh).
 */
export function useTelemetry() {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [github, setGithub] = useState<GithubStates>(EMPTY_GITHUB_STATES);
  const [projectDir, setProjectDir] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const knownIssues = useRef<Set<string>>(new Set());

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
      knownIssues.current = new Set(g.issues.map((i) => i.number));
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
    const unlisten = listen<Metrics>("telemetry-updated", (event) => {
      setMetrics(event.payload);
      setLastUpdate(new Date());
      // A new run whose issue GitHub doesn't know yet → refresh GitHub so its
      // castle (shown only when "active") appears without a manual ↻.
      const hasUnknownRun = event.payload.runs.some(
        (r) => r.issue && !knownIssues.current.has(r.issue)
      );
      if (hasUnknownRun) refreshGithub();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refresh, refreshGithub]);

  return { metrics, github, projectDir, loading, lastUpdate, refresh };
}
