import { useState } from "react";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import type { GithubStates, IssueRun, PushEvent, QaReport } from "../types";
import { CoreDashboard } from "../components/CoreDashboard";
import { QaView } from "./QaView";
import { PrLiveView } from "./PrLiveView";
import { issueStatus, runPrNumber, STATUS_DOT, STATUS_LABEL } from "../lib/issueStatus";

const fmtDate = (ts: string) =>
  ts.length >= 19 ? ts.slice(0, 19).replace("T", " ") : ts;

type Tab = "resumen" | "qa" | "pr";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "resumen", label: "Resumen", icon: "📈" },
  { id: "qa", label: "QA", icon: "🧪" },
  { id: "pr", label: "PR", icon: "🚀" },
];

interface Props {
  run: IssueRun;
  github: GithubStates;
  qaReports: QaReport[];
  pushEvents: PushEvent[];
}

export function RunDetailView({ run, github, qaReports, pushEvents }: Props) {
  const [tab, setTab] = useState<Tab>("resumen");
  const status = issueStatus(run, github);
  const prNumber = runPrNumber(run, github);
  const runReports = qaReports.filter((r) => r.pr === prNumber);

  return (
    <div className="space-y-5">
      <div className="card p-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              title={STATUS_LABEL[status]}
              className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`}
            />
            <div className="font-display text-2xl text-neon-cyan">
              /start-issue {run.args || run.issue}
            </div>
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

      <div className="flex gap-1 border-b border-neon-teal/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-neon-teal text-neon-teal"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && <CoreDashboard core={run.core} />}
      {tab === "qa" && <QaView reports={runReports} />}
      {tab === "pr" && (
        <PrLiveView run={run} github={github} pushEvents={pushEvents} />
      )}
    </div>
  );
}
