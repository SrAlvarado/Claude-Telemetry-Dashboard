import type { GithubPrState, GithubStates, IssueRun } from "../types";

export type IssueStatus = "active" | "done" | "unknown";

/**
 * True if `pr` belongs to issue `issue`. Matched by the issue number encoded in
 * the branch (`<type>/<issue>-slug`) or in the title (`[#<issue>]`). We do NOT
 * match by full branch equality: session branches are shared across issues
 * (e.g. `harness/e6-bot-triage`), so a branch match would attribute one issue's
 * PR to every run on that branch. The trailing `-` / non-digit guards stop
 * `1478` from matching `11478` or `478`.
 */
function prMatchesIssue(pr: GithubPrState, issue: string): boolean {
  const n = issue.trim();
  if (!n) return false;
  return new RegExp(`(?:^|/)${n}-`).test(pr.headRefName) || new RegExp(`#${n}(?!\\d)`).test(pr.title);
}

/** PR number for a run, from its prUrl, else matched to the run's issue on GitHub. */
export function runPrNumber(run: IssueRun, gh: GithubStates): number | null {
  const fromUrl = run.prUrl.match(/\/pull\/(\d+)/);
  if (fromUrl) return Number(fromUrl[1]);
  const pr = gh.prs.find((p) => prMatchesIssue(p, run.issue));
  return pr ? pr.number : null;
}

/** The GitHub PR backing a run, if any. */
export function runPr(run: IssueRun, gh: GithubStates): GithubPrState | null {
  const n = runPrNumber(run, gh);
  return n != null ? (gh.prs.find((p) => p.number === n) ?? null) : null;
}

/**
 * Authoritative status for a run, from GitHub:
 *   - "done"  → the issue is CLOSED or its PR is MERGED/CLOSED (shown red)
 *   - "active"→ the issue is open and the PR is not yet closed (shown green)
 *   - "unknown" → GitHub state unavailable for this run (shown muted)
 */
export function issueStatus(run: IssueRun, gh: GithubStates): IssueStatus {
  // El número de issue es la identidad autoritativa del run. La PR se empareja
  // por rama, lo cual falla cuando varios runs comparten una rama de sesión
  // (p.ej. harness/e6-bot-triage, que tuvo una PR mergeada) — marcaría como
  // "done" issues abiertas. Por eso la issue MANDA sobre la PR.
  const issue = gh.issues.find((i) => i.number === run.issue);
  if (issue) return issue.state === "CLOSED" ? "done" : "active";
  const pr = runPr(run, gh);
  if (pr) return pr.state === "MERGED" || pr.state === "CLOSED" ? "done" : "active";
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
