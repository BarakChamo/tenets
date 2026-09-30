# tenets

An engineering standard for coding agents, distilled from the canon and packaged as installable
skills: **15 language-neutral rules behind a trigger-routing index, a language profile that binds
them to one ecosystem, one editable per-project file, six commands that apply the rules to real
code, TypeScript and Python primitives, and an eval suite** that measures whether
agents actually load and follow the rules.

An agent will be exactly as good an engineer as the standard you managed to articulate — not as good
as your best day, and not as good as your intentions, but as good as the sentences you actually
wrote. Left to infer standards from a codebase, it faithfully reproduces whatever is already there,
including the parts you are ashamed of. So the standard is written down, loaded per task, cited by
anchor, and measured. → [Motivation](docs/motivation.md)

Rules are dense and loaded on demand — two to four files, roughly 1.5–2.5k tokens for a given task —
rather than crammed into an always-on context file. Humans get the same benefit: a small, internally
consistent standard with its deviations written down.

## This is an opinionated ruleset

It takes sides. Expected failures are typed values rather than exceptions; invariants are never
caught to recover; coverage is feedback and never a target; mature tooling beats hand-built
infrastructure even where safety-critical practice says the opposite; modules should be deep and
exports few. Reasonable engineers disagree with several of those, and a neutral standard would have
been useless — a rule that offends nobody decides nothing, and an agent cannot act on it.

So the opinions are stated plainly, sourced, and given stable anchors you can argue with. Where a
rule is a deliberate departure from its source, the rule says so and says why. Where your project
needs to break one, that is a **recorded deviation** in your project guide, carrying the anchor and
the reason — and an audit then suppresses findings that deviation covers, because your guide is
authoritative for your repository. Disagreement is a first-class act here, not a quiet violation.

And if you think a rule is wrong in general rather than just wrong for your repository, say so:
[open an issue](https://github.com/BarakChamo/tenets/issues), send a pull request, or fork the set
and take it somewhere better. The anchors and the cited sources exist to make that argument
concrete — name the number, say what it gets wrong, and the conversation has somewhere to start.

## Documentation

| Page | What it covers |
| --- | --- |
| [Motivation](docs/motivation.md) | Why the standard has to be explicit, and why reviewing output does not scale |
| [Design](docs/design.md) | The four composable layers, anchors as API, progressive disclosure, measured determinism |
| [Authoring](docs/authoring.md) | Adding a rule, writing a profile, populating a guide, writing a portable workflow skill |
| [Provider families](docs/patterns/provider-families.md) | Fan out by workspace, fan in by composition — the shape for many interchangeable implementations |

## Install

```sh
npm i -D @tenets/skills && npx skills experimental_sync -y
# or, GitHub-direct:
skills add BarakChamo/tenets --all
```

`--all` matters: this repository ships seven skills, so without it the installer prompts for a
selection.

Then run **`/tenets-init`** in the target repository. It inspects the repo, writes a pre-filled
project guide, records its path in `tenets.json` at the root (repo-owned, so it survives skill
reinstalls), pins the routing mandate into AGENTS.md, and offers the per-harness command shims. The
mandate is the determinism layer: skill activation is description-matched and probabilistic, while
an always-loaded instruction is not.

## The skills

| Skill | What it does |
| --- | --- |
| `tenets` | the ruleset itself — rules, profile, guide discovery; loads on trigger during ordinary work |
| `/tenets-audit [scope]` | severity-ranked compliance report for a repo, package, or subtree |
| `/tenets-review [target]` | reviews a PR, branch, or dirty tree, plus an intent audit against the active plan |
| `/tenets-plan [request]` | requirement, contract, examples-as-tests, green revertable slices |
| `/tenets-realign [scope]` | ordered slice plan, applied on approval, one green commit per slice |
| `/tenets-init` | sets a repo up: guide, `tenets.json`, routing mandate, per-harness shims |
| `/tenets-check` | audits the guide: structure, freshness, quality bars, anchors, template version |

The six workflow skills are user-invoked only — their descriptions stay out of context, so they
never compete with the ruleset for activation during ordinary work. That is also why the routing
mandate names them: naming is what makes them discoverable.

During ordinary work agents follow the **loading protocol**: match the task against the index, read
every matched rule file plus the language profile, and open the response with `Rules: <numbers|none>`
— with an explicit statement that brevity and minimalism instructions govern prose, never the
protocol. Teams wanting a hard per-prompt guarantee can add an opt-in hook, documented in
[the ruleset's README](skills/tenets/README.md).

## The rules

Each rule distills a respected source, keeping its teeth and recording every deliberate deviation:

| Rule | Core principle | Primary sources |
| --- | --- | --- |
| 01 Coding Philosophy | Correctness, reviewability, and agent legibility before speed; YAGNI → KISS → DRY in that order; deleted code leaves no shadows | Ousterhout, XP |
| 02 Error Handling | Every failure lives in exactly one tier — boundary schema, invariant, or typed `Result` — and assertions guard **both ends** of an interaction (the airlock); an invariant failure is never caught to recover | Design by Contract (Meyer), TigerBeetle's tiger-style, railway-oriented programming (Wlaschin), result-type practice |
| 03 Function Design | Flat, bounded, boring control flow; deep modules that hide one volatile decision behind one operation; thin protocol wrappers | Ousterhout's *A Philosophy of Software Design*, tiger-style control-flow discipline |
| 04 Testing | Examples derived from the requirement become the test list; behavioral red-green-refactor; coverage is feedback, never a target — a deliberate calibration away from safety-critical test-per-function mandates | TDD (Beck), BDD discovery/formulation (Cucumber), contract testing |
| 05 Documentation | Document why and contracts, never restate code; preambles on every owned file; docs that lie are worse than none | living-documentation practice |
| 06 Learnings Process | Non-obvious discoveries go to an inbox before curation; three failed attempts or ten stuck minutes triggers stop-capture-ask | operational learning loops |
| 07 Repository Conventions | Workspace families with one-way dependencies; smallest useful export surface; schemas owned by the operation's package; the profile's strictness non-negotiables | monorepo practice, information hiding |
| 08 Project Tooling | One command per action; tool config owns mechanical enforcement; policy code only for what tools cannot express | DORA capabilities |
| 09 Code Review | Severity-tagged findings (BLOCK / REQUIRED / SUGGESTION / MINOR) with rule anchors and exact fixes; review the diff, not the world | rubric-based review practice |
| 10 Decision Framework | Requirement first, evidence next, simplest owning layer last; tool-native order **deliberately inverts** zero-dependency defaults — product engineering buys leverage from mature tooling | Occam, tiger-style (inverted, recorded) |
| 11 Change Delivery | Small revertable batches, one logical change per green commit, unfinished work isolated not half-shipped; metrics are signals never targets; production-relevant changes ship their failure signal | DORA (small batches, Goodhart), observability practice |
| 12 Data and State | One system of record per entity; everything else is derived with a rebuild path; no dual-writes; expand–contract migrations with n−1 compatibility | Kleppmann's *DDIA*, *Refactoring Databases*, boring-technology practice |
| 13 Serverless Runtime | Instances are caches, never truth; waterfalls are the #1 perf bug; every cache entry has an invalidation story; retries are ambient so idempotency is mandatory; everything is bounded | twelve-factor, Well-Architected serverless practice |
| 14 Planning | The plan is the contract stated before the code: boundary, API, error cases, invariants, tests, docs; examples become the test list; requirement before mechanism | Design by Contract, BDD example-first practice |
| 15 Concurrent Change | Parallel work is partitioned by write set, not by task description; convergence points are named and made append-only, generated, or singly owned; a plan is re-derived after another change lands; if the split fights the structure, the structure is wrong | Conway 1968, Team Topologies (Skelton & Pais), trunk-based development (DORA), Parnas 1972 via Rule 7.10 |

Three structural properties hold the set together — the reasoning is in [design](docs/design.md):

- **Four composable layers.** A rule states the principle; a profile binds it to one ecosystem's
  mechanisms; the project guide states one repository's facts; a workflow skill is the procedure that
  applies it. A new language is one ~500-word profile, not a rule fork.
- **Rules are immutable; the guide is the only editable file.** Project-specific facts and recorded
  deviations live there, and an audit suppresses findings a deviation covers.
- **Anchors are API.** Sections are numbered (`Rule 4.3`), cited everywhere, and never renumbered —
  new content appends.

## Harnesses

Skills are the portable artifact: the same `SKILL.md` reaches every harness the `skills` CLI targets,
and most read the canonical `.agents/skills/` directory directly.

| Harness | Typed invocation |
| --- | --- |
| Claude Code | `/tenets-audit` |
| Codex | `$tenets-audit` |
| Cursor | `/tenets-audit` |
| opencode | through its skill tool, or a shim `/tenets-init` offers |
| Gemini CLI | a shim `/tenets-init` offers (skills there are model-invoked only) |

Nothing depends on a single-harness mechanism: no forked-context frontmatter, no hooks, no
shell-output injection, and no positional argument placeholders — `$1` is the first argument in some
harnesses and the second in others. Parallel work is expressed as intent, so a harness without
parallel workers runs the same procedure sequentially for the same output. Where a harness cannot
type-invoke a skill, `/tenets-init` offers a two-line shim pointing at the installed file rather than
copying the procedure.

One easily-missed detail: Gemini CLI does not read `AGENTS.md` unless `context.fileName` lists it, so
the routing mandate needs a `GEMINI.md` pointer — `/tenets-init` offers that too.

## Python profile

Select `"profile": "python"` in `tenets.json`, or let `/tenets-init` detect a Python project.
The [Python profile](skills/tenets/profiles/python.md) binds the same rules to Python with ty for
static types, uv/Ruff/pytest defaults (documented deviations allowed), and a configurable boundary
schema library. It specifies Python exception translation, async ownership, and package-boundary
enforcement; the project guide supplies concrete paths and commands.

## The primitive packages

The TypeScript profile fixes one API surface (Rule 7.6); everything else is configurable. This repo
ships [TypeScript](skills/tenets/profiles/typescript.md) and
[Python](skills/tenets/profiles/python.md) profiles with their matching primitives:

- [`@tenets/result`](packages/result-ts) — `Result<T, E>` / `ResultAsync<T, E>`, `ok`, `err`,
  `map`/`mapErr`/`andThen`/`match`/`unwrapOr`/`combine`, `trySync`/`tryAsync`. Frozen variants,
  thenable async composition, dependency-free.
- [`@tenets/invariant`](packages/invariant-ts) — `invariant()` throwing `InvariantError` with stable
  metadata, plus `createInvariant` for production message stripping.
- [`@tenets/env`](packages/env) — composable typed environment contracts on Zod 4.6 (Rule 2.1's
  boundary layer): server/client partitions, deployed-environment rules, a Next.js adapter, and a
  cached schema per contract (~30× faster steady-state than rebuilding it per parse).
- [`tenets-result`](packages/result-py) — Python `Result` / `ResultAsync`, frozen typed variants,
  synchronous and async composition, zero runtime dependencies.
- [`tenets-invariant`](packages/invariant-py) — Python assertions, metadata, and production
  diagnostic stripping, zero runtime dependencies.

```sh
npm install @tenets/result @tenets/invariant
# Python 3.10+:
python -m pip install tenets-result tenets-invariant
```

TypeScript releases also attach npm tarballs for registry-free installs. Package sources can be
copied into a workspace directly. Your project guide records the location either way.

Python package validation (install local sources with
`python -m pip install ./packages/result-py ./packages/invariant-py`):

| Command | Purpose |
| --- | --- |
| `python -m unittest discover -s packages/invariant-py/tests` | Invariant behavior |
| `python -m unittest discover -s packages/result-py/tests` | Sync and async Result behavior |
| `python -O -m unittest discover -s packages/invariant-py/tests` | Always-on assertions under optimization |
| `python -m mypy` | Strict public API and consumer typing contracts (install `mypy` first) |
| `python -m build packages/invariant-py` / `python -m build packages/result-py` | Wheels and source distributions (install `build` first) |

CI tests installed wheels on Python 3.10–3.14. Build and type-check tools are
development dependencies; both packages have zero runtime dependencies.

## Evals

```sh
evals/run.sh /path/to/repo-with-skills-installed
```

Three suites, each scenario a fresh non-interactive session:

- `scenarios.tsv` — **routing**: one positive per index row plus negatives that must stay silent.
  Asserts index load, correct rule-file reads, and that no workflow skill hijacked an ordinary
  request.
- `abidance.tsv` — **rule abidance**: the answer must carry the concrete mechanism the profile fixes,
  so a rule that loads but goes unapplied still fails.
- `invocation.tsv` — **command routing**: explicit phrasings must reach the named workflow skill, and
  adversarial near-misses must reach none.

Latest release checks ([0.7.0 report](evals/v070/SUMMARY.md)): routing **20/22**,
abidance **6/7**, command routing **14/16**. The report records baseline comparisons, an unresolved
routing finding, and scorer limitations. Run all three before releasing any change to a
description, the index, or a skill body — a ten-word edit has moved results before. Requires an
authenticated `claude` CLI; runs cost real tokens.

## Layout

| Path | Contents |
| --- | --- |
| `skills/tenets/SKILL.md` | Routing index, loading protocol, guide and profile discovery |
| `skills/tenets/rules/` | The 15 rule files |
| `skills/tenets/profiles/` | Language profiles: `typescript.md` and `python.md` |
| `skills/tenets/templates/` | Project-guide template (WHAT / WHY / QUALITY BAR per slot) |
| `skills/tenets/workflow/` | Shared contracts for the workflow skills: findings, scope, checklists |
| `skills/tenets-audit`, `-review`, `-plan`, `-realign` | The four workflow commands |
| `skills/tenets-init`, `-check` | Setup and guide audit, plus the per-harness shim templates |
| `packages/result-ts`, `packages/invariant-ts`, `packages/env` | TypeScript primitives and the env boundary layer |
| `packages/result-py`, `packages/invariant-py` | Python primitives with behavioral parity tests |
| `docs/` | Motivation, design, authoring |
| `evals/` | Eval runner, three scenario suites, recorded results |
| `examples/project-guide-example.md` | A real populated guide |

## Credits

The rules distill published engineering thought; the packages descend from prior art and exist for
specific additions:

- **Rules**: TigerBeetle's tiger-style, Bertrand Meyer's Design by Contract, John Ousterhout's
  *A Philosophy of Software Design*, Scott Wlaschin's railway-oriented programming, Kent Beck's TDD
  and Cucumber's BDD practice, DORA's capability research, Martin Kleppmann's *DDIA*,
  Fowler & Sadalage's *Refactoring Databases*, and twelve-factor/serverless practice.
- **`@tenets/env`**: inspired by [t3-oss/t3-env](https://github.com/t3-oss/t3-env); adds
  composition/inheritance, deployed-environment rules with vacuous-guard refusal, and a cached
  schema per contract.
- **`@tenets/result`**: API lineage from [neverthrow](https://github.com/supermacro/neverthrow) (and
  Rust's `Result`, fp-ts's `Either`); dependency-free frozen plain objects, thenable async
  composition, `combine`.
- **`@tenets/invariant`**: descends from Facebook's `invariant` and
  [tiny-invariant](https://github.com/alexreardon/tiny-invariant); adds a typed `InvariantError` with
  crash-reporting metadata and configurable production stripping.

## License

MIT.
