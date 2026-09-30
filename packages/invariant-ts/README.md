# @tenets/invariant

`invariant(condition, message)` for states that are impossible when the code is correct, throwing
`InvariantError`. Never catch an invariant failure to recover (Rule 2.2) — it marks a programmer
bug, not a recoverable condition.

The tenets ruleset's TypeScript profile fixes these API names (Rule 7.6); your project guide records
where the package lives.

## Credit

Descends from Facebook's classic [`invariant`](https://www.npmjs.com/package/invariant) (of
fbjs/React lineage) and Alex Reardon's [`tiny-invariant`](https://github.com/alexreardon/tiny-invariant),
keeping the familiar `%s` message formatting. This package exists for what production assertion
handling needs beyond a bare throw:

- **A typed failure class** — `InvariantError` with stable `code`, optional `docsUrl`, structured
  `details`, and `cause`, so crash reporting can group and link failures.
- **Configurable production stripping** — `createInvariant({ mode: 'production' })` strips
  diagnostic messages (which may embed sensitive values) while the check itself always runs;
  development mode requires messages so diagnostics cannot silently go missing.
- Zero dependencies.
