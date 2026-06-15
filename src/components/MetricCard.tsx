interface Props {
  label: string;
  value: string | number;
  unit?: string;
  accent?: "teal" | "cyan" | "green" | "amber" | "red";
  hint?: string;
}

const ACCENT: Record<string, string> = {
  teal: "text-neon-teal",
  cyan: "text-neon-cyan",
  green: "text-neon-green",
  amber: "text-neon-amber",
  red: "text-neon-red",
};

export function MetricCard({ label, value, unit, accent = "teal", hint }: Props) {
  return (
    <div className="card px-5 py-4">
      <div className="text-[11px] uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`font-display text-3xl ${ACCENT[accent]}`}>{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}
