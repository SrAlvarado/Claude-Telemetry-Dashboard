import { open as openUrl } from "@tauri-apps/plugin-shell";
import type { IssueRun } from "../types";
import { CoreDashboard } from "../components/CoreDashboard";

const fmtDate = (ts: string) =>
  ts.length >= 19 ? ts.slice(0, 19).replace("T", " ") : ts;

export function RunDetailView({ run }: { run: IssueRun }) {
  return (
    <div className="space-y-5">
      <div className="card p-5 flex items-start justify-between">
        <div>
          <div className="font-display text-2xl text-neon-cyan">
            /start-issue {run.args || run.issue}
          </div>
          <div className="text-sm text-slate-400 mt-1 font-mono">{run.branch || "—"}</div>
          <div className="text-xs text-slate-500 mt-1">
            Iniciado: {fmtDate(run.startedAt)} · sesión {run.sessionId.slice(0, 8)}
          </div>
        </div>
        {run.prUrl && (
          <button
            onClick={() => openUrl(run.prUrl)}
            className="text-xs px-3 py-1.5 rounded border border-neon-amber/40 text-neon-amber hover:bg-neon-amber/10 transition-colors"
          >
            ↗ Ver PR
          </button>
        )}
      </div>

      <CoreDashboard core={run.core} />
    </div>
  );
}
