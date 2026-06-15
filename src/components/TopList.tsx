import type { Counted } from "../types";

interface Props {
  title: string;
  items: Counted[];
  accent?: "teal" | "cyan";
  mono?: boolean;
}

export function TopList({ title, items, accent = "teal", mono }: Props) {
  const max = items.reduce((m, i) => Math.max(m, i.count), 0) || 1;
  const bar = accent === "cyan" ? "bg-neon-cyan/30" : "bg-neon-teal/30";
  const text = accent === "cyan" ? "text-neon-cyan" : "text-neon-teal";
  return (
    <div className="card p-5">
      <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">
        {title}
      </div>
      {items.length === 0 && (
        <div className="text-sm text-slate-600">Sin datos todavía.</div>
      )}
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="relative">
            <div
              className={`absolute inset-y-0 left-0 rounded ${bar}`}
              style={{ width: `${(it.count / max) * 100}%` }}
            />
            <div className="relative flex items-center justify-between px-2 py-1.5">
              <span
                className={`truncate pr-3 text-xs ${mono ? "font-mono" : ""} text-slate-200`}
                title={it.label}
              >
                {it.label}
              </span>
              <span className={`text-xs font-semibold ${text}`}>{it.count}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
