import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Flow } from "../types";

const KIND_COLOR: Record<string, string> = {
  prompt: "#38bdf8",
  command: "#2dd4bf",
  skill: "#a78bfa",
  pr: "#fbbf24",
  ci: "#34d399",
  merge: "#34d399",
};

export function FlowDiagram({ flow }: { flow: Flow }) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = flow.nodes.map((n, i) => {
      const color = KIND_COLOR[n.kind] ?? "#2dd4bf";
      const dim = n.count === 0;
      return {
        id: n.id,
        position: { x: 80 + i * 200, y: 120 + (i % 2 === 0 ? 0 : 90) },
        data: {
          label: (
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-wide text-slate-300">
                {n.label}
              </div>
              <div
                className="font-display text-xl"
                style={{ color }}
              >
                {n.count}
              </div>
            </div>
          ),
        },
        style: {
          background: "rgba(15,21,53,0.95)",
          border: `1px solid ${color}${dim ? "30" : "aa"}`,
          borderRadius: 12,
          padding: 8,
          width: 150,
          opacity: dim ? 0.5 : 1,
          boxShadow: dim ? "none" : `0 0 16px ${color}33`,
        },
      };
    });
    const edges: Edge[] = flow.edges.map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: true,
      style: { stroke: "#2dd4bf66", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#2dd4bf" },
    }));
    return { nodes, edges };
  }, [flow]);

  return (
    <div className="card" style={{ height: 520 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#1e2a5a" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
