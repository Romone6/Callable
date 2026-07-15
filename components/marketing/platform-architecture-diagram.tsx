"use client";

import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";

const nodes: Node[] = [
  { id: "sources", position: { x: 20, y: 80 }, data: { label: "Existing Software" }, type: "input" },
  { id: "discovery", position: { x: 260, y: 80 }, data: { label: "Workflow Discovery" } },
  { id: "commands", position: { x: 500, y: 80 }, data: { label: "Command Schema" } },
  { id: "gateway", position: { x: 740, y: 80 }, data: { label: "MCP / API" } },
  { id: "agents", position: { x: 980, y: 80 }, data: { label: "AI Agents" }, type: "output" },
];

const edges: Edge[] = [
  { id: "e1", source: "sources", target: "discovery", animated: true },
  { id: "e2", source: "discovery", target: "commands", animated: true },
  { id: "e3", source: "commands", target: "gateway", animated: true },
  { id: "e4", source: "gateway", target: "agents", animated: true },
];

export function PlatformArchitectureDiagram() {
  return (
    <div className="h-[260px] w-full rounded-2xl border border-[var(--border-strong)] bg-black/25">
      <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} zoomOnScroll={false}>
        <Background color="#355648" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

