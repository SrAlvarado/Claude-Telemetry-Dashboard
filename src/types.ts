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

export type SubjectRole = "guardian" | "brain" | "scout" | "guide" | "worker";

export interface Subject {
  role: SubjectRole;
  label: string;
  subagentType: string;
}

export interface Kingdom {
  activity: string;
  subjects: Subject[];
  building: boolean;
}

export interface IssueRun {
  issue: string;
  args: string;
  branch: string;
  startedAt: string;
  sessionId: string;
  prUrl: string;
  core: Core;
  kingdom: Kingdom;
}

export interface PushEvent {
  timestamp: string;
  outcome: string; // pushed | pending | pass | fail | warning | merged | closed
  detail: string;
  branch: string;
}

export interface KeyVal {
  key: string;
  value: string;
}

export interface QaCheck {
  id: string;
  category: string;
  tool: string;
  status: string; // pass | warn | fail | skip
  blocking: boolean;
  score: number | null;
  threshold: number | null;
  details: string;
}

export interface QaReport {
  pr: number;
  issue: string;
  branch: string;
  status: string; // pass | warn | fail
  schemaVersion: string;
  generatedAt: string;
  blockingFailures: number;
  warnings: number;
  totalChecks: number;
  checks: QaCheck[];
  feedback: KeyVal[];
  inScope: boolean | null;
  scopeNotes: string;
}

// ── GitHub-backed status (resolved via the `gh` CLI) ─────────────────────────

export interface GithubIssueState {
  number: string;
  state: string; // OPEN | CLOSED
  title: string;
}

export interface GithubPrState {
  number: number;
  state: string; // OPEN | CLOSED | MERGED
  headRefName: string;
  title: string;
  url: string;
}

export interface GithubStates {
  repo: string;
  issues: GithubIssueState[];
  prs: GithubPrState[];
}

export const EMPTY_GITHUB_STATES: GithubStates = {
  repo: "",
  issues: [],
  prs: [],
};

export interface PrCheck {
  name: string;
  status: string;
  conclusion: string;
}

export interface PrDetail {
  number: number;
  title: string;
  state: string; // OPEN | CLOSED | MERGED
  url: string;
  body: string;
  reviewDecision: string;
  checks: PrCheck[];
}

export interface Metrics extends Core {
  runs: IssueRun[];
  pushEvents: PushEvent[];
  qaReports: QaReport[];
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
  pushEvents: [],
  qaReports: [],
  generatedAt: "",
};
