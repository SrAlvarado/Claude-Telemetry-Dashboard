import type { PushEvent } from "../types";

const OUTCOME: Record<string, { color: string; icon: string }> = {
  pushed: { color: "text-neon-cyan", icon: "⬆" },
  pending: { color: "text-neon-amber", icon: "⏳" },
  pass: { color: "text-neon-green", icon: "✅" },
  fail: { color: "text-neon-red", icon: "❌" },
  warning: { color: "text-neon-amber", icon: "⚠" },
  merged: { color: "text-neon-green", icon: "🔀" },
  closed: { color: "text-slate-500", icon: "🚫" },
};

/** Ordered list of push/CI events (already filtered/ordered by the caller). */
export function PushTimeline({ events }: { events: PushEvent[] }) {
  return (
    <ol className="space-y-2">
      {events.map((e, i) => {
        const o = OUTCOME[e.outcome] ?? { color: "text-slate-400", icon: "•" };
        return (
          <li
            key={`${e.timestamp}-${i}`}
            className="flex items-start gap-3 text-xs border-b border-navy-600/40 pb-2"
          >
            <span className={`${o.color} text-base leading-none`}>{o.icon}</span>
            <div className="flex-1">
              <div className={`font-mono ${o.color}`}>{e.outcome}</div>
              {e.detail && <div className="text-slate-300">{e.detail}</div>}
              <div className="text-[10px] text-slate-600 font-mono">
                {e.branch} · {e.timestamp}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PushView({ events }: { events: PushEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-slate-500 text-sm">
        Sin eventos de push todavía. Se emiten al pushear desde
        <span className="font-mono"> /implement</span> y los va actualizando el
        watcher de CI.
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
        Push en tiempo real · {events.length}
      </div>
      <PushTimeline events={events} />
    </div>
  );
}
