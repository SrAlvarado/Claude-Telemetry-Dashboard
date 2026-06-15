import type { Core } from "../types";
import { MetricCard } from "./MetricCard";
import { TokensChart } from "./TokensChart";
import { CommandsChart } from "./CommandsChart";
import { TopList } from "./TopList";
import { FailuresTable } from "./FailuresTable";
import { FlowDiagram } from "./FlowDiagram";

const fmt = (n: number) => n.toLocaleString("es-ES");
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

/** Full dashboard for a single scope (global or one /start-issue run). */
export function CoreDashboard({ core, showFlow = true }: { core: Core; showFlow?: boolean }) {
  const s = core.summary;
  const successRate =
    s.totalCommands > 0 ? Math.round((s.commandsSuccess / s.totalCommands) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Prompts" value={fmt(s.totalPrompts)} accent="cyan" hint={`${s.sessions} sesiones`} />
        <MetricCard label="Comandos" value={fmt(s.totalCommands)} accent="teal" hint={`${successRate}% éxito`} />
        <MetricCard label="Exitosos" value={fmt(s.commandsSuccess)} accent="green" />
        <MetricCard
          label="Fallidos"
          value={fmt(s.commandsFailed)}
          accent="red"
          hint={s.benignFailures > 0 ? `+${fmt(s.benignFailures)} esperados/bloqueados` : undefined}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Tokens input" value={k(s.totalInputTokens)} accent="cyan" hint={`+${k(s.totalCacheTokens)} cache`} />
        <MetricCard label="Tokens output" value={k(s.totalOutputTokens)} accent="teal" hint={`~${fmt(s.avgOutputTokensPerPrompt)}/prompt`} />
        <MetricCard label="Tokens totales" value={k(s.totalInputTokens + s.totalOutputTokens)} accent="cyan" />
        <MetricCard label="Tasa de éxito" value={`${successRate}`} unit="%" accent={successRate >= 90 ? "green" : "amber"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-4">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 px-1">
            Tokens en el tiempo
          </div>
          <TokensChart data={core.tokensTimeline} />
        </div>
        <div className="card p-4">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 px-1">
            Comandos exitosos / fallidos
          </div>
          <CommandsChart data={core.commandsTimeline} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TopList title="Comandos más repetidos" items={core.topCommands} accent="teal" mono />
        <TopList title="Prompts más repetidos" items={core.topPrompts} accent="cyan" />
      </div>

      <FailuresTable items={core.failures} />

      {showFlow && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">
            Flujo de ejecución → PR merge
          </div>
          <FlowDiagram flow={core.flow} />
        </div>
      )}
    </div>
  );
}
