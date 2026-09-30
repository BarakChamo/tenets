# 0.7.0 release checks — 2026-10-01

Core skill: 2.3.0. Package: `@tenets/skills` 0.7.0.

All three existing suites ran unchanged using `evals/run.sh`, its default six-turn budget,
and the authenticated `sonnet` alias (resolved to `claude-sonnet-5`). The temporary TypeScript
fixture contained all seven installed skills, the routing mandate, the example project guide,
small greetings/text/API/ops modules, and an uncommitted display-name change. This is a fresh
fixture and model run, not a controlled replay of the older v040 results.

| Suite | Passed | Total | Recorded result |
| --- | --- | --- | --- |
| Routing | 20 | 22 | [routing.txt](routing.txt) |
| Rule abidance | 6 | 7 | [abidance.txt](abidance.txt) |
| Workflow invocation | 14 | 16 | [invocation.txt](invocation.txt) |

## Failures and comparison

The same failing prompts were run against the previous core skill at commit `be230ed`, using
an otherwise equivalent fixture. [Comparison results](baseline-comparison.txt):

- A04: answers strictness settings without reading the required rule file. Fails both versions.
- I03: ordinary ruleset selection instead of the review workflow. Fails both versions; the
  candidate response also hits the runner's turn limit.
- I07: guide-check request does not select `tenets-check`. Fails both versions.
- R06: learning-capture request omits required rule loading. Fails both versions.
- R19: capability-versus-layer organization omits required rule loading. The previous version
  passes, while the candidate fails both the initial run and a targeted repeat. This remains an
  unresolved evaluation finding; these runs do not establish whether it is a routing regression
  or sampling variation. [Repeat result](routing-repeat.txt).

Do not describe this release as having an all-green skill evaluation. Some scored passes also
omit profile reads or the opening declaration: the existing scorer records those columns but does
not require them for every case. No scorer or expectation was weakened for the release.

## Deterministic validation

- Skill metadata validation passes; npm package contents include `profiles/python.md`.
- TypeScript typecheck, all 93 tests, and all workspace builds pass.
- Python profile configuration and its pytest example were checked against ty 0.0.84 and the
  published Python primitives. Typed synchronous Result consumers and an explicitly typed async
  operation pass. Missing generic arguments, dynamic returns, unsafe optional use, and attempted
  `type: ignore` suppression fail as intended; Ruff rejects Any and missing return annotations.
- The published 0.6.0 `ResultAsync.from_result` factory has a ty inference limitation documented
  in its README. This release does not claim to fix that library issue.

The release adds the requested Python profile; broader routing reliability and the factory typing
limitation remain follow-up work.
