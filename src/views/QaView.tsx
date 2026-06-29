import type { QaCheck, QaReport } from "../types";

const STATUS_COLOR: Record<string, string> = {
  pass: "text-neon-green",
  warn: "text-neon-amber",
  fail: "text-neon-red",
  skip: "text-slate-500",
};

const badge = (s: string) =>
  `inline-block px-2 py-0.5 rounded text-[11px] font-mono border border-navy-500 ${
    STATUS_COLOR[s] ?? "text-slate-400"
  }`;

const fmtScore = (c: QaCheck) => {
  if (c.score == null) return "—";
  return c.threshold == null
    ? `${c.score}`
    : `${c.score} / ${c.threshold}`;
};

/** Full QA report — every check and field the gate emits, untruncated. */
export function QaReportCard({ report: r }: { report: QaReport }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-display text-lg text-slate-100">
          PR #{r.pr}{" "}
          {r.branch && (
            <span className="text-xs text-slate-500 font-mono">{r.branch}</span>
          )}
        </div>
        <span className={badge(r.status)}>{r.status.toUpperCase()}</span>
      </div>
      <div className="text-[11px] text-slate-500 font-mono">
        {r.generatedAt} · {r.totalChecks || r.checks.length} checks ·{" "}
        {r.blockingFailures} bloqueantes · {r.warnings} avisos
        {r.schemaVersion && ` · schema v${r.schemaVersion}`}
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-slate-500 text-left">
            <th className="py-1 pr-3 font-normal">Estado</th>
            <th className="py-1 pr-3 font-normal">Check</th>
            <th className="py-1 pr-3 font-normal">Categoría</th>
            <th className="py-1 pr-3 font-normal">Herramienta</th>
            <th className="py-1 pr-3 font-normal">Score</th>
            <th className="py-1 font-normal">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {r.checks.map((c) => (
            <tr key={c.id} className="border-b border-navy-600/40 align-top">
              <td className="py-1.5 pr-3">
                <span className={badge(c.status)}>{c.status}</span>
              </td>
              <td className="py-1.5 pr-3 font-mono text-slate-300 whitespace-nowrap">
                {c.id}
                {c.blocking ? " 🔒" : ""}
              </td>
              <td className="py-1.5 pr-3 text-slate-400">{c.category || "—"}</td>
              <td className="py-1.5 pr-3 text-slate-400 font-mono">
                {c.tool || "—"}
              </td>
              <td className="py-1.5 pr-3 text-slate-400 font-mono whitespace-nowrap">
                {fmtScore(c)}
              </td>
              <td className="py-1.5 text-slate-400 whitespace-pre-wrap break-words">
                {c.details}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {r.feedback.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Feedback de scope
          </div>
          {r.feedback.map((f) => (
            <div key={f.key}>
              <div className="text-[10px] uppercase tracking-widest text-slate-600">
                {f.key.replace(/_/g, " ")}
              </div>
              <div className="text-xs text-slate-300 whitespace-pre-wrap">
                {f.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs">
        <span className="text-slate-500">Scope: </span>
        <span className={r.inScope === false ? "text-neon-red" : "text-neon-green"}>
          {r.inScope === false
            ? "fuera de scope"
            : r.inScope === true
            ? "dentro de scope"
            : "no evaluado"}
        </span>
        {r.scopeNotes && <span className="text-slate-500"> — {r.scopeNotes}</span>}
      </div>
    </div>
  );
}

/** QA sub-section of an issue: its report(s), or an empty state. */
export function QaView({ reports }: { reports: QaReport[] }) {
  if (reports.length === 0) {
    return (
      <div className="text-slate-500 text-sm">
        No hay informe QA para esta issue todavía. Se genera al correr el QA gate
        (<span className="font-mono">qa-gate.sh</span>) sobre su PR.
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {reports.map((r) => (
        <QaReportCard key={r.pr} report={r} />
      ))}
    </div>
  );
}
