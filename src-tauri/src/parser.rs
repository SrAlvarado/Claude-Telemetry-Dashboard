//! Reads Claude Code telemetry from two sources and aggregates the dashboard
//! metrics, both globally and per /start-issue run:
//!   1. Hook events:   <project>/.claude/telemetry/events-*.jsonl
//!   2. Transcripts:   ~/.claude/projects/<encoded-project-path>/*.jsonl
//!
//! Everything is best-effort: malformed lines are skipped and missing fields are
//! tolerated, so the dashboard degrades gracefully rather than failing.

use crate::model::*;
use chrono::Utc;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

const TOP_N: usize = 12;
const MAX_FAILURES: usize = 80;

// ── Path resolution ──────────────────────────────────────────────────────────

/// Resolve the project root: env var, then the persisted selection, then the
/// nearest ancestor of CWD containing `.claude/telemetry`.
pub fn resolve_project_dir() -> PathBuf {
    if let Ok(env) = std::env::var("CLAUDE_TELEMETRY_PROJECT") {
        return PathBuf::from(env);
    }
    // Persisted selection — survives GUI/Finder launches that don't inherit the
    // shell env (a bare launch would otherwise resolve to the home dir).
    if let Some(dir) = read_persisted_project_dir() {
        return dir;
    }
    let start = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let mut dir = start.as_path();
    loop {
        if dir.join(".claude").join("telemetry").is_dir() {
            return dir.to_path_buf();
        }
        match dir.parent() {
            Some(p) => dir = p,
            None => break,
        }
    }
    start
}

/// `<config-dir>/claude-telemetry-dashboard/config.json`
/// (on macOS: `~/Library/Application Support/claude-telemetry-dashboard/config.json`).
fn config_file_path() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("claude-telemetry-dashboard").join("config.json"))
}

/// Read the persisted `projectDir`, but only if it still points at a telemetry
/// project (otherwise fall through to CWD resolution).
fn read_persisted_project_dir() -> Option<PathBuf> {
    let text = std::fs::read_to_string(config_file_path()?).ok()?;
    let value: Value = serde_json::from_str(&text).ok()?;
    let dir = PathBuf::from(value.get("projectDir")?.as_str()?);
    dir.join(".claude").join("telemetry").is_dir().then_some(dir)
}

fn encode_project_path(project_dir: &Path) -> String {
    project_dir
        .to_string_lossy()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect()
}

fn transcript_dir(project_dir: &Path) -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    Some(
        home.join(".claude")
            .join("projects")
            .join(encode_project_path(project_dir)),
    )
}

// ── Small helpers ──────────────────────────────────────────────────────────

fn read_lines(path: &Path) -> Vec<Value> {
    std::fs::read_to_string(path)
        .map(|content| {
            content
                .lines()
                .filter_map(|l| {
                    let l = l.trim();
                    if l.is_empty() {
                        None
                    } else {
                        serde_json::from_str::<Value>(l).ok()
                    }
                })
                .collect()
        })
        .unwrap_or_default()
}

// ── QA reports & push events (the two new dashboard sections) ────────────────

fn str_field(v: &Value, key: &str) -> String {
    v.get(key).and_then(|x| x.as_str()).unwrap_or("").to_string()
}

/// Read .claude/telemetry/push-events.jsonl (single-line JSONL), newest first.
fn collect_push_events(project_dir: &Path) -> Vec<PushEvent> {
    let path = project_dir
        .join(".claude")
        .join("telemetry")
        .join("push-events.jsonl");
    let mut events: Vec<PushEvent> = read_lines(&path)
        .iter()
        .map(|v| PushEvent {
            timestamp: str_field(v, "timestamp"),
            outcome: str_field(v, "outcome"),
            detail: str_field(v, "detail"),
            branch: str_field(v, "branch"),
        })
        .collect();
    events.reverse();
    events
}

fn parse_qa_report(v: &Value) -> QaReport {
    let summary = v.get("summary").cloned().unwrap_or_default();
    let scope = v.get("scope").cloned().unwrap_or_default();
    let feedback_obj = v.get("feedback").cloned().unwrap_or_default();
    let feedback = ["platforms", "use_cases", "user_journey", "target_audience", "requirements"]
        .iter()
        .filter_map(|k| {
            let value = feedback_obj.get(*k).and_then(|x| x.as_str()).unwrap_or("");
            if value.is_empty() {
                None
            } else {
                Some(KeyVal { key: (*k).to_string(), value: value.to_string() })
            }
        })
        .collect();
    let checks = v
        .get("checks")
        .and_then(|c| c.as_array())
        .map(|arr| {
            arr.iter()
                .map(|c| QaCheck {
                    id: str_field(c, "id"),
                    category: str_field(c, "category"),
                    status: str_field(c, "status"),
                    blocking: c.get("blocking").and_then(|b| b.as_bool()).unwrap_or(false),
                    details: str_field(c, "details"),
                })
                .collect()
        })
        .unwrap_or_default();
    QaReport {
        pr: v.get("pr").and_then(|x| x.as_i64()).unwrap_or(0),
        branch: str_field(v, "branch"),
        status: str_field(v, "status"),
        generated_at: str_field(v, "generated_at"),
        blocking_failures: summary.get("blocking_failures").and_then(|x| x.as_u64()).unwrap_or(0),
        warnings: summary.get("warnings").and_then(|x| x.as_u64()).unwrap_or(0),
        checks,
        feedback,
        in_scope: scope.get("in_scope").and_then(|x| x.as_bool()),
        scope_notes: str_field(&scope, "notes"),
    }
}

/// Read .claude/qa-reports/pr-*.json (one JSON object per file), newest PR first.
fn collect_qa_reports(project_dir: &Path) -> Vec<QaReport> {
    let pattern = format!(
        "{}/.claude/qa-reports/pr-*.json",
        project_dir.to_string_lossy()
    );
    let mut reports: Vec<QaReport> = Vec::new();
    if let Ok(paths) = glob::glob(&pattern) {
        for path in paths.flatten() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(v) = serde_json::from_str::<Value>(&content) {
                    reports.push(parse_qa_report(&v));
                }
            }
        }
    }
    reports.sort_by(|a, b| b.pr.cmp(&a.pr));
    reports
}

fn hour_bucket(ts: &str) -> String {
    if ts.len() >= 13 {
        format!("{} {}:00", &ts[0..10], &ts[11..13])
    } else {
        ts.to_string()
    }
}

fn truncate(s: &str, max: usize) -> String {
    let s = s.trim();
    if s.chars().count() <= max {
        s.to_string()
    } else {
        let cut: String = s.chars().take(max).collect();
        format!("{}…", cut)
    }
}

fn text_from_content(content: &Value) -> String {
    match content {
        Value::String(s) => s.clone(),
        Value::Array(blocks) => blocks
            .iter()
            .filter_map(|b| b.get("text").and_then(|t| t.as_str()))
            .collect::<Vec<_>>()
            .join(" "),
        _ => String::new(),
    }
}

fn is_real_prompt(text: &str) -> bool {
    let t = text.trim();
    if t.is_empty() {
        return false;
    }
    let skip = [
        "<",
        "Caveat:",
        "[Request interrupted",
        "Result of calling",
        "API Error",
        "This session is being continued",
    ];
    !skip.iter().any(|p| t.starts_with(p))
}

struct Counter {
    map: HashMap<String, (String, u64)>,
}
impl Counter {
    fn new() -> Self {
        Counter { map: HashMap::new() }
    }
    fn add(&mut self, display: String) {
        let key = display.trim().to_lowercase();
        let e = self.map.entry(key).or_insert((display.clone(), 0));
        e.1 += 1;
    }
    fn top(&self, n: usize) -> Vec<Counted> {
        let mut v: Vec<Counted> = self
            .map
            .values()
            .map(|(label, count)| Counted {
                label: truncate(label, 90),
                count: *count,
            })
            .collect();
        v.sort_by(|a, b| b.count.cmp(&a.count).then(a.label.cmp(&b.label)));
        v.truncate(n);
        v
    }
}

/// Not a real command error: either an *expected* non-zero exit (grep/rg with no
/// match, `git diff --quiet`/`--exit-code`, `test`/`[`) or a *policy* outcome
/// (blocked by a guardrail hook, rejected by the user, or a permission prompt) —
/// in those cases the command never actually ran and failed.
fn is_benign_failure(cmd: &str, reason: &str) -> bool {
    let prog = cmd.trim_start().split_whitespace().next().unwrap_or("");
    let exit1 = reason.contains("Exit code 1") || reason.trim().is_empty();
    let greplike = matches!(prog, "grep" | "rg" | "egrep" | "fgrep" | "ag");
    let expected_exit = (greplike && exit1)
        || matches!(prog, "test" | "[")
        || cmd.contains("--quiet")
        || cmd.contains("--exit-code");
    let policy = reason.contains("bloqueado por hook")
        || reason.contains("doesn't want to proceed")
        || reason.contains("was rejected")
        || reason.contains("Permission to use Bash")
        || reason.contains("permission settings");
    expected_exit || policy
}

fn record_branch(obj: &Value) -> String {
    obj.get("gitBranch")
        .and_then(|b| b.as_str())
        .unwrap_or("")
        .to_string()
}

// ── Core builder (optionally scoped to one branch) ─────────────────────────

/// Build the full metric set, optionally restricted to records on `filter`
/// branch. `branch_pr` maps branch -> PR url; `pr_total` is the global distinct
/// PR count used when `filter` is None.
fn build_core(
    records: &[Value],
    events: &[Value],
    filter: Option<&str>,
    branch_pr: &HashMap<String, String>,
    pr_total: u64,
) -> Core {
    let mut core = Core::default();
    let matches = |branch: &str| -> bool { filter.map_or(true, |f| f == branch) };

    let mut prompt_counter = Counter::new();
    let mut command_counter = Counter::new();
    let mut sessions: HashSet<String> = HashSet::new();
    let mut token_buckets: HashMap<String, (u64, u64)> = HashMap::new();
    let mut command_buckets: HashMap<String, (u64, u64)> = HashMap::new();
    let mut pending_cmds: HashMap<String, (String, String)> = HashMap::new(); // id -> (cmd, ts)
    let mut failed_ids: HashSet<String> = HashSet::new();
    let mut benign_failures: u64 = 0;

    for obj in records {
        let branch = record_branch(obj);
        let ts = obj
            .get("timestamp")
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .to_string();
        let in_scope = matches(&branch);
        if in_scope {
            if let Some(sid) = obj.get("sessionId").and_then(|s| s.as_str()) {
                sessions.insert(sid.to_string());
            }
        }
        match obj.get("type").and_then(|t| t.as_str()) {
            Some("user") => {
                let content = obj.get("message").and_then(|m| m.get("content"));
                let is_meta = obj.get("isMeta").and_then(|b| b.as_bool()).unwrap_or(false);
                if let Some(content) = content {
                    if let Value::Array(blocks) = content {
                        for b in blocks {
                            if b.get("type").and_then(|t| t.as_str()) == Some("tool_result") {
                                let is_err =
                                    b.get("is_error").and_then(|e| e.as_bool()).unwrap_or(false);
                                if let Some(id) = b.get("tool_use_id").and_then(|i| i.as_str()) {
                                    // Only act on commands we actually counted (in scope).
                                    if let Some((cmd, cts)) = pending_cmds.get(id).cloned() {
                                        if is_err {
                                            let reason = text_from_content(
                                                b.get("content").unwrap_or(&Value::Null),
                                            );
                                            if is_benign_failure(&cmd, &reason) {
                                                benign_failures += 1;
                                            } else {
                                                failed_ids.insert(id.to_string());
                                                if core.failures.len() < MAX_FAILURES {
                                                    core.failures.push(Failure {
                                                        command: truncate(&cmd, 100),
                                                        reason: truncate(&reason, 280),
                                                        ts: cts,
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if in_scope && !is_meta {
                        if let Value::String(s) = content {
                            if is_real_prompt(s) {
                                core.summary.total_prompts += 1;
                                prompt_counter.add(truncate(s, 120));
                            }
                        }
                    }
                }
            }
            Some("assistant") => {
                if let Some(msg) = obj.get("message") {
                    if in_scope {
                        if let Some(usage) = msg.get("usage") {
                            let inp = usage.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0);
                            let out =
                                usage.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0);
                            let cache = usage
                                .get("cache_read_input_tokens")
                                .and_then(|v| v.as_u64())
                                .unwrap_or(0)
                                + usage
                                    .get("cache_creation_input_tokens")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(0);
                            core.summary.total_input_tokens += inp;
                            core.summary.total_output_tokens += out;
                            core.summary.total_cache_tokens += cache;
                            if !ts.is_empty() && (inp > 0 || out > 0) {
                                let e = token_buckets.entry(hour_bucket(&ts)).or_insert((0, 0));
                                e.0 += inp;
                                e.1 += out;
                            }
                        }
                    }
                    if let Some(Value::Array(blocks)) = msg.get("content") {
                        for b in blocks {
                            if b.get("type").and_then(|t| t.as_str()) != Some("tool_use") {
                                continue;
                            }
                            let tool = b.get("name").and_then(|n| n.as_str()).unwrap_or("");
                            if tool == "Bash" && in_scope {
                                let cmd = b
                                    .get("input")
                                    .and_then(|i| i.get("command"))
                                    .and_then(|c| c.as_str())
                                    .unwrap_or("")
                                    .to_string();
                                if cmd.is_empty() {
                                    continue;
                                }
                                core.summary.total_commands += 1;
                                command_counter.add(cmd.clone());
                                if let Some(id) = b.get("id").and_then(|i| i.as_str()) {
                                    pending_cmds.insert(id.to_string(), (cmd.clone(), ts.clone()));
                                    let e = command_buckets
                                        .entry(hour_bucket(&ts))
                                        .or_insert((0, 0));
                                    e.0 += 1; // optimistic; corrected below for failures
                                }
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    // Correct command buckets: move failed commands from success to failed.
    for (id, (_cmd, ts)) in &pending_cmds {
        if failed_ids.contains(id) && !ts.is_empty() {
            let e = command_buckets.entry(hour_bucket(ts)).or_insert((0, 0));
            if e.0 > 0 {
                e.0 -= 1;
            }
            e.1 += 1;
        }
    }

    core.summary.commands_failed = failed_ids.len() as u64;
    core.summary.benign_failures = benign_failures;
    core.summary.commands_success = core
        .summary
        .total_commands
        .saturating_sub(core.summary.commands_failed);
    core.summary.sessions = sessions.len() as u64;
    core.summary.avg_output_tokens_per_prompt = if core.summary.total_prompts > 0 {
        core.summary.total_output_tokens / core.summary.total_prompts
    } else {
        0
    };

    // Events: skills + denied/blocked commands (events carry their own branch).
    let mut skill_counts: HashMap<String, u64> = HashMap::new();
    for obj in events {
        let branch = obj.get("branch").and_then(|b| b.as_str()).unwrap_or("");
        if !matches(branch) {
            continue;
        }
        let event = obj.get("event").and_then(|e| e.as_str()).unwrap_or("");
        let outcome = obj.get("outcome").and_then(|o| o.as_str()).unwrap_or("");
        let details = obj.get("details").and_then(|d| d.as_str()).unwrap_or("");
        let ts = obj
            .get("timestamp")
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .to_string();
        if event == "skill-invocation" && details.starts_with('/') {
            *skill_counts.entry(details.to_string()).or_insert(0) += 1;
        }
        if matches!(outcome, "warning" | "denied") && core.failures.len() < MAX_FAILURES {
            core.failures.push(Failure {
                command: format!("{} {}", event, details).trim().to_string(),
                reason: format!("hook outcome: {}", outcome),
                ts,
            });
        }
    }

    // Timelines (sorted chronologically).
    let mut tk: Vec<TokenPoint> = token_buckets
        .into_iter()
        .map(|(ts, (input, output))| TokenPoint { ts, input, output })
        .collect();
    tk.sort_by(|a, b| a.ts.cmp(&b.ts));
    core.tokens_timeline = tk;

    let mut ck: Vec<CommandPoint> = command_buckets
        .into_iter()
        .map(|(ts, (success, failed))| CommandPoint { ts, success, failed })
        .collect();
    ck.sort_by(|a, b| a.ts.cmp(&b.ts));
    core.commands_timeline = ck;

    core.top_prompts = prompt_counter.top(TOP_N);
    core.top_commands = command_counter.top(TOP_N);
    core.failures.sort_by(|a, b| b.ts.cmp(&a.ts));

    // Flow: Claude pipeline up to PR merge.
    let pr_count = match filter {
        Some(b) => {
            if branch_pr.contains_key(b) {
                1
            } else {
                0
            }
        }
        None => pr_total,
    };
    let skill = |name: &str| -> u64 { *skill_counts.get(name).unwrap_or(&0) };
    // A run always represents one /start-issue, even when hook events are sparse.
    let start_issue = if filter.is_some() {
        skill("/start-issue").max(1)
    } else {
        skill("/start-issue")
    };
    let stages: Vec<(&str, &str, &str, u64)> = vec![
        ("prompt", "Prompt usuario", "prompt", core.summary.total_prompts),
        ("commands", "Comandos Claude", "command", core.summary.total_commands),
        ("start-issue", "/start-issue", "skill", start_issue),
        ("test-gen", "/test-gen", "skill", skill("/test-gen")),
        ("commit", "/commit", "skill", skill("/commit")),
        ("create-pr", "/create-pr", "skill", skill("/create-pr")),
        ("pr", "PR creada", "pr", pr_count),
        ("pr-review", "/pr-review", "skill", skill("/pr-review")),
        ("merge", "Merge", "merge", pr_count),
    ];
    for (id, label, kind, count) in &stages {
        core.flow.nodes.push(FlowNode {
            id: id.to_string(),
            label: label.to_string(),
            count: *count,
            kind: kind.to_string(),
        });
    }
    for w in stages.windows(2) {
        core.flow.edges.push(FlowEdge {
            source: w[0].0.to_string(),
            target: w[1].0.to_string(),
        });
    }

    core
}

// ── Public entry point ─────────────────────────────────────────────────────

struct RawRun {
    issue: String,
    args: String,
    branch: String,
    started_at: String,
    session_id: String,
}

pub fn collect(project_dir: &Path) -> Metrics {
    // Load all records and events once.
    let mut records: Vec<Value> = Vec::new();
    let mut session_branch: HashMap<String, String> = HashMap::new();
    let mut branch_pr: HashMap<String, String> = HashMap::new();
    let mut pr_urls: HashSet<String> = HashSet::new();
    let mut raw_runs: Vec<RawRun> = Vec::new();
    let mut branches_seen: HashSet<String> = HashSet::new();

    if let Some(tdir) = transcript_dir(project_dir) {
        let pattern = format!("{}/*.jsonl", tdir.to_string_lossy());
        if let Ok(paths) = glob::glob(&pattern) {
            for path in paths.flatten() {
                for obj in read_lines(&path) {
                    let branch = record_branch(&obj);
                    let sid = obj
                        .get("sessionId")
                        .and_then(|s| s.as_str())
                        .unwrap_or("")
                        .to_string();
                    if !branch.is_empty() {
                        branches_seen.insert(branch.clone());
                        if !sid.is_empty() {
                            session_branch.insert(sid.clone(), branch.clone());
                        }
                    }
                    let kind = obj.get("type").and_then(|t| t.as_str()).unwrap_or("");
                    if kind == "pr-link" {
                        let url = obj
                            .get("prUrl")
                            .and_then(|u| u.as_str())
                            .unwrap_or("")
                            .to_string();
                        if !url.is_empty() {
                            pr_urls.insert(url.clone());
                            if let Some(br) = session_branch.get(&sid) {
                                branch_pr.insert(br.clone(), url.clone());
                            }
                        }
                    } else if kind == "assistant" {
                        // Detect /start-issue invocations.
                        if let Some(Value::Array(blocks)) =
                            obj.get("message").and_then(|m| m.get("content"))
                        {
                            for b in blocks {
                                if b.get("type").and_then(|t| t.as_str()) == Some("tool_use")
                                    && b.get("name").and_then(|n| n.as_str()) == Some("Skill")
                                    && b.get("input")
                                        .and_then(|i| i.get("skill"))
                                        .and_then(|s| s.as_str())
                                        == Some("start-issue")
                                {
                                    let args = b
                                        .get("input")
                                        .and_then(|i| i.get("args"))
                                        .and_then(|a| a.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    raw_runs.push(RawRun {
                                        issue: args
                                            .split_whitespace()
                                            .next()
                                            .unwrap_or("")
                                            .to_string(),
                                        args,
                                        branch: branch.clone(),
                                        started_at: obj
                                            .get("timestamp")
                                            .and_then(|t| t.as_str())
                                            .unwrap_or("")
                                            .to_string(),
                                        session_id: sid.clone(),
                                    });
                                }
                            }
                        }
                    }
                    records.push(obj);
                }
            }
        }
    }

    let mut events: Vec<Value> = Vec::new();
    let events_pattern = format!(
        "{}/.claude/telemetry/events-*.jsonl",
        project_dir.to_string_lossy()
    );
    if let Ok(paths) = glob::glob(&events_pattern) {
        for path in paths.flatten() {
            events.extend(read_lines(&path));
        }
    }

    let pr_total = pr_urls.len() as u64;

    // Global dashboard.
    let global = build_core(&records, &events, None, &branch_pr, pr_total);

    // Resolve the real branch for an issue (/start-issue records its pre-branch).
    let resolve_branch = |issue: &str, captured: &str| -> String {
        if !issue.is_empty() {
            for b in &branches_seen {
                if let Some(after) = b.split('/').nth(1) {
                    if after.split('-').next() == Some(issue) {
                        return b.clone();
                    }
                }
            }
        }
        captured.to_string()
    };

    // Per-run dashboards.
    let mut runs: Vec<IssueRun> = Vec::new();
    let mut seen_runs: HashSet<String> = HashSet::new();
    for r in &raw_runs {
        let branch = resolve_branch(&r.issue, &r.branch);
        let dedup_key = format!("{}|{}", r.issue, branch);
        if !seen_runs.insert(dedup_key) {
            continue; // collapse repeated /start-issue for the same issue+branch
        }
        let core = build_core(&records, &events, Some(&branch), &branch_pr, pr_total);
        runs.push(IssueRun {
            issue: r.issue.clone(),
            args: r.args.clone(),
            branch: branch.clone(),
            started_at: r.started_at.clone(),
            session_id: r.session_id.clone(),
            pr_url: branch_pr.get(&branch).cloned().unwrap_or_default(),
            core,
        });
    }
    runs.sort_by(|a, b| b.started_at.cmp(&a.started_at));

    Metrics {
        summary: global.summary,
        tokens_timeline: global.tokens_timeline,
        commands_timeline: global.commands_timeline,
        top_prompts: global.top_prompts,
        top_commands: global.top_commands,
        failures: global.failures,
        flow: global.flow,
        runs,
        push_events: collect_push_events(project_dir),
        qa_reports: collect_qa_reports(project_dir),
        generated_at: Utc::now().to_rfc3339(),
    }
}
