import { describe, it, expect } from "vitest";
import { runPrNumber, runPr } from "./issueStatus";
import { EMPTY_GITHUB_STATES } from "../types";
import type { GithubStates, GithubPrState, IssueRun } from "../types";

function makeRun(over: Partial<IssueRun> = {}): IssueRun {
  return {
    issue: "1478",
    args: "1478",
    branch: "feat/1478-endpoint-subir-reporte-pps-desktop",
    startedAt: "",
    sessionId: "sess",
    prUrl: "",
    // core/kingdom are unused by the functions under test
    core: {} as IssueRun["core"],
    kingdom: {} as IssueRun["kingdom"],
    ...over,
  };
}

function pr(over: Partial<GithubPrState>): GithubPrState {
  return { number: 0, state: "OPEN", headRefName: "", title: "", url: "", ...over };
}

function gh(prs: GithubPrState[]): GithubStates {
  return { ...EMPTY_GITHUB_STATES, prs };
}

describe("runPrNumber / runPr — association by issue, not by shared branch", () => {
  it("takes the PR number straight from prUrl when present", () => {
    const run = makeRun({ prUrl: "https://github.com/x/pull/1490" });
    expect(runPrNumber(run, gh([]))).toBe(1490);
  });

  it("does NOT inherit a foreign PR that merely shares the session branch", () => {
    // The harness shares a session branch across issues. PR #1472 belongs to
    // issue #1461 and is on that shared branch; issue #1478 has no PR yet.
    const run = makeRun({ issue: "1478", branch: "harness/e6-bot-triage", prUrl: "" });
    const states = gh([
      pr({ number: 1472, state: "MERGED", headRefName: "harness/e6-bot-triage", title: "[#1461] - chore(linting)" }),
    ]);
    expect(runPrNumber(run, states)).toBeNull();
    expect(runPr(run, states)).toBeNull();
  });

  it("matches the PR by issue number encoded in the branch name", () => {
    const run = makeRun({ issue: "1478", branch: "harness/e6-bot-triage", prUrl: "" });
    const states = gh([
      pr({ number: 1472, state: "MERGED", headRefName: "harness/e6-bot-triage", title: "[#1461] - chore" }),
      pr({ number: 1490, state: "OPEN", headRefName: "feat/1478-endpoint-subir-reporte-pps-desktop", title: "[#1478] - endpoint" }),
    ]);
    expect(runPrNumber(run, states)).toBe(1490);
    expect(runPr(run, states)?.number).toBe(1490);
  });

  it("matches the PR by issue number in the title when the branch does not encode it", () => {
    const run = makeRun({ issue: "1478", branch: "some/odd-branch", prUrl: "" });
    const states = gh([
      pr({ number: 1490, state: "OPEN", headRefName: "some/odd-branch", title: "[#1478] - endpoint" }),
    ]);
    expect(runPrNumber(run, states)).toBe(1490);
  });

  it("does not confuse issue 1478 with a substring match like 11478 or 478", () => {
    const run = makeRun({ issue: "1478", branch: "x", prUrl: "" });
    const states = gh([
      pr({ number: 99, state: "OPEN", headRefName: "feat/11478-other", title: "[#11478] - other" }),
      pr({ number: 98, state: "OPEN", headRefName: "feat/478-other", title: "[#478] - other" }),
    ]);
    expect(runPrNumber(run, states)).toBeNull();
  });
});
