import type { GithubPrState, GithubStates, IssueRun } from "../types";

export type IssueStatus = "active" | "done" | "unknown";

/** PR number for a run, from its prUrl, else matched by branch on GitHub. */
export function runPrNumber(run: IssueRun, gh: GithubStates): number | null {
  const fromUrl = run.prUrl.match(/\/pull\/(\d+)/);
  if (fromUrl) return Number(fromUrl[1]);
  const pr = gh.prs.find((p) => p.headRefName === run.branch);
  return pr ? pr.number : null;
}

/** The GitHub PR backing a run, if any. */
export function runPr(run: IssueRun, gh: GithubStates): GithubPrState | null {
  const n = runPrNumber(run, gh);
  if (n != null) return gh.prs.find((p) => p.number === n) ?? null;
  return gh.prs.find((p) => p.headRefName === run.branch) ?? null;
}

/**
 * Authoritative status for a run, from GitHub:
 *   - "done"  → the issue is CLOSED or its PR is MERGED/CLOSED (shown red)
 *   - "active"→ the issue is open and the PR is not yet closed (shown green)
 *   - "unknown" → GitHub state unavailable for this run (shown muted)
 */
export function issueStatus(run: IssueRun, gh: GithubStates): IssueStatus {
  const issue = gh.issues.find((i) => i.number === run.issue);
  const pr = runPr(run, gh);
  if (pr && (pr.state === "MERGED" || pr.state === "CLOSED")) return "done";
  if (issue) return issue.state === "CLOSED" ? "done" : "active";
  if (pr) return pr.state === "OPEN" ? "active" : "done";
  return "unknown";
}

export const STATUS_DOT: Record<IssueStatus, string> = {
  active: "bg-neon-green",
  done: "bg-neon-red",
  unknown: "bg-slate-600",
};

export const STATUS_LABEL: Record<IssueStatus, string> = {
  active: "activa",
  done: "cerrada",
  unknown: "estado desconocido",
};
