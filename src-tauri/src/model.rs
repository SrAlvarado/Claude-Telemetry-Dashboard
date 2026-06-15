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
            generated_at: String::new(),
        }
    }
}
