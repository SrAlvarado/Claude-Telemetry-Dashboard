import { useState } from "react";
import { Sidebar, runKey } from "./components/Sidebar";
import { CoreDashboard } from "./components/CoreDashboard";
import { RunDetailView } from "./views/RunDetailView";
import { IssuesView } from "./views/IssuesView";
import { ReinoView } from "./views/ReinoView";
import { useTelemetry } from "./hooks/useTelemetry";

export default function App() {
  const [selected, setSelected] = useState("global");
  const { metrics, github, projectDir, loading, lastUpdate, refresh } =
    useTelemetry();

  const updated = lastUpdate
    ? lastUpdate.toLocaleString("es-ES", { hour12: false })
    : "—";

  const activeRun =
    selected === "global" || selected === "issues" || selected === "reino"
      ? null
      : metrics.runs.find((r, i) => runKey(r, i) === selected) ?? null;

  const title = activeRun
    ? `Issue #${activeRun.issue || "?"}`
    : selected === "issues"
    ? "Issues"
    : selected === "reino"
    ? "Reino"
    : "Dashboard de Monitoreo";

  return (
    <div className="h-full flex bg-grid">
      <Sidebar
        runs={metrics.runs}
        github={github}
        selected={selected}
        onSelect={setSelected}
      />

      <main className="flex-1 overflow-y-auto">
        <header className="px-8 py-5 border-b border-neon-teal/10 sticky top-0 bg-navy-900/85 backdrop-blur z-10 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl text-slate-100 tracking-wide">
              {title}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-mono truncate max-w-[640px]">
              {projectDir || "resolviendo proyecto…"}
              {github.repo && ` · ${github.repo}`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500">Última actualización</div>
            <div className="text-sm text-neon-teal font-mono">{updated}</div>
            <button
              onClick={refresh}
              className="mt-2 text-[11px] px-3 py-1 rounded border border-neon-teal/30 text-neon-teal hover:bg-neon-teal/10 transition-colors"
            >
              ↻ Refrescar
            </button>
          </div>
        </header>

        <div className="px-8 py-6">
          {loading ? (
            <div className="text-slate-500 text-sm">Cargando telemetría…</div>
          ) : selected === "reino" ? (
            <ReinoView runs={metrics.runs} github={github} />
          ) : selected === "issues" ? (
            <IssuesView
              runs={metrics.runs}
              github={github}
              qaReports={metrics.qaReports}
              onSelect={setSelected}
            />
          ) : activeRun ? (
            <RunDetailView
              run={activeRun}
              github={github}
              qaReports={metrics.qaReports}
              pushEvents={metrics.pushEvents}
            />
          ) : (
            <CoreDashboard core={metrics} />
          )}
        </div>
      </main>
    </div>
  );
}
