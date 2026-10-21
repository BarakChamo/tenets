# Dimension 1 — Boundaries and errors (Rule 02, plus every applicable language profile)

- Does untrusted input entering a trust boundary get parsed by the schema that owns the operation,
  rather than hand-checked or cast? (2.1)
- Does the package that owns a public operation own and export its schema? (2.1, 7.4)
- Are recoverable failures typed values with a discriminated kind and enough context for callers and
  tests, rather than bare strings, `null`, or untyped throws? (2.3, 2.4)
- Is every result consumed — matched, mapped, returned, or explicitly unwrapped? (2.4)
- Are invariants limited to states impossible in correct code, and never caught to recover? (2.2)
- Does a throwing dependency get translated exactly once at its adapter seam, with the decision
  recorded in the adapter's contract? (2.3)
- Does a translation `catch` rethrow anything outside the boundary's declared error contract, and
  rethrow invariant failures unchanged? (2.4, 2.5)
- Are preconditions asserted at entry and postconditions re-established before return where a
  trusted operation makes a promise worth checking? (2.2, the airlock)
- Is `try/catch` used for failure translation only, never for business branching? (2.4)
- Are the type-system escape hatches the profile forbids absent from production code? (7.7)
- Do caller-facing errors avoid leaking secrets, internal locations, or raw upstream payloads? (11.4)
