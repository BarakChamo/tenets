# @tenets/result

`Result<T, E>` / `ResultAsync<T, E>` with `ok`, `err`, `isOk`, `isErr`, `map`, `mapErr`, `andThen`,
`match`, `unwrapOr`, `combine`, `trySync`, `tryAsync` — typed recoverable failures as values.

The tenets ruleset's TypeScript profile fixes these API names (Rule 7.6); your project guide records
where the package lives.

## Credit

The API shape follows [neverthrow](https://github.com/supermacro/neverthrow), the library that made
Result types idiomatic in TypeScript, with lineage back to Rust's `Result`, fp-ts's `Either`, and
Scott Wlaschin's railway-oriented programming. This package exists for a smaller, stricter core:

- **Zero dependencies, plain frozen objects** — `ok`/`err` return frozen discriminated literals
  (`{ ok: true, value }`), so results serialize, structurally compare, and cross boundaries without
  class-instance identity problems.
- **Thenable async composition** — `await resultAsync` yields `Result<T, E>` directly.
- **`combine`** for first-error aggregation, and consumed-result discipline designed to pair with
  the ruleset's prohibitions (no dropped Results, no invariant laundering).
