import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  EMPTY_GITHUB_STATES,
  EMPTY_METRICS,
  type GithubStates,
  type Metrics,
} from "../types";

// El watcher emite en cada escritura del transcript (muy frecuente cuando hay
// una sesión activa). Aplicar cada evento re-renderiza todo el árbol (Reino,
// charts) y traba la UI. Throttle: como mucho un update cada THROTTLE_MS, con
// un update final pendiente para no perder el último estado.
const THROTTLE_MS = 4000;

/**
 * Loads metrics on mount, then refreshes live (throttled) via the
 * `telemetry-updated` event emitted by the Rust file watcher. GitHub state
 * refreshes on manual ↻ and automatically when a brand-new run appears.
 */
export function useTelemetry() {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [github, setGithub] = useState<GithubStates>(EMPTY_GITHUB_STATES);
  const [projectDir, setProjectDir] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const knownIssues = useRef<Set<string>>(new Set());
  const lastApplied = useRef<number>(0);
  const pending = useRef<Metrics | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshGithub = useCallback(async () => {
    try {
      const g = await invoke<GithubStates>("get_github_states");
      setGithub(g);
      knownIssues.current = new Set(g.issues.map((i) => i.number));
    } catch (e) {
      console.error("get_github_states failed", e);
    }
  }, []);

  const applyMetrics = useCallback(
    (m: Metrics) => {
      setMetrics(m);
      setLastUpdate(new Date());
      lastApplied.current = Date.now();
      // A new run whose issue GitHub doesn't know yet → refresh GitHub so its
      // castle (shown only when "active") appears without a manual ↻.
      const hasUnknownRun = m.runs.some(
        (r) => r.issue && !knownIssues.current.has(r.issue)
      );
      if (hasUnknownRun) refreshGithub();
    },
    [refreshGithub]
  );

  const refreshMetrics = useCallback(async () => {
    try {
      const m = await invoke<Metrics>("get_metrics");
      applyMetrics(m);
    } catch (e) {
      console.error("get_metrics failed", e);
    } finally {
      setLoading(false);
    }
  }, [applyMetrics]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshMetrics(), refreshGithub()]);
  }, [refreshMetrics, refreshGithub]);

  useEffect(() => {
    invoke<string>("get_project_dir").then(setProjectDir).catch(() => {});
    refresh();
    const unlisten = listen<Metrics>("telemetry-updated", (event) => {
      const since = Date.now() - lastApplied.current;
      if (since >= THROTTLE_MS) {
        applyMetrics(event.payload);
      } else {
        // Coalesce: keep only the latest payload, apply it when the window ends.
        pending.current = event.payload;
        if (!timer.current) {
          timer.current = setTimeout(() => {
            timer.current = null;
            if (pending.current) {
              applyMetrics(pending.current);
              pending.current = null;
            }
          }, THROTTLE_MS - since);
        }
      }
    });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      unlisten.then((fn) => fn());
    };
  }, [refresh, applyMetrics]);

  return { metrics, github, projectDir, loading, lastUpdate, refresh };
}
