# Changelog

## 0.6.0 — 2026-09-17

Zod 4.6, and compilation where it actually pays.

**`@tenets/env` stops compiling its schemas.** `parseEnv` still caches the schema it builds per
definition and target — that cache is what makes repeated parses roughly thirty times cheaper than
rebuilding the contract, and it stays. What it no longer does is call `z.compile`. Measured on Zod
4.6.5, compiling an environment-shaped contract costs about as much as two thousand parses of it,
and a contract is parsed once per process, so the generated fast path was startup work that never
came back. `src/typed-env/parse.bench.ts` now prices compilation against what it saves, so the
ratio is reproducible rather than asserted, and the README no longer credits the cache's win to
compilation. Nothing about the API, the errors, or the parsed snapshot changes; the behavioral
suite passes unchanged, which is the proof.

The peer range moves to `zod ^4.6.0`. No 4.6-only API is used — `parseEnv` returns a parsed
snapshot, so the new boolean `.validate()` has nothing to offer it, and `withParser`,
`instanceof().properties()`, `iban` and `currencyCode` have no environment-variable use — but one
supported Zod line is simpler to reason about than two.

**The TypeScript profile gains the rule behind that decision.** A boolean `validate`-style gate is
correct only where nothing reads a parsed value and the schema cannot repair its input, because a
fallback or default makes a repaired value answer "valid" and the guard narrows the input type.
Compilation is a build-step concern first: a build-time compiler emits validators into the bundle
and ships no compiler and no `new Function`, while a runtime compiler earns its keep only where
expected parses per process exceed compile cost divided by per-parse saving — a measurement, not an
assumption. Where compiled validators ship, the test suite runs them, so divergence fails the gate
rather than production.

All packages at 0.6.0. The `tenets` skill is at 2.2.0.

## 0.5.0 — 2026-09-04

Concurrent change, and decomposition for locality.

**Rule 15 Concurrent Change** is new: parallel work is partitioned by the files it will *write*, not
by how the task is described; convergence points — registries, barrels, lockfiles, generated types,
migration sequences, changelogs, the guide itself — are named and made append-only, generated, or
singly owned; a plan is re-derived against what actually landed rather than replayed; integration
order is declared before work starts; and if the natural split fights the structure, the structure
is wrong. Rule 6.3's timestamped inbox filenames turn out to have been the first instance of this
all along.

**Rule 7.10 Decomposition for Locality** appends the other half: organize a workspace's interior by
capability rather than technical layer, pass the deletion test (removing a capability deletes one
directory and unwires one export), apply 7.2's internal-import ban at module granularity, and expose
a family of implementations through one port plus composition at the consumer — never a broad
aggregator re-exporting every implementation.

The TypeScript profile gains a boundary-enforcement section ordered by strength, with the facts
verified rather than assumed: `exports` is the only unbypassable layer, workspace-graph tools cannot
see inside a package, oxlint has no `import/no-restricted-paths` and its Rust regex has no
lookahead, and `@internal` with `stripInternal` enforces nothing at all.

New docs: `docs/patterns/provider-families.md` works the fan-out/fan-in problem end to end for
interchangeable implementations, and `docs/design.md` gains a concurrency section plus a
**Considered and deferred** record for two packages that were designed and then declined — a
first-party boundary linter (it would duplicate a dependency analyzer, which Rule 10.4 forbids, and
`exports` plus the workspace graph already cover it when slices are workspaces) and a change-coupling
analyzer (a diagnostic nothing yet depends on). Both carry the criteria that would change the answer.

All packages at 0.5.0.

## 0.4.0 — 2026-09-04

Workflow skills, and one `tenets` namespace.

The ruleset skill is renamed `engineering-rules` → `tenets`, and four workflow commands join it as
sibling skills: `/tenets-audit` (severity-ranked compliance report for a repo, package, or subtree),
`/tenets-review` (PR, branch, or dirty tree, plus an intent audit of the active plan against what
the diff actually does), `/tenets-plan` (requirement, contract, examples-as-tests, green revertable
slices), and `/tenets-realign` (ordered slice plan, applied only on approval, one green commit per
slice). The two setup procedures become real skills too — `/tenets-init` and `/tenets-check` — which
fixes a defect: they shipped in a `command/` directory that no harness ever registered, so neither
was invokable.

They share `tenets/workflow/`: `findings.md` (finding grammar over Rule 9.1's severities, internal
confidence with suppression, dedup, summary grammar, worker schema), `scope.md` (guide slots per
consumer, git scope modes, effort thresholds, dimensions, degradation), and six dimension
checklists. The workflow skills restate no rule content — they cite anchors.

New **Rule 14 Planning**: the plan as a contract stated before the code — boundary, API, error
cases, invariants, tests, docs — with examples becoming the test list and requirement before
mechanism. It lives in the rules rather than only in `/tenets-plan`, so an agent already planning
mid-task gets it through the index.

Portability is deliberate: no forked-context frontmatter, no hooks, no shell-output injection, and
no positional argument placeholders (`$1` is the first argument in some harnesses and the second in
others). Parallel work is expressed as intent, so a harness without parallel workers runs the same
procedure sequentially for the same output. Claude Code, Codex and Cursor invoke the skills
directly; `/tenets-init` offers two-line shims for Gemini CLI, opencode and Cline, plus the
`GEMINI.md` pointer Gemini CLI needs before it will read AGENTS.md at all.

Each workflow skill resolves the ruleset by locating the installed `tenets` skill directory rather
than by a path relative to the working directory — a live smoke test caught the difference — and
pre-approves its own read-only git commands through the spec's `allowed-tools`, so a review does not
stall on a permission prompt.

The eval harness gained a real gate: it now records which skill fired, so a workflow skill answering
an ordinary request fails the run instead of silently passing as the ruleset. A new
`evals/invocation.tsv` covers command routing and adversarial near-misses. All packages at 0.4.0.

## 0.3.0 — 2026-09-04

Language profiles: the rules are now language-neutral and a profile file binds them to one
ecosystem. `skills/tenets/profiles/typescript.md` (~500 words) owns the TypeScript
mechanisms the rules used to hardcode — primitive names, strictness settings and forbidden escape
hatches, the boundary-parse API, test declaration form and its example, JSDoc tags, packaging and
manifest exports, ambient adapter-only access, and the adapter throw-translation snippet. A profile
may bind, append ecosystem rules, or waive an anchor with a reason; anchors stay citable in every
ecosystem. `tenets.json` gains a `profile` field (default `typescript`), the loading protocol reads
the profile alongside matched rules, `/tenets-init` detects and records it, and `/tenets-check` audits
it. Measured after the split: 17/17 routing (14 triggers, 3 negatives silent) and 7/7 abidance,
with the profile read in all seven mechanism scenarios — no loading or instruction-quality
regression against the pre-split baseline (17/17 and 7/7). All packages at 0.3.0.

## 0.2.0 — 2026-09-03

@tenets/env extracted from the reference monorepo: composable typed environment contracts on
Zod 4.5 with compiled parsing (~29x steady-state, benchmarked), inheritance/override/diamond
composition tests, Next.js adapter tests, and deployed-rule hardening. Credits added across all
packages (t3-env, neverthrow, invariant/tiny-invariant lineage). All packages at 0.2.0.

## 1.0.0 — 2026-09-03

Initial release: 13 rules with stable anchors and a measured loading protocol, trigger-routing
index, project-guide template and discovery convention, /tenets-init and /tenets-check commands,
the @tenets/result and @tenets/invariant packages (53 specs), and the routing eval suite (18/18 rule loading under
adversarial minimalism hooks; negatives silent).
