# Scope, thresholds, and degradation

Shared by every `tenets-*` workflow skill. Nobody restates these numbers; cite this file.

## Project guide discovery

In order: the `guide` field of `tenets.json` at the repository root; a `Project guide:` line in
AGENTS.md or CLAUDE.md; the default `docs/project-guide.md`. No guide → follow the degradation
matrix below and say so in the first output line.

## Guide slots by consumer

Read only the slots the run needs; the guide is read far more often than any rule.

| Slot                  | audit      | review     | plan            | realign      |
| --------------------- | ---------- | ---------- | --------------- | ------------ |
| Stack (and profile)   | yes        | yes        | yes             | yes          |
| Commands (gate)       | name only  | name only  | yes             | **required** |
| Workspace map         | yes        | yes        | yes             | yes          |
| Shared primitives     | yes        | yes        | yes             | yes          |
| Tests                 | yes        | yes        | yes             | yes          |
| Documentation map     | yes        | yes        | template + plan | yes          |
| Data and runtime      | dimension 5| dimension 5| if storage      | dimension 5  |
| Change delivery       | no         | yes        | yes             | yes          |
| Recorded deviations   | yes        | yes        | yes             | yes          |

## Git scope modes

Resolve to exactly one mode, in this order, and name which one was used:

1. **Explicit target** — a PR number or URL (`gh pr view <n> --json title,body,baseRefName` plus
   `gh pr diff <n>`), a ref range (`a...b`), a branch, or a path.
2. **Dirty tree** — `git status --porcelain` non-empty → `git diff HEAD`, and read each `??`
   untracked file directly, since a diff never shows them.
3. **Staged only** — worktree diff empty but `git diff --cached` non-empty → review the cached diff
   and state that unstaged work is invisible to this run.
4. **Branch vs base** — base from the guide's Change delivery slot, else
   `gh repo view --json defaultBranchRef`, else `git symbolic-ref refs/remotes/origin/HEAD`, else
   the local `main`/`master`; then `git diff $(git merge-base HEAD <base>)...HEAD`.
5. **Nothing to review** — clean tree and `HEAD` equal to base. Say so and stop.

A repository may have no remote and no upstream: `git rev-parse @{u}` and the `origin/HEAD` lookup
both fail there, which is normal, not an error. Fall through to the next rung.

## Profile selection

Read the legacy `profile` field as the repository default (default `typescript`). If
`tenets.json` also contains a `profiles` object, each key names a profile and its value is a list of
repository-relative globs. For a concrete file scope, load every profile with a matching path; for
unknown or cross-cutting scope, load every configured profile. The single `profile` field is the
fallback for files outside those scopes. If both fields are absent, use `typescript`.

Measure with `git ls-files -- <scope>`, `git diff --stat`, and a line count over each applicable profile's
source suffixes. Never walk `node_modules` or build output.

## Effort thresholds

| Measured scope                              | Effort                                                      |
| ------------------------------------------- | ----------------------------------------------------------- |
| < 50 lines or < 5 files                     | one pass, signal-selected dimensions only                    |
| 50–200 lines                                | one pass, all matched dimensions                             |
| > 200 lines or > 15 files                   | one unit per matched dimension, cap 5                        |
| > 200 changed lines                         | plus an adversarial pass over the findings already produced  |
| audit: > 40 source files                    | split into units                                             |
| audit: > 400 source files, no scope argument| stop: `NEEDS_CONTEXT`, naming the three largest subtrees     |
| review: > 3,000 changed lines               | `NEEDS_CONTEXT`, or proceed on the largest files and record the omission |

These are a first cut borrowed from other tools' tuning. Tune them against real runs rather than
treating them as measured.

## Dimensions

| # | Dimension                | Rules        | Runs when                                            |
| - | ------------------------ | ------------ | ---------------------------------------------------- |
| 1 | Boundaries and errors    | 02 + profile | always                                               |
| 2 | Structure and API depth  | 03 + 07      | always                                               |
| 3 | Tests                    | 04           | behavior or test files in scope                      |
| 4 | Docs and contracts       | 05 + 01      | new or changed exports, or new files                 |
| 5 | Data and runtime         | 12 + 13      | the guide names a store, or handlers/queues/jobs      |
| 6 | Delivery and tooling     | 11 + 08      | commits, root config, dependencies, or tool config    |

Rule 09 loads in the orchestrator only. Rule 10 loads for plan and for realign's clustering. Rule 06
loads only on the escalation path.

## Parallel or sequential

Run the dimensions as independent units. If parallel workers are available, dispatch one per
dimension in a single message and merge at the consolidation step; otherwise complete them
sequentially in listed order. **The output must be identical either way**, and the summary says
which mode ran. A worker's prompt carries the dimension checklist text, the relevant rule and
profile **paths**, the file list, and the return schema — never "route with the index", because a
worker starts with no routing mandate and no guide.

## Arguments

Every workflow skill states its argument line as prose, because placeholder substitution differs
per harness and positional placeholders mean different things in different ones:

> Scope: `$ARGUMENTS`. If that is empty or still contains a literal `$ARGUMENTS` or `{{args}}`, use
> the documented default and state the scope you chose in your first output line.

## No guide

Run rules and profile only, and open with one line naming what was skipped: test suffixes, the
acceptance gate, documentation locations, stores, and recorded deviations. Dimension 5 is skipped;
dimensions 3 and 6 degrade to rule-only checks. A missing guide slot is never itself a finding —
suggest `/tenets-init` once. The exception is `tenets-realign`, which needs the gate command to
commit green and blocks without it.
