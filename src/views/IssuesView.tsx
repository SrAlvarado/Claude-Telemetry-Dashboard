import type { GithubStates, IssueRun, QaReport } from "../types";
import {
  issueStatus,
  runPr,
  runPrNumber,
  STATUS_DOT,
  STATUS_LABEL,
} from "../lib/issueStatus";
import { runKey } from "../components/Sidebar";

const fmtDate = (ts: string) =>
  ts.length >= 16 ? ts.slice(0, 16).replace("T", " ") : ts;

const QA_COLOR: Record<string, string> = {
  pass: "text-neon-green",
  warn: "text-neon-amber",
  fail: "text-neon-red",
};

interface Props {
  runs: IssueRun[];
  github: GithubStates;
  qaReports: QaReport[];
  onSelect: (key: string) => void;
}

export function IssuesView({ runs, github, qaReports, onSelect }: Props) {
  if (runs.length === 0) {
    return (
      <div className="text-slate-500 text-sm">
        No se han detectado ejecuciones de /start-issue todavía.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {runs.map((r, i) => {
        const status = issueStatus(r, github);
        const pr = runPr(r, github);
        const prNumber = runPrNumber(r, github);
        const qa = qaReports.find((q) => q.pr === prNumber);
        return (
          <button
            key={runKey(r, i)}
            onClick={() => onSelect(runKey(r, i))}
            className="card p-4 text-left hover:border-neon-teal/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg text-slate-100">
                #{r.issue || "?"}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span
                  title={STATUS_LABEL[status]}
                  className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`}
                />
                {STATUS_LABEL[status]}
              </span>
            </div>
            <div
              className="text-[11px] text-slate-500 font-mono truncate mt-1"
              title={r.branch}
            >
              {r.branch || "—"}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {fmtDate(r.startedAt)}
            </div>

            <div className="flex items-center gap-3 mt-3 text-[11px]">
              {pr ? (
                <span className="text-slate-400 font-mono">
                  PR #{pr.number} · {pr.state.toLowerCase()}
                </span>
              ) : (
                <span className="text-slate-600">sin PR</span>
              )}
              {qa && (
                <span className={`font-mono ${QA_COLOR[qa.status] ?? "text-slate-400"}`}>
                  QA {qa.status}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
