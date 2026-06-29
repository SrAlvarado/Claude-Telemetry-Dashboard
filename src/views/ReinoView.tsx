import { useMemo, useState } from "react";
import type { GithubStates, IssueRun, Subject, SubjectRole } from "../types";
import { issueStatus } from "../lib/issueStatus";
import { Pixel, type SpriteName } from "../lib/pixelSprites";

const ROLE_SPRITE: Record<SubjectRole, SpriteName> = {
  guardian: "guardian",
  brain: "brain",
  scout: "scout",
  guide: "guide",
  worker: "worker",
};

interface RoleMeta {
  zone: string; // label en la sala del trono
  screen: string; // título de la pantalla
  cls: string; // clase de tema CSS
  accent: string;
  props: SpriteName[]; // decoración ambiental (pixel-art)
}

const ROLE_META: Record<SubjectRole, RoleMeta> = {
  worker: { zone: "Obras", screen: "Zona en obras", cls: "reino-zone-worker", accent: "text-neon-amber", props: ["bricks", "barrel", "bricks", "barrel"] },
  brain: { zone: "Laboratorio", screen: "El laboratorio", cls: "reino-zone-brain", accent: "text-neon-green", props: ["flask", "potion", "flask", "potion"] },
  guardian: { zone: "Guardia", screen: "Puesto de guardia", cls: "reino-zone-guardian", accent: "text-neon-cyan", props: ["torch", "wallshield", "torch", "wallshield"] },
  guide: { zone: "Biblioteca", screen: "La biblioteca", cls: "reino-zone-guide", accent: "text-[#c4b5fd]", props: ["bookshelf", "candle", "bookshelf", "candle"] },
  scout: { zone: "Mirador", screen: "El mirador", cls: "reino-zone-scout", accent: "text-neon-teal", props: ["telescope", "star", "moon", "star"] },
};

const ROLE_ORDER: SubjectRole[] = ["worker", "brain", "guardian", "guide", "scout"];

const keyOf = (r: IssueRun) => `${r.issue}|${r.branch}`;
const subjectsOf = (run: IssueRun, role: SubjectRole) =>
  run.kingdom.subjects.filter((s) => s.role === role);

// ── Nivel 1: mapa ───────────────────────────────────────────────────────────

function CastleNode({ run, index, onEnter }: { run: IssueRun; index: number; onEnter: () => void }) {
  const building = run.kingdom.building;
  return (
    <button
      onClick={onEnter}
      className="anim-bob flex flex-col items-center gap-1 hover:brightness-125 transition-[filter]"
      style={{ animationDelay: `${(index % 5) * 0.4}s` }}
      title={
        building
          ? `Castillo en obras — la issue #${run.issue} acaba de arrancar`
          : `Entrar al castillo de la issue #${run.issue}`
      }
    >
      <Pixel name={building ? "castleBuilding" : "castle"} scale={7} />
      {building ? (
        <span className="font-pixel text-[8px] px-2 py-1 rounded text-neon-amber bg-neon-amber/15 border border-neon-amber/40 animate-pulse">
          en obras · #{run.issue || "?"}
        </span>
      ) : (
        <span className="font-pixel text-[9px] px-2 py-1 rounded text-neon-green bg-neon-green/15 border border-neon-green/40 shadow-glow">
          #{run.issue || "?"}
        </span>
      )}
      <span className="text-[10px] text-slate-400 font-mono max-w-[140px] truncate" title={run.branch}>
        {run.branch}
      </span>
    </button>
  );
}

function KingdomMap({ active, onEnter }: { active: IssueRun[]; onEnter: (r: IssueRun) => void }) {
  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
        <Pixel name="castle" scale={9} />
        <div className="font-pixel text-base text-neon-teal mt-2">El reino está en paz</div>
        <p className="text-sm text-slate-500 max-w-md">
          No hay issues activas ahora mismo. Cuando una issue esté abierta, su
          castillo aparecerá aquí.
        </p>
      </div>
    );
  }
  return (
    <div className="reino-grass rounded-2xl p-10 min-h-[460px] flex flex-wrap gap-x-12 gap-y-10 content-start justify-center">
      {active.map((r, i) => (
        <CastleNode key={keyOf(r)} run={r} index={i} onEnter={() => onEnter(r)} />
      ))}
    </div>
  );
}

// ── Nivel 2: sala del trono ──────────────────────────────────────────────────

function Zone({ role, subjects, onEnter }: { role: SubjectRole; subjects: Subject[]; onEnter: () => void }) {
  const meta = ROLE_META[role];
  const shown = subjects.slice(0, 4);
  const extra = subjects.length - shown.length;
  return (
    <button onClick={onEnter} className="reino-zone flex flex-col items-center gap-2 min-w-[110px] p-2" title={`Entrar en ${meta.screen}`}>
      <span className={`font-pixel text-[8px] px-2 py-1 rounded bg-navy-900/70 border border-white/10 ${meta.accent}`}>
        {meta.zone} · {subjects.length}
      </span>
      <div className="flex items-end gap-1 min-h-[60px]">
        {shown.length === 0 ? (
          <span className="text-[10px] text-slate-600">vacía</span>
        ) : (
          shown.map((s, i) => (
            <div key={i} className="anim-float" style={{ animationDelay: `${i * 0.5}s` }} title={s.label || s.subagentType}>
              <Pixel name={ROLE_SPRITE[role]} scale={4} />
            </div>
          ))
        )}
        {extra > 0 && <span className="text-[10px] text-slate-400 self-center">+{extra}</span>}
      </div>
      <span className="text-[7px] text-slate-500">clic para entrar ▸</span>
    </button>
  );
}

function ThroneRoom({ run, onBack, onEnterZone }: { run: IssueRun; onBack: () => void; onEnterZone: (role: SubjectRole) => void }) {
  const activity = run.kingdom.activity || "El rey medita en su trono…";
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="font-pixel text-[9px] px-3 py-2 rounded border border-neon-teal/40 text-neon-teal hover:bg-neon-teal/10 transition-colors">
          ← volver al mapa
        </button>
        <div className="text-right">
          <div className="font-display text-xl text-neon-cyan">Castillo #{run.issue || "?"}</div>
          <div className="text-[11px] text-slate-500 font-mono truncate max-w-[420px]">{run.branch}</div>
        </div>
      </div>

      <div className="relative h-[440px] rounded-2xl overflow-hidden border border-neon-teal/20" style={{ background: "linear-gradient(180deg,#1a1140 0%,#20184e 46%,#2a2030 46%,#241a2c 100%)" }}>
        <div className="reino-wall absolute top-0 inset-x-0 h-[46%]" />
        <div className="reino-floor absolute bottom-0 h-[56%]" style={{ left: "-10%", right: "-10%" }} />
        <div className="reino-carpet absolute bottom-0 left-1/2" style={{ width: 130, height: "56%" }} />
        <div className="absolute left-1/2 -translate-x-1/2 rounded" style={{ bottom: "42%", width: 150, height: 18, background: "linear-gradient(180deg,#5d6b96,#3c4a78)" }} />
        <div className="reino-throne absolute left-1/2 -translate-x-1/2" style={{ bottom: "44%", width: 78, height: 104 }} />
        <div className="anim-breathe absolute left-1/2 -translate-x-1/2 z-10" style={{ bottom: "46%" }}>
          <Pixel name="kingSeat" scale={7} />
        </div>
        <div className="reino-bubble absolute left-1/2 top-5 z-20 rounded-lg px-4 py-3 text-center font-pixel text-[8px] leading-relaxed" style={{ width: 270 }}>
          👑 «{activity}»
        </div>
        <div className="absolute inset-x-4 z-10 flex items-end justify-between" style={{ bottom: 14 }}>
          {ROLE_ORDER.map((role) => (
            <Zone key={role} role={role} subjects={subjectsOf(run, role)} onEnter={() => onEnterZone(role)} />
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Bocadillo = última acción real de la sesión. Clic en una zona para entrar y ver a sus súbditos trabajando.
      </p>
    </div>
  );
}

// ── Nivel 3: pantalla temática de una zona ───────────────────────────────────

function Worker({ subject, role, index }: { subject: Subject; role: SubjectRole; index: number }) {
  const doing = subject.label || subject.subagentType || "trabajando…";
  return (
    <div className="flex flex-col items-center gap-2 max-w-[200px]">
      <div className="reino-worker-bubble rounded-lg px-3 py-2 text-center font-pixel text-[7px] leading-relaxed" style={{ maxWidth: 190 }} title={doing}>
        {doing}
      </div>
      <div className="anim-float" style={{ animationDelay: `${index * 0.4}s` }}>
        <Pixel name={ROLE_SPRITE[role]} scale={6} />
      </div>
      <span className="font-mono text-[7px] text-slate-400 truncate max-w-[160px]" title={subject.subagentType}>
        {subject.subagentType}
      </span>
    </div>
  );
}

function ZoneScreen({ run, role, onBack }: { run: IssueRun; role: SubjectRole; onBack: () => void }) {
  const meta = ROLE_META[role];
  const subjects = subjectsOf(run, role);
  const corners = [
    { top: 14, left: 18 },
    { top: 18, right: 22 },
    { bottom: "34%", left: 30 },
    { bottom: "34%", right: 34 },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="font-pixel text-[9px] px-3 py-2 rounded border border-neon-teal/40 text-neon-teal hover:bg-neon-teal/10 transition-colors">
          ← volver a la sala
        </button>
        <div className="text-right">
          <div className={`font-display text-xl ${meta.accent}`}>{meta.screen}</div>
          <div className="text-[11px] text-slate-500 font-mono">Castillo #{run.issue || "?"} · {subjects.length} súbdito(s)</div>
        </div>
      </div>

      <div className={`reino-screen ${meta.cls}`}>
        {meta.props.map((p, i) => (
          <div key={i} className="reino-prop anim-float" style={{ ...corners[i % corners.length], animationDelay: `${i * 0.6}s` }}>
            <Pixel name={p} scale={6} />
          </div>
        ))}
        <div className="reino-screen-floor" />
        <div className="absolute inset-x-0 z-10 flex items-end justify-center flex-wrap gap-x-10 gap-y-4 px-6" style={{ bottom: 24 }}>
          {subjects.length === 0 ? (
            <div className="text-center text-slate-400 text-sm font-pixel text-[9px] leading-relaxed pb-10">
              Nadie trabajando en {meta.screen.toLowerCase()} ahora mismo.
            </div>
          ) : (
            subjects.map((s, i) => <Worker key={i} subject={s} role={role} index={i} />)
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Cada súbdito muestra su tarea (la del subagente lanzado o la skill invocada). El dashboard ve el encargo, no los pasos internos del subagente.
      </p>
    </div>
  );
}

// ── Vista raíz ────────────────────────────────────────────────────────────────

export function ReinoView({ runs, github }: { runs: IssueRun[]; github: GithubStates }) {
  const active = useMemo(
    () => runs.filter((r) => issueStatus(r, github) === "active"),
    [runs, github]
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [openZone, setOpenZone] = useState<SubjectRole | null>(null);
  const openRun = openKey ? active.find((r) => keyOf(r) === openKey) ?? null : null;

  if (openRun && openZone) {
    return <ZoneScreen run={openRun} role={openZone} onBack={() => setOpenZone(null)} />;
  }
  if (openRun) {
    return (
      <ThroneRoom
        run={openRun}
        onBack={() => setOpenKey(null)}
        onEnterZone={(role) => setOpenZone(role)}
      />
    );
  }
  return <KingdomMap active={active} onEnter={(r) => { setOpenZone(null); setOpenKey(keyOf(r)); }} />;
}
