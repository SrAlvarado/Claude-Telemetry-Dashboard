# Claude Telemetry Dashboard

App de escritorio (Tauri 2.0) que lee la telemetría de Claude Code de este
proyecto y la muestra en un dashboard en vivo, con el estilo neón de monitoreo.

## Qué muestra

- **Métricas**: prompts recolectados, comandos ejecutados, exitosos/fallidos,
  tokens input/output (+ cache), media de tokens por prompt, sesiones.
- **Gráficos**: tokens en el tiempo y comandos exitosos/fallidos por hora.
- **Comandos fallidos**: tabla con el comando y la causa del fallo.
- **Comandos / Prompts más repetidos**.
- **Flujo de ejecución**: diagrama Claude → comandos → skills → PR → merge.

Refresco **en vivo**: un file watcher en Rust vigila los `.jsonl` y reemite las
métricas al frontend cuando Claude trabaja.

## Fuentes de datos

1. Hooks: `<proyecto>/.claude/telemetry/events-*.jsonl`
2. Transcripts: `~/.claude/projects/<ruta-proyecto-codificada>/*.jsonl`

El proyecto a monitorizar se indica con la variable de entorno
**`CLAUDE_TELEMETRY_PROJECT`** (ruta absoluta a la raíz del repo que tiene
`.claude/telemetry`). Si no se define, la app busca hacia arriba desde el
directorio actual el primer `.claude/telemetry` — útil solo si la app vive
dentro del propio proyecto.

## Requisitos

- Node 18+ y npm
- Rust (rustup) — `cargo --version`
- macOS: Xcode Command Line Tools

## Puesta en marcha

```bash
npm install

# Apunta la app al proyecto que quieres monitorizar:
export CLAUDE_TELEMETRY_PROJECT=/ruta/absoluta/a/tu/proyecto

# (opcional) regenerar el set completo de iconos, incluido .icns/.ico para bundling:
npm run tauri icon app-icon.png

# desarrollo (abre la ventana nativa con hot-reload)
npm run tauri dev

# build de producción (.app / .dmg en macOS)
npm run tauri build
```

## Estructura

```
src/                 Frontend React + TS (Vite, Tailwind, ECharts, React Flow)
  hooks/useTelemetry  invoca get_metrics + escucha telemetry-updated
  components/          cards, charts, listas, tabla de fallos, diagrama de flujo, dashboard
  views/               RunDetailView (detalle por /start-issue)
src-tauri/           Backend Rust (Tauri 2)
  src/parser.rs        lee y agrega las dos fuentes en `Metrics`
  src/watcher.rs       notify-debouncer → emite telemetry-updated
  src/model.rs         structs serializables (serde camelCase)
  src/lib.rs           comandos Tauri get_metrics / get_project_dir
```
