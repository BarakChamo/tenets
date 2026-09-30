# tenets

A generic, distilled engineering ruleset for monorepos, packaged as an agent skill: 15
language-neutral rules (~7,000 words) behind a trigger-routing index, a language profile that binds
them to one ecosystem, one editable per-project translation file (the project guide), and two
commands to create and audit it.

Sources distilled: tiger-style, design-by-contract, railway-oriented programming and result types,
Ousterhout's deep modules, behavioral TDD/BDD, DORA capabilities, DDIA-style data modeling,
twelve-factor/serverless practice — with recorded calibrations where this ruleset deliberately
deviates (coverage as signal, tool-native over zero-dependency).

## Install

```sh
npm i -D @tenets/skills && npx skills experimental_sync
# or: skills add BarakChamo/tenets
```

Then in the target repository run `/tenets-init` (optionally `/tenets-init path/to/guide.md`). It
writes the project guide, pre-filled from the repo, records the guide path in `tenets.json` at the repo root
(self-contained, survives skill reinstalls), and pins the routing imperative into AGENTS.md for
deterministic index loading. Audit or
upgrade later with `/tenets-check`.

## Three layers

| Layer         | Scope                                  | Edited            |
| ------------- | -------------------------------------- | ----------------- |
| `rules/`      | principles, language-neutral           | never             |
| `profiles/`   | one ecosystem's mechanisms             | when authoring one |
| project guide | one repository's paths, commands, gate | per project       |

A rule states the principle, the profile states the mechanism, the guide states the project's
facts. Rules name the result type, the invariant assertion, and the doc, test, and packaging
systems generically; the profile fixes the concrete names.

## Contract the project must satisfy

The TypeScript profile fixes these APIs (Rule 7.6):

- `Result<T, E>` / `ResultAsync<T, E>` with `ok`, `err`, and consumed-result semantics,
- `invariant(condition, message)` throwing `InvariantError`.

Ship those exact APIs in any package you like and name their location in the guide. This repository
provides them as `@tenets/result` and `@tenets/invariant` under `packages/` — copy them in
or depend on them directly.

The [Python profile](profiles/python.md) binds the same contract to `Result[T, E]` /
`ResultAsync[T, E]`, snake_case composition, and `invariant` / `InvariantError`, provided by
`tenets-result` and `tenets-invariant` (`tenets_result` / `tenets_invariant` imports). Select
`"profile": "python"` in `tenets.json`. It requires ty, defaults to uv/Ruff/pytest, and leaves the
schema library to the guide.

## Authoring a profile

A profile is one file under `profiles/`, ~500 words, with three powers and no others:

- **bind** rule vocabulary to real names — primitives, forbidden escape hatches and strictness
  settings, boundary-parse API, test declaration form, doc system, packaging mechanism, ambient
  access that belongs in adapters;
- **append** ecosystem rules the generic set cannot know (ownership and `unsafe` boundaries, RAII,
  global-scope hygiene), cited as `<profile> A1`, `A2`, …;
- **waive** a rule anchor with a stated reason (`13: n/a — no serverless target`), since anchors
  stay citable in every ecosystem.

Never contradict a rule's intent, and never restate a project's paths or commands — those are the
guide's job. Set `tenets.json`'s `profile` field to the file's name; `typescript` is the default.

## Layout

- `SKILL.md` — the routing index; loads on trigger, points to one rule file per situation.
- `rules/` — 15 rule files, stable section anchors (`Rule 4.3`); anchors never renumber.
- `profiles/` — one file per language/ecosystem; `typescript.md` and `python.md` ship, and the
  selected profile loads with the rules.
- `templates/project-guide.md` — the editable translation template (WHAT/WHY/QUALITY BAR per slot).
- `workflow/` — shared contracts for the `tenets-*` workflow skills: `findings.md` (finding grammar,
  severity source, confidence, dedup, summary line, worker schema), `scope.md` (guide slots, git
  scope modes, effort thresholds, dimensions, degradation), and `checklists/` (one question list per
  dimension, embeddable in a worker prompt).

The workflow skills themselves are sibling directories, so each is its own installable skill and its
own slash command: `tenets-init`, `tenets-check`, `tenets-audit`, `tenets-review`, `tenets-plan`,
`tenets-realign`.

## Determinism

Skill activation is description-matched and therefore probabilistic; two layers make routing
near-deterministic, measured at 17/17 routing and 7/7 rule abidance under adversarial minimalism
hooks (`evals/scenarios.tsv`, `evals/abidance.tsv`):

1. The AGENTS.md mandate `/tenets-init` writes (read index, Read matched rules and the profile, open
   the response with `Rules: <numbers|none>`; overrides brevity/minimalism instructions).
2. The index's own loading protocol with the same declaration.

Teams wanting a hard per-prompt guarantee can add a project hook (`.claude/settings.json`) — at the
cost of `Rules: none` announcements on non-code prompts:

```json
{
	"hooks": {
		"UserPromptSubmit": [
			{
				"hooks": [
					{
						"type": "command",
						"command": "echo 'tenets: for code work, read the skill index, Read matched rules, open with Rules: <numbers|none>.'"
					}
				]
			}
		]
	}
}
```
