// Mirrors the Rust `model.rs` structs (serde camelCase).

export interface Summary {
  totalPrompts: number;
  totalCommands: number;
  commandsSuccess: number;
  commandsFailed: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheTokens: number;
  sessions: number;
  avgOutputTokensPerPrompt: number;
  benignFailures: number;
}

export interface TokenPoint {
  ts: string;
  input: number;
  output: number;
}

export interface CommandPoint {
  ts: string;
  success: number;
  failed: number;
}

export interface Counted {
  label: string;
  count: number;
}

export interface Failure {
  command: string;
  reason: string;
  ts: string;
}

export interface FlowNode {
  id: string;
  label: string;
  count: number;
  kind: "prompt" | "command" | "skill" | "pr" | "ci" | "merge";
}

export interface FlowEdge {
  source: string;
  target: string;
}

export interface Flow {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface Core {
  summary: Summary;
  tokensTimeline: TokenPoint[];
  commandsTimeline: CommandPoint[];
  topPrompts: Counted[];
  topCommands: Counted[];
  failures: Failure[];
  flow: Flow;
}

export interface IssueRun {
  issue: string;
  args: string;
  branch: string;
  startedAt: string;
  sessionId: string;
  prUrl: string;
  core: Core;
}

export interface Metrics extends Core {
  runs: IssueRun[];
  generatedAt: string;
}

export const EMPTY_METRICS: Metrics = {
  summary: {
    totalPrompts: 0,
    totalCommands: 0,
    commandsSuccess: 0,
    commandsFailed: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheTokens: 0,
    sessions: 0,
    avgOutputTokensPerPrompt: 0,
    benignFailures: 0,
  },
  tokensTimeline: [],
  commandsTimeline: [],
  topPrompts: [],
  topCommands: [],
  failures: [],
  flow: { nodes: [], edges: [] },
  runs: [],
  generatedAt: "",
};
