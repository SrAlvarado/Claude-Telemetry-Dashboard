import type { GithubStates, IssueRun } from "../types";
import { issueStatus, STATUS_DOT, STATUS_LABEL } from "../lib/issueStatus";

interface Props {
  runs: IssueRun[];
  github: GithubStates;
  selected: string; // "global" | "issues" | "reino" | a run key
  onSelect: (v: string) => void;
}

const runKey = (r: IssueRun, i: number) => `${r.issue}-${r.startedAt}-${i}`;
const fmtDate = (ts: string) =>
  ts.length >= 16 ? ts.slice(0, 16).replace("T", " ") : ts;

interface NavButtonProps {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}

function NavButton({ active, icon, label, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
        active
          ? "bg-neon-teal/10 text-neon-teal border-l-2 border-neon-teal"
          : "text-slate-300 hover:text-slate-100 border-l-2 border-transparent"
      }`}
    >
      <span className="text-base">{icon}</span> {label}
    </button>
  );
}

export function Sidebar({ runs, github, selected, onSelect }: Props) {
  return (
    <aside className="w-64 shrink-0 border-r border-neon-teal/15 bg-navy-800/80 flex flex-col">
      <div className="px-6 py-6 flex items-center gap-3 border-b border-neon-teal/10">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-neon-teal to-neon-cyan shadow-glow flex items-center justify-center text-navy-900 font-bold">
          λ
        </div>
        <div>
          <div className="font-display text-sm tracking-wider text-neon-teal">
            claude.telemetry
          </div>
          <div className="text-[10px] text-slate-500">dashboard</div>
        </div>
      </div>

      <NavButton
        active={selected === "global"}
        icon="📊"
        label="Dashboard global"
        onClick={() => onSelect("global")}
      />
      <NavButton
        active={selected === "issues"}
        icon="🗂️"
        label="Issues"
        onClick={() => onSelect("issues")}
      />
      <NavButton
        active={selected === "reino"}
        icon="🏰"
        label="Reino"
        onClick={() => onSelect("reino")}
      />

      <div className="px-6 pt-4 pb-2 text-[10px] uppercase tracking-widest text-slate-500">
        /start-issue · {runs.length}
      </div>

      <nav className="flex-1 overflow-y-auto pb-4">
        {runs.length === 0 && (
          <div className="px-6 py-2 text-xs text-slate-600">
            No se han detectado ejecuciones de /start-issue todavía.
          </div>
        )}
        {runs.map((r, i) => {
          const key = runKey(r, i);
          const isActive = selected === key;
          const status = issueStatus(r, github);
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`w-full text-left px-6 py-2.5 transition-colors border-l-2 ${
                isActive
                  ? "bg-neon-cyan/10 border-neon-cyan"
                  : "border-transparent hover:bg-navy-700/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-display text-sm ${
                    isActive ? "text-neon-cyan" : "text-slate-200"
                  }`}
                >
                  #{r.issue || "?"}
                </span>
                <span
                  title={STATUS_LABEL[status]}
                  className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`}
                />
              </div>
              <div className="text-[10px] text-slate-500 truncate" title={r.branch}>
                {r.branch || "—"}
              </div>
              <div className="text-[10px] text-slate-600">{fmtDate(r.startedAt)}</div>
            </button>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-neon-teal/10 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
          Live · file watcher
        </div>
      </div>
    </aside>
  );
}

export { runKey };
