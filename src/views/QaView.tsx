import type { QaReport } from "../types";

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

export function QaView({ reports }: { reports: QaReport[] }) {
  if (reports.length === 0) {
    return (
      <div className="text-slate-500 text-sm">
        No hay informes QA todavía. Se generan al correr el QA gate
        (<span className="font-mono">qa-gate.sh</span>) sobre una PR.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {reports.map((r) => (
        <div key={r.pr} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-display text-lg text-slate-100">
              PR #{r.pr}{" "}
              <span className="text-xs text-slate-500 font-mono">{r.branch}</span>
            </div>
            <span className={badge(r.status)}>{r.status.toUpperCase()}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {r.generatedAt} · {r.blockingFailures} bloqueantes · {r.warnings} avisos
          </div>

          <table className="w-full text-xs">
            <tbody>
              {r.checks.map((c) => (
                <tr key={c.id} className="border-b border-navy-600/40">
                  <td className="py-1 pr-3 w-16">
                    <span className={badge(c.status)}>{c.status}</span>
                  </td>
                  <td className="py-1 pr-3 font-mono text-slate-300 whitespace-nowrap">
                    {c.id}
                    {c.blocking ? " 🔒" : ""}
                  </td>
                  <td className="py-1 text-slate-500">{c.details}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {r.feedback.length > 0 && (
            <div className="space-y-2">
              {r.feedback.map((f) => (
                <div key={f.key}>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">
                    {f.key.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs text-slate-300">{f.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs">
            <span className="text-slate-500">Scope: </span>
            <span
              className={
                r.inScope === false ? "text-neon-red" : "text-neon-green"
              }
            >
              {r.inScope === false
                ? "fuera de scope"
                : r.inScope === true
                ? "dentro de scope"
                : "no evaluado"}
            </span>
            {r.scopeNotes && (
              <span className="text-slate-500"> — {r.scopeNotes}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
