# Authoring: extending the ruleset

Four things can be added, each with its own contract. The layer model in [design](design.md) decides
which one you want: a principle is a rule, a mechanism is a profile, a repository fact is a guide
slot, a procedure is a workflow skill.

## Adding or changing a rule

Rules are the standard itself, so the bar is high and the mechanics are strict.

- **Append, never renumber.** A new section is the next number in that file; existing anchors keep
  their meaning forever, because reviews, guides, and skills cite them.
- **Stay language-neutral.** Name the result type, the invariant assertion, and the doc, test, and
  packaging systems generically; the profile fixes concrete names. A rule mentioning `describe`,
  `package.json`, or `@ts-ignore` belongs in a profile.
- **Keep it dense.** Rules total roughly 6,300 words across fourteen files for a reason. New prose
  earns its place by changing what an agent does, not by explaining what it already inferred.
- **Record calibrations.** If the rule deliberately departs from its source, say so and say why in
  the rule itself.
- **Re-measure.** Any change to a rule file, the index table, or a skill description can move
  routing behavior. Run all three eval suites before releasing; a ten-word edit has moved results
  before.

A new rule file also needs one index row in `SKILL.md` describing *when to read it*, phrased as
triggers rather than a topic label — and at least one eval scenario expecting it, or the row is
untested.

## Writing a language profile

A profile is one file, roughly 500 words, with exactly three powers:

1. **Bind** rule vocabulary to real names: primitives, forbidden escape hatches and strictness
   settings, the boundary-parse API, test declaration form, the doc system, packaging, and the
   ambient access that belongs only in adapters.
2. **Append** ecosystem rules the generic set cannot know — ownership and `unsafe` boundaries, RAII,
   global-scope hygiene — cited as `<profile> A1`, `A2`, and so on.
3. **Waive** a rule anchor with a stated reason (`13: n/a — no serverless target`), since anchors
   stay citable in every ecosystem even where a rule does not apply.

A profile never contradicts a rule's intent and never states a repository's paths or commands —
those are the guide's job. Set `tenets.json`'s legacy `profile` field for one profile
(`typescript` is the default), or associate profile names with repository-relative path globs in
`profiles`. Tasks load every profile matching their file scope; unknown or cross-cutting tasks load
all configured profiles. The `profile` field is a fallback for paths no configured profile matches.
Ship the primitives the profile fixes, or name where they live in the guide.

## Populating a project guide

Run `/tenets-init`, which pre-fills every slot it can prove from the repository and flags the rest.
Then read it as a human, because two slots decide most agent behavior: the **Commands** table (which
command is the acceptance gate, which are expensive or live) and **Rule addenda and recorded
deviations**.

Guide discipline:

- Under ~600 words. It is read far more often than any rule, so every sentence pays rent.
- Facts an agent cannot infer from code or config. Never restate a README or a rule.
- Ecosystem-wide facts the profile already fixes — strictness settings, doc tags, test declaration
  form — do not belong here.
- Every deviation carries its anchor and reason, because `/tenets-audit` suppresses findings those
  deviations cover. An unrecorded deviation reads as a violation in review.

`/tenets-check` audits all of that later, including whether the template version still matches.

## Writing a workflow skill

Workflow skills are procedures that apply the rules. They live as sibling directories next to
`tenets/` — nested skills are silently dropped by the installer — and they restate **zero** rule
content, citing anchors instead.

The contract each one follows:

- **Resolve the ruleset first.** Locate the installed `tenets` skill directory explicitly; a
  relative path resolves against the session's working directory, not the skill file, which is a
  silent failure. Stop with a clear message when it is missing, and check `metadata.requires`
  against the ruleset's version so stale installs cannot cite anchors that no longer exist.
- **Reuse the shared contracts.** `workflow/findings.md` owns the finding grammar, severity source,
  confidence handling, dedup, and summary line; `workflow/scope.md` owns guide slots, git scope
  modes, thresholds, dimensions, and degradation. Never write a second copy of either.
- **Gate scope first and cheaply.** Stop conditions before any expensive reading, and numeric
  thresholds that decide effort.
- **State the write posture in the first block.** Read-only, or exactly what it may write and when.
  A skill that edits code stops for approval and says so in a fixed line.
- **Degrade explicitly.** No project guide, no remote, no parallel workers, no `gh` — each has a
  defined behavior rather than an error.
- **Escalate rather than loop.** Three failed attempts at any step reports a state instead of
  thrashing.

### Portability rules

The same file must work in every harness the installer targets, so:

- Frontmatter stays close to the spec's six keys. `disable-model-invocation` is honored by Claude
  Code and Cursor and ignored elsewhere; anything beyond that risks a hard validation error.
- No `context: fork`, hooks, or shell-output injection — all single-harness mechanisms.
- **No positional argument placeholders.** `$1` is the first argument in Codex and opencode and the
  second in Claude Code. Use `$ARGUMENTS` once, inside a prose `## Arguments` section, with a
  fallback for harnesses that substitute nothing.
- Express fan-out as intent — "dispatch one worker per section if you can, otherwise run them in
  order; the output must be identical either way" — never as a tool call.
- Name the skill in the routing mandate. A hidden description means nothing advertises it, so the
  always-loaded AGENTS.md line is what makes it discoverable.

### Then measure it

Add positive rows to `evals/invocation.tsv` with the phrasings a user would actually type, and
adversarial near-misses that must **not** reach it. Run the routing suite too: a new skill competing
for activation with ordinary code work is the failure worth catching, and the scorer fails any
ordinary scenario a workflow skill answered.

Finally, invoke it for real once. Every path-resolution and permission bug in this repository was
found by a live smoke test, not by reading files.
