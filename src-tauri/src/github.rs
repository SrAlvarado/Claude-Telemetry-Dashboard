//! GitHub-backed status via the `gh` CLI.
//!
//! The local telemetry log only knows about events it captured, so issues
//! closed elsewhere kept showing as "active". GitHub is the source of truth:
//! we shell out to `gh` to learn each issue/PR's real open/closed state.
//!
//! Everything is best-effort: if `gh` is missing, unauthenticated, or offline,
//! the commands return empty results and the UI degrades gracefully.

use crate::model::*;
use serde_json::Value;
use std::path::Path;
use std::process::Command;

const FALLBACK_REPO: &str = "Ferrisolutions/pedallingprosystem";

fn sf(v: &Value, key: &str) -> String {
    v.get(key).and_then(|x| x.as_str()).unwrap_or("").to_string()
}

/// Resolve `owner/repo` from the project's `origin` remote, with a fallback.
pub fn resolve_repo(project_dir: &Path) -> String {
    git_origin(project_dir)
        .as_deref()
        .and_then(parse_repo_slug)
        .unwrap_or_else(|| FALLBACK_REPO.to_string())
}

fn git_origin(project_dir: &Path) -> Option<String> {
    let out = Command::new("git")
        .arg("-C")
        .arg(project_dir)
        .args(["remote", "get-url", "origin"])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

/// Accepts `git@github.com:owner/repo.git` and `https://github.com/owner/repo.git`.
fn parse_repo_slug(url: &str) -> Option<String> {
    let s = url.trim().trim_end_matches(".git");
    let idx = s.find("github.com")?;
    let rest = &s[idx + "github.com".len()..];
    let after = rest.trim_start_matches([':', '/']);
    let mut parts = after.split('/');
    let owner = parts.next().filter(|p| !p.is_empty())?;
    let repo = parts.next().filter(|p| !p.is_empty())?;
    Some(format!("{}/{}", owner, repo))
}

/// Run `gh -R <repo> <args...>` and parse stdout as JSON.
fn gh_json(repo: &str, args: &[&str]) -> Option<Value> {
    let out = Command::new("gh")
        .arg("-R")
        .arg(repo)
        .args(args)
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    serde_json::from_slice(&out.stdout).ok()
}

/// Authoritative open/closed state for every issue and PR in the repo.
pub fn github_states(project_dir: &Path) -> GithubStates {
    let repo = resolve_repo(project_dir);
    let mut states = GithubStates {
        repo: repo.clone(),
        issues: Vec::new(),
        prs: Vec::new(),
    };

    if let Some(Value::Array(arr)) = gh_json(
        &repo,
        &["issue", "list", "--state", "all", "-L", "500", "--json", "number,state,title"],
    ) {
        states.issues = arr
            .iter()
            .map(|v| GithubIssueState {
                number: v
                    .get("number")
                    .and_then(|n| n.as_i64())
                    .map(|n| n.to_string())
                    .unwrap_or_default(),
                state: sf(v, "state"),
                title: sf(v, "title"),
            })
            .collect();
    }

    if let Some(Value::Array(arr)) = gh_json(
        &repo,
        &["pr", "list", "--state", "all", "-L", "500", "--json", "number,state,headRefName,title,url"],
    ) {
        states.prs = arr
            .iter()
            .map(|v| GithubPrState {
                number: v.get("number").and_then(|n| n.as_i64()).unwrap_or(0),
                state: sf(v, "state"),
                head_ref_name: sf(v, "headRefName"),
                title: sf(v, "title"),
                url: sf(v, "url"),
            })
            .collect();
    }

    states
}

/// Live detail of one PR: title, state, review decision and CI checks.
pub fn pr_detail(project_dir: &Path, number: i64) -> Option<PrDetail> {
    let repo = resolve_repo(project_dir);
    let v = gh_json(
        &repo,
        &[
            "pr",
            "view",
            &number.to_string(),
            "--json",
            "number,title,state,url,body,reviewDecision,statusCheckRollup",
        ],
    )?;

    let checks = v
        .get("statusCheckRollup")
        .and_then(|c| c.as_array())
        .map(|arr| arr.iter().map(parse_check).collect())
        .unwrap_or_default();

    Some(PrDetail {
        number: v.get("number").and_then(|n| n.as_i64()).unwrap_or(number),
        title: sf(&v, "title"),
        state: sf(&v, "state"),
        url: sf(&v, "url"),
        body: sf(&v, "body"),
        review_decision: sf(&v, "reviewDecision"),
        checks,
    })
}

/// A rollup entry is either a CheckRun (name/status/conclusion) or a
/// StatusContext (context/state) — normalise both into `PrCheck`.
fn parse_check(c: &Value) -> PrCheck {
    let name = {
        let n = sf(c, "name");
        if n.is_empty() {
            sf(c, "context")
        } else {
            n
        }
    };
    let conclusion = {
        let concl = sf(c, "conclusion");
        if concl.is_empty() {
            sf(c, "state")
        } else {
            concl
        }
    };
    let status = {
        let st = sf(c, "status");
        if st.is_empty() {
            "COMPLETED".to_string()
        } else {
            st
        }
    };
    PrCheck {
        name,
        status,
        conclusion,
    }
}
