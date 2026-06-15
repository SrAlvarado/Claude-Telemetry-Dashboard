import type { Failure } from "../types";

const fmtTs = (ts: string) => (ts.length >= 16 ? ts.slice(0, 16).replace("T", " ") : ts);

export function FailuresTable({ items }: { items: Failure[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-widest text-slate-500">
          Comandos fallidos · por qué
        </div>
        <span className="text-xs text-neon-red">{items.length}</span>
      </div>
      {items.length === 0 && (
        <div className="text-sm text-slate-600">Sin fallos registrados. ✨</div>
      )}
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="text-slate-500 sticky top-0 bg-navy-700/95">
            <tr className="text-left">
              <th className="py-2 pr-3 font-medium">Hora</th>
              <th className="py-2 pr-3 font-medium">Comando</th>
              <th className="py-2 font-medium">Causa</th>
            </tr>
          </thead>
          <tbody>
            {items.map((f, i) => (
              <tr key={i} className="border-t border-navy-600/60 align-top">
                <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">
                  {fmtTs(f.ts)}
                </td>
                <td className="py-2 pr-3 font-mono text-slate-300 max-w-[220px] truncate" title={f.command}>
                  {f.command}
                </td>
                <td className="py-2 text-neon-red/90 max-w-[360px]" title={f.reason}>
                  {f.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
