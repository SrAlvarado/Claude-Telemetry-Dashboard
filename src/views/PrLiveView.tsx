import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import type {
  GithubStates,
  IssueRun,
  PrCheck,
  PrDetail,
  PushEvent,
} from "../types";
import { runPrNumber } from "../lib/issueStatus";
import { PushTimeline } from "./PushView";

const PR_STATE_COLOR: Record<string, string> = {
  OPEN: "text-neon-green",
  MERGED: "text-neon-cyan",
  CLOSED: "text-neon-red",
};

const CHECK_COLOR = (conclusion: string) => {
  const c = conclusion.toUpperCase();
  if (["SUCCESS", "PASS", "NEUTRAL"].includes(c)) return "text-neon-green";
  if (["FAILURE", "FAIL", "ERROR", "CANCELLED", "TIMED_OUT"].includes(c))
    return "text-neon-red";
  return "text-neon-amber";
};

function CheckRow({ check }: { check: PrCheck }) {
  const done = check.status.toUpperCase() === "COMPLETED";
  const label = done ? check.conclusion || "—" : check.status;
  return (
    <li className="flex items-center justify-between text-xs border-b border-navy-600/40 py-1.5">
      <span className="font-mono text-slate-300 truncate pr-3">{check.name}</span>
      <span className={`font-mono ${done ? CHECK_COLOR(check.conclusion) : "text-neon-amber"}`}>
        {done ? label.toLowerCase() : "⏳ " + label.toLowerCase()}
      </span>
    </li>
  );
}

interface Props {
  run: IssueRun;
  github: GithubStates;
  pushEvents: PushEvent[];
}

export function PrLiveView({ run, github, pushEvents }: Props) {
  const prNumber = runPrNumber(run, github);
  const [detail, setDetail] = useState<PrDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (prNumber == null) {
      setDetail(null);
      return;
    }
    setLoading(true);
    invoke<PrDetail | null>("get_pr_detail", { number: prNumber })
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => console.error("get_pr_detail failed", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [prNumber]);

  const branchEvents = pushEvents.filter(
    (e) => e.branch === run.branch || (detail && e.detail.includes(`#${detail.number}`))
  );

  if (prNumber == null) {
    return (
      <div className="text-slate-500 text-sm">
        Esta issue todavía no tiene PR asociada (ni en la telemetría ni en GitHub).
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-display text-lg text-slate-100 truncate">
              {loading ? "Cargando PR…" : detail?.title || `PR #${prNumber}`}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              PR #{prNumber}
              {detail?.reviewDecision && ` · review: ${detail.reviewDecision.toLowerCase()}`}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {detail && (
              <span
                className={`font-mono text-sm ${
                  PR_STATE_COLOR[detail.state] ?? "text-slate-400"
                }`}
              >
                {detail.state}
              </span>
            )}
            {detail?.url && (
              <button
                onClick={() => openUrl(detail.url)}
                className="text-xs px-3 py-1.5 rounded border border-neon-amber/40 text-neon-amber hover:bg-neon-amber/10 transition-colors"
              >
                ↗ Abrir
              </button>
            )}
          </div>
        </div>

        {detail && detail.checks.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
              Checks de CI · {detail.checks.length}
            </div>
            <ul>
              {detail.checks.map((c, i) => (
                <CheckRow key={`${c.name}-${i}`} check={c} />
              ))}
            </ul>
          </div>
        )}

        {detail && detail.checks.length === 0 && !loading && (
          <div className="text-xs text-slate-500">Sin checks de CI reportados.</div>
        )}

        {!detail && !loading && (
          <div className="text-xs text-slate-500">
            No se pudo obtener el estado del PR desde GitHub (¿`gh` sin auth o sin
            red?).
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
          Historial de push · {branchEvents.length}
        </div>
        {branchEvents.length === 0 ? (
          <div className="text-xs text-slate-500">Sin eventos de push para esta rama.</div>
        ) : (
          <PushTimeline events={branchEvents} />
        )}
      </div>
    </div>
  );
}
