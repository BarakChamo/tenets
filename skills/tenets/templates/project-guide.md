# Project guide (template)

The single file translating the generic engineering rules (the `tenets` skill) into this
project. Rules are never edited per project, and ecosystem mechanisms belong to the language profiles
the skill loads; every project-specific fact, path, command, and deviation lives here.

**How to populate:** replace each comment block with real content and delete the comment. Keep every
heading, even when a section is one line — rules cite these sections, and an agent treats a missing
heading as an unanswered deferral. Keep the populated guide under ~600 words: it is read far more
often than any rule, so every sentence must earn always-on context. Write facts an agent cannot
infer from code or config; never restate what a README or the rules already say.

## Stack

<!-- WHAT: runtime(s) and versions, language/compiler version, framework(s), package manager,
     deployment platform, and language profiles in use (`tenets.json` `profile` or path-scoped
     `profiles`). For mixed projects, pair each language/runtime with its covered paths. One bullet
     each.
     WHY: Rule 08 sends agents here when reference examples name a different stack; agents also use
     this to resolve version-sensitive behavior (Rule 10.1) against the right docs.
     QUALITY BAR: an agent reading only this section knows which documentation set to trust.
     EXAMPLE: "Bun (package manager only) — application code runs on Node.js 24; no Bun APIs." -->

## Commands

<!-- WHAT: one table (Command | Use) covering setup, iteration/dev, the full acceptance gate,
     format/lint fixes, and any expensive or live commands — explicitly marked as such.
     WHY: Rules 08, 4.8, and 9.2 defer here; Rule 11.2's "green commit" means this table's gate
     passes. Agents must never guess whether a command is cheap iteration or a live call.
     QUALITY BAR: the gate command is unambiguous, and nothing requires undocumented flags. -->

| Command | Use |
| ------- | --- |
|         |     |

## Workspace map

<!-- WHAT: the package namespace (Rule 7.1); one row per workspace with its family
     (app/package/lib) and one-line responsibility; the permitted dependency directions and the
     tool that enforces them (Rule 7.2). If directory names differ from the rule vocabulary
     (apps/packages/libs), state the mapping here. Name any convergence points — registries,
     generated files, migration sequences — and who owns them (Rule 15.2).
     WHY: this is how an agent decides where new code lives and what it may import, and where
     concurrent work will collide.
     QUALITY BAR: every workspace appears; an agent can place a new module without asking. -->

## Shared primitives

<!-- WHAT: where each rule primitive lives — Result/ResultAsync -> <package>,
     invariant + InvariantError -> <package>, boundary schema library (Rule 2.1) -> <package>.
     In mixed projects, map each profile/path scope to its API and import/module path. The API names
     are fixed by the applicable language profile (Rule 7.6); only locations are configurable here.
     Note any workspace that cannot use them (e.g. a publishable package that must stay
     dependency-free) and what it does instead.
     QUALITY BAR: an agent writing a failing function knows the exact import path. -->

## Tests

<!-- WHAT: runner identity; filename suffix per scope (unit/integration/live/e2e); where tests
     live; how selection works (affected-only vs full); which command runs which scope.
     WHY: Rules 4.1, 4.6, and 4.8 defer here.
     QUALITY BAR: an agent can name a new test file correctly and run exactly its scope. -->

## Documentation map

<!-- WHAT: locations for the preamble schema (Rule 5.1) and its required shape; the three templates
     (implementation plan, package README, learning entry); topic pages; architecture notes;
     glossary; decision records/ADRs; the learnings inbox directory.
     WHY: Rules 1.4, 5.4, 5.5, and 6.1 defer here; a missing location silently breaks the
     capture-and-curate loop.
     QUALITY BAR: every documentation kind the rules mention resolves to exactly one path. -->

## Vocabulary

<!-- WHAT: where the glossary lives (Rule 7.9), plus any terms with one canonical project meaning
     that agents would otherwise guess at.
     QUALITY BAR: no concept two workspaces share is defined only in someone's head. -->

## Data and runtime

<!-- WHAT: the concrete stores per Rule 12.2 (system of record, KV/cache, analytics, blob) and
     which workspace owns which tables; the serverless platform and its hard limits — timeout,
     memory, payload, concurrency (Rule 13); the caching layers available and the invalidation
     tooling (Rule 13.3).
     QUALITY BAR: an agent choosing where data lives, or checking what a function may not do,
     finds the answer here — including "no store yet" stated explicitly. -->

## Change delivery

<!-- WHAT: branching model; flag/isolation conventions for unfinished work (Rule 11.2); commit
     message conventions beyond Rule 11.2's defaults; the observability tooling — logger, metrics,
     health conventions and the correlation-id mechanism (Rules 11.4, 13.6).
     QUALITY BAR: an agent shipping a production-relevant change knows which logger to import. -->

## Rule addenda and recorded deviations

<!-- WHAT: the only place project-specific exceptions live. One bullet per deviation, citing the
     rule anchor and the reason — e.g. "7.2: packages may also depend on libs (never published)" or
     "2.3: the X SDK throws; translated once in adapters/x.ts".
     WHY: rules stay unedited; an undocumented deviation reads as a violation in review (Rule 9.4).
     Keep the section present even when empty — an explicit "none" beats an ambiguous absence. -->
