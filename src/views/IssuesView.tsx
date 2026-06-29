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

interface IssueCardProps {
  run: IssueRun;
  github: GithubStates;
  qaReports: QaReport[];
  onSelect: () => void;
}

function IssueCard({ run, github, qaReports, onSelect }: IssueCardProps) {
  const status = issueStatus(run, github);
  const pr = runPr(run, github);
  const prNumber = runPrNumber(run, github);
  const qa = qaReports.find((q) => q.pr === prNumber);
  return (
    <button
      onClick={onSelect}
      className="card p-4 text-left hover:border-neon-teal/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-lg text-slate-100">
          #{run.issue || "?"}
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
        title={run.branch}
      >
        {run.branch || "—"}
      </div>
      <div className="text-[10px] text-slate-600 mt-0.5">
        {fmtDate(run.startedAt)}
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
}

export function IssuesView({ runs, github, qaReports, onSelect }: Props) {
  if (runs.length === 0) {
    return (
      <div className="text-slate-500 text-sm">
        No se han detectado ejecuciones de /start-issue todavía.
      </div>
    );
  }

  const annotated = runs.map((run, i) => ({
    run,
    key: runKey(run, i),
    done: issueStatus(run, github) === "done",
  }));
  const activeRuns = annotated.filter((r) => !r.done);
  const doneRuns = annotated.filter((r) => r.done);

  return (
    <div className="space-y-6">
      {([
        ["Activas", activeRuns],
        ["Mergeadas", doneRuns],
      ] as const).map(([title, group]) =>
        group.length === 0 ? null : (
          <section key={title}>
            <h2 className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">
              {title} · {group.length}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {group.map(({ run, key }) => (
                <IssueCard
                  key={key}
                  run={run}
                  github={github}
                  qaReports={qaReports}
                  onSelect={() => onSelect(key)}
                />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  );
}
