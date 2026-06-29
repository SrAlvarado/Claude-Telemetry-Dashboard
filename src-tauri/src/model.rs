//! Serializable metrics returned to the frontend.

use serde::Serialize;

#[derive(Serialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub total_prompts: u64,
    pub total_commands: u64,
    pub commands_success: u64,
    pub commands_failed: u64,
    pub total_input_tokens: u64,
    pub total_output_tokens: u64,
    pub total_cache_tokens: u64,
    pub sessions: u64,
    pub avg_output_tokens_per_prompt: u64,
    /// Exit≠0 that are expected (grep no-match, `git diff --quiet`, test probes).
    pub benign_failures: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TokenPoint {
    pub ts: String,
    pub input: u64,
    pub output: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CommandPoint {
    pub ts: String,
    pub success: u64,
    pub failed: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Counted {
    pub label: String,
    pub count: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Failure {
    pub command: String,
    pub reason: String,
    pub ts: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FlowNode {
    pub id: String,
    pub label: String,
    pub count: u64,
    /// One of: prompt | command | skill | pr | ci | merge
    pub kind: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FlowEdge {
    pub source: String,
    pub target: String,
}

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Flow {
    pub nodes: Vec<FlowNode>,
    pub edges: Vec<FlowEdge>,
}

/// A push/CI event from the orchestrator (.claude/telemetry/push-events.jsonl).
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct PushEvent {
    pub timestamp: String,
    /// pushed | pending | pass | fail | warning | merged | closed
    pub outcome: String,
    pub detail: String,
    pub branch: String,
}

/// A key/value pair (QA feedback answers, order-preserving).
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct KeyVal {
    pub key: String,
    pub value: String,
}

/// One check inside a QA report. Carries every field the gate emits so the UI
/// can render the full report rather than a truncated view.
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct QaCheck {
    pub id: String,
    pub category: String,
    pub tool: String,
    pub status: String,
    pub blocking: bool,
    pub score: Option<f64>,
    pub threshold: Option<f64>,
    pub details: String,
}

/// A QA report emitted per PR by qa_report.py (.claude/qa-reports/pr-*.json).
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct QaReport {
    pub pr: i64,
    pub issue: String,
    pub branch: String,
    pub status: String,
    pub schema_version: String,
    pub generated_at: String,
    pub blocking_failures: u64,
    pub warnings: u64,
    pub total_checks: u64,
    pub checks: Vec<QaCheck>,
    pub feedback: Vec<KeyVal>,
    pub in_scope: Option<bool>,
    pub scope_notes: String,
}

// ── GitHub-backed status (resolved via the `gh` CLI) ─────────────────────────

/// State of one issue on GitHub (OPEN | CLOSED).
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct GithubIssueState {
    pub number: String,
    pub state: String,
    pub title: String,
}

/// State of one pull request on GitHub (OPEN | CLOSED | MERGED).
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct GithubPrState {
    pub number: i64,
    pub state: String,
    pub head_ref_name: String,
    pub title: String,
    pub url: String,
}

/// Authoritative open/closed state pulled from GitHub for the resolved repo.
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct GithubStates {
    pub repo: String,
    pub issues: Vec<GithubIssueState>,
    pub prs: Vec<GithubPrState>,
}

/// One CI / status check on a pull request.
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct PrCheck {
    pub name: String,
    pub status: String,
    pub conclusion: String,
}

/// Live detail of a pull request (title, state, CI checks, review decision).
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct PrDetail {
    pub number: i64,
    pub title: String,
    pub state: String,
    pub url: String,
    pub body: String,
    pub review_decision: String,
    pub checks: Vec<PrCheck>,
}

/// Everything the dashboard renders for a single scope (global or one run).
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Core {
    pub summary: Summary,
    pub tokens_timeline: Vec<TokenPoint>,
    pub commands_timeline: Vec<CommandPoint>,
    pub top_prompts: Vec<Counted>,
    pub top_commands: Vec<Counted>,
    pub failures: Vec<Failure>,
    pub flow: Flow,
}

/// A subject of the kingdom — a subagent spawned within a run, themed by role.
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Subject {
    /// guardian | brain | scout | guide | worker
    pub role: String,
    /// Human label (the subagent's description).
    pub label: String,
    /// Raw subagent_type from the Agent tool.
    pub subagent_type: String,
}

/// The gamified view of a run: the PR agent as king, its subagents as subjects.
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Kingdom {
    /// Short phrase (≤10 words) describing the latest activity in the run.
    pub activity: String,
    /// Subagents spawned within the run, newest first.
    pub subjects: Vec<Subject>,
    /// True hasta que el run hace trabajo real (picar código o lanzar un
    /// subagente): el castillo aparece "en obras" hasta entonces.
    pub building: bool,
}

/// A single /start-issue execution, with its own full dashboard (`core`).
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IssueRun {
    /// Issue number/identifier parsed from the /start-issue args.
    pub issue: String,
    /// Raw args passed to /start-issue.
    pub args: String,
    pub branch: String,
    pub started_at: String,
    pub session_id: String,
    pub pr_url: String,
    pub core: Core,
    pub kingdom: Kingdom,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Metrics {
    pub summary: Summary,
    pub tokens_timeline: Vec<TokenPoint>,
    pub commands_timeline: Vec<CommandPoint>,
    pub top_prompts: Vec<Counted>,
    pub top_commands: Vec<Counted>,
    pub failures: Vec<Failure>,
    pub flow: Flow,
    pub runs: Vec<IssueRun>,
    pub push_events: Vec<PushEvent>,
    pub qa_reports: Vec<QaReport>,
    pub generated_at: String,
}

impl Default for Metrics {
    fn default() -> Self {
        Metrics {
            summary: Summary::default(),
            tokens_timeline: Vec::new(),
            commands_timeline: Vec::new(),
            top_prompts: Vec::new(),
            top_commands: Vec::new(),
            failures: Vec::new(),
            flow: Flow::default(),
            runs: Vec::new(),
            push_events: Vec::new(),
            qa_reports: Vec::new(),
            generated_at: String::new(),
        }
    }
}
