import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Flow } from "../types";

type Kind = "prompt" | "command" | "skill" | "pr" | "ci" | "merge";

const KIND_META: Record<Kind, { color: string; icon: string; ring: string }> = {
  prompt: { color: "#38bdf8", icon: "✦", ring: "rgba(56,189,248,0.55)" },
  command: { color: "#2dd4bf", icon: "›_", ring: "rgba(45,212,191,0.55)" },
  skill: { color: "#a78bfa", icon: "/", ring: "rgba(167,139,250,0.55)" },
  pr: { color: "#fbbf24", icon: "⇡", ring: "rgba(251,191,36,0.55)" },
  ci: { color: "#34d399", icon: "✓", ring: "rgba(52,211,153,0.55)" },
  merge: { color: "#34d399", icon: "⇄", ring: "rgba(52,211,153,0.55)" },
};

const COL_GAP = 220;
const ROW_Y = 160;

type PipelineData = {
  label: string;
  count: number;
  kind: Kind;
  active: boolean;
};

function PipelineNode({ data }: NodeProps<Node<PipelineData>>) {
  const meta = KIND_META[data.kind] ?? KIND_META.command;
  const { active } = data;
  return (
    <div
      className="relative flex flex-col items-center justify-center text-center transition-all"
      style={{
        width: 150,
        padding: "14px 10px",
        borderRadius: 14,
        background: active
          ? "linear-gradient(180deg, rgba(15,21,53,0.97), rgba(10,14,39,0.97))"
          : "rgba(15,21,53,0.6)",
        border: `1px solid ${active ? meta.ring : "rgba(148,163,184,0.18)"}`,
        boxShadow: active ? `0 0 22px ${meta.color}33, inset 0 0 12px ${meta.color}12` : "none",
        opacity: active ? 1 : 0.55,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: meta.color, border: "none", width: 7, height: 7, opacity: 0.8 }}
      />
      <span
        className="mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ background: `${meta.color}1f`, color: meta.color, border: `1px solid ${meta.ring}` }}
      >
        {meta.icon}
      </span>
      <div className="text-[10px] uppercase tracking-wide text-slate-300 leading-tight">
        {data.label}
      </div>
      <div className="font-display text-2xl leading-none mt-1" style={{ color: meta.color }}>
        {data.count}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: meta.color, border: "none", width: 7, height: 7, opacity: 0.8 }}
      />
    </div>
  );
}

const nodeTypes = { pipeline: PipelineNode };

export function FlowDiagram({ flow }: { flow: Flow }) {
  const { nodes, edges } = useMemo(() => {
    const activeById = new Map(flow.nodes.map((n) => [n.id, n.count > 0]));

    const nodes: Node<PipelineData>[] = flow.nodes.map((n, i) => ({
      id: n.id,
      type: "pipeline",
      position: { x: i * COL_GAP, y: ROW_Y },
      data: {
        label: n.label,
        count: n.count,
        kind: n.kind as Kind,
        active: n.count > 0,
      },
      draggable: false,
    }));

    const edges: Edge[] = flow.edges.map((e) => {
      // An edge "fired" only when both endpoints saw activity.
      const flowing = (activeById.get(e.source) ?? false) && (activeById.get(e.target) ?? false);
      const stroke = flowing ? "#2dd4bf" : "#33406a";
      return {
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        animated: flowing,
        style: { stroke, strokeWidth: flowing ? 2 : 1.25, opacity: flowing ? 0.85 : 0.45 },
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 },
      };
    });

    return { nodes, edges };
  }, [flow]);

  return (
    <div className="card" style={{ height: 360 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
      >
        <Background color="#1e2a5a" gap={26} size={1} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
