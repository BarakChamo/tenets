# Design: how the rules compose

The ruleset is not one document. It is four layers with one owner each, so that a fact lives in
exactly one place and every layer can change on its own schedule. This page explains why that shape
was chosen and which failure modes it exists to prevent.

## The four layers

| Layer | Owns | Changes when | Editable per project |
| --- | --- | --- | --- |
| **Rule** (`rules/NN-*.md`) | the principle, language-neutral | the team's engineering standard changes | never |
| **Profile** (`profiles/<name>.md`) | one ecosystem's mechanisms | you adopt a new language or the ecosystem shifts | when authoring one |
| **Guide** (your repo's project guide) | this repository's facts and deviations | commands, workspaces, or stores change | always — it is the only editable file |
| **Workflow skill** (`tenets-*`) | procedure: how to audit, review, plan, realign | the procedure improves | never |

A rule says *represent expected failure as a typed result value*. The TypeScript profile says *that
means `Result<T, E>` with `ok` and `err`*. Your guide says *they live in `@tenets/result`*. A
workflow skill says *here is how to find every place that rule is violated and fix it in green
slices*. Four sentences, four owners, no duplication.

The practical payoff is that porting the standard to a new repository means filling one template,
and porting it to a new language means writing one ~500-word profile rather than forking fifteen
rule files. A mixed-language repository maps profile names to path globs in `tenets.json`; tasks
load all profiles covering their files, and cross-cutting work loads all configured profiles.

## Why rules are immutable and the guide is not

The tempting design is per-project rule files you edit to fit. It fails within a quarter: every
repository's copy drifts, a finding citing "Rule 2.1" means something different in each one, and
nobody can tell an intentional local decision from an accident of editing.

So rules never change per project, and every project-specific fact is deferred to the guide at named
points — about fourteen of them. When a project genuinely needs to break a rule, that is a
**recorded deviation** in the guide, with the anchor and the reason. This turns disagreement into an
artifact: `/tenets-audit` reads those deviations and *suppresses* findings they cover, because the
guide is authoritative for that project. A violation and a decision look different, which is the
whole point.

## Anchors are API

Sections are numbered (`Rule 4.3`) and those numbers are a public interface. New content appends;
existing sections never renumber. Reviews cite them, guides cite them, workflow skills cite them,
and commit messages cite them.

That single constraint is what makes findings auditable years later, and what lets `/tenets-check`
verify mechanically that every anchor cited anywhere still exists. It also means a rule can be
rewritten without invalidating the citations pointing at it — the promise is the number's meaning,
not its prose.

## Progressive disclosure, because context is the budget

An always-loaded style guide competes with the problem being solved. So the ruleset is a routing
index — a table mapping situations to rule files — and an agent reads the two to four files its task
actually matched, roughly 1.5–2.5k tokens instead of the whole corpus.

The same discipline runs through every layer: workflow skills read the guide *slots* they need
rather than the whole guide, audit workers get one dimension's checklist rather than fifteen rules,
and the shared contracts live in `workflow/` so six skills reference one copy. Nothing that could be
loaded on demand is loaded eagerly.

## Distillation with recorded calibrations

Each rule distills a respected source and keeps its teeth, but two calibrations are deliberate
departures, written down rather than smuggled in:

- **Coverage is feedback, never a target.** Test-per-function mandates serve safety-critical
  infrastructure; a web application earns nothing from tests written to satisfy a number, and fake
  tests rot trust.
- **Tool-native order inverts the zero-dependency instinct.** Safety-critical practice builds its
  own primitives; product engineering buys leverage from mature tooling, and hand-built
  infrastructure costs the time it was meant to save.

Recording these matters more than the specific calls. A rule whose exceptions are documented can be
applied with judgment; a rule that pretends to be universal gets either obeyed stupidly or ignored
entirely.

## Intent in rules, enforcement in tools

Rules own intent. Tool configuration owns mechanical enforcement. Decision records own calibrated
one-off choices. Repository policy checks own cross-file rules no tool can express.

The rule is the same in every direction: never duplicate a check a tool already performs, and never
resolve a disagreement with a local suppression. If a formatter can settle it, the rule should not
mention it.

## Determinism is measured, not asserted

Skill activation is description-matched and therefore probabilistic. That is a property to measure,
not a caveat to write in a README.

Three eval suites run fresh non-interactive sessions against a real repository: routing (did the
right rules load, and did no workflow skill hijack an ordinary request), abidance (did the answer
carry the concrete mechanism, so a rule that loads but goes unapplied still fails), and command
routing (do explicit requests reach the named skill while near-misses do not).

Measuring changed the design repeatedly. Loading went from 3/8 to 18/18 once the protocol required
declaring which rules were read, and stated explicitly that brevity instructions govern prose but
never the protocol. A scorer that matched file paths was crediting the ruleset when a workflow skill
had actually answered — invisible failure, fixed by recording which skill fired. A live smoke test
caught relative paths resolving against the session's working directory rather than the skill file.
None of those were visible by reading the files.

## Designing for concurrent change

Several agents editing one repository makes contention a design property rather than a merge
problem. The mechanism is old: work parallelizes only up to its serial fraction, and in a codebase
the serial fraction is the set of files every change of a kind must touch — registries, barrels,
lockfiles, generated types, migration sequences, changelogs.

Those convergence points cannot be designed away, only named and made cheap: append-only, generated,
or owned by one change at a time. Rule 6.3 has quietly done this since the beginning — the learnings
inbox uses timestamped filenames precisely so concurrent writers cannot collide — and Rule 15
generalizes it. Rule 7.10 supplies the other half: decomposition that keeps changes local, so the
write sets are disjoint in the first place.

Two things follow that are easy to get backwards. Partitions are defined by what work *writes*, not
by how the task is described — "you take Stripe, I take PayPal" is not a partition while both edit
one registry. And when the natural split fights the structure, the structure is what is wrong; the
communication paths a structure permits are the ones its design ends up reflecting (Conway).

## Considered and deferred

Recorded so these are decisions rather than folklore:

- **A first-party boundary linter.** Attractive, because nothing in a typical TypeScript stack
  enforces slice isolation *inside* a package. Rejected for now: if slices are workspaces — which
  Rule 7.10 recommends anyway — `package.json` `exports` and the workspace graph already enforce it,
  the first at resolution level where it cannot be ignored. Building one would duplicate a dependency
  analyzer, which Rule 10.4 explicitly forbids. Revisit only when a real repository has many
  intra-package slices that cannot become workspaces, *and* lint-level import restrictions
  demonstrably cannot express the rule, *and* an existing graph tool is measurably too slow.
- **A change-coupling analyzer.** Computing which files change together from version-control history
  would let a repository *measure* its convergence points instead of guessing them, which is exactly
  what Rule 15.2 asks for. The metric is established (share of commits touching one file that also
  touch the other, filtered by shared-revision count). Deferred as a diagnostic rather than a gate:
  useful, but nothing depends on it, and Rule 1.2 says not yet.

## Failure modes designed against

- **Instruction dilution** — long instruction sets degrade adherence, so rules are dense and loaded
  per task rather than long and always present.
- **Over-review** — a reviewer asked to find gaps will invent them, producing defensive code and
  speculative abstraction. Findings must cite an anchor and a line actually read, and clearing a
  concern demands the same evidence as raising one.
- **Metric gaming** — any number used to steer work becomes a target unless the rules say otherwise,
  so Rule 11.3 makes signals-not-targets explicit and Rule 4.3 is its canonical instance.
- **Silent drift** — compiled knowledge going stale is worse than none, so a behavior change that
  leaves a README, topic page, or guide teaching old behavior is incomplete by rule.

## Extending it

Adding a rule, a profile, a workflow skill, or a project guide each has its own contract — see
[authoring](authoring.md).
