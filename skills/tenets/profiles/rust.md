# Rust Profile

Rules state principles, this profile binds them to Rust, and the project guide records supported
toolchains, targets, paths, commands, and deviations. Select with `"profile": "rust"` in
`tenets.json`, or map Rust paths to `rust` in a mixed project's `profiles` object.

## Primitives (Rule 07.6)

Use `std::result::Result<T, E>` with `Ok(value)` and `Err(error)` for recoverable failures. Match
both variants or compose with `map`, `map_err`, and `and_then`; use `?` to propagate and
`collect::<Result<Vec<_>, E>>()` to combine an iterator, stopping at the first error. Do not add a
custom Result or ResultAsync crate. An `async fn` returns a future whose output can be `Result<T, E>`;
no async Result wrapper is needed. Rust has no `trySync` equivalent: APIs return errors explicitly.
Do not catch panics to convert programmer bugs into expected failures.

Use `assert!(condition, "message: {}", value)` for an impossible state. It panics in debug and
release builds; `debug_assert!` is disabled in release by default and must not guard a correctness invariant.
Invariant panics are programmer failures, not recovery paths. Never catch them to continue normal
work. Keep errors typed and contextual; projects may choose `thiserror` for library errors or
`anyhow` for application-level context.

## Type system and safety (Rules 07.7, 02.4, 09.1)

The compiler is the type checker. Preserve types at public and boundary contracts; model domain
failures with enums and do not erase them into strings or `Box<dyn Error>` before callers decide
whether they can recover. Use `Option<T>` for absence, `Result<T, E>` for expected failure, and
never `unwrap` / `expect` for an expected branch.

Keep `unsafe` blocks small and justified with a `// SAFETY:` comment that states the required
conditions and how they are upheld. Prefer safe abstractions at public boundaries. Do not use unsafe
code to bypass a type or ownership error.

## Boundaries and ownership (Rules 02.1, 03, 12)

Parse external data into domain types at the adapter. Use the project's declared parser, then check
semantic constraints with `TryFrom` or a focused constructor; deserialization alone does not prove
domain invariants. Preserve parsed values and return typed errors for malformed input. Keep I/O,
environment, clock, randomness, network, and process access at explicit adapters.

Prefer borrowing for read-only inputs and explicit ownership transfer for mutation. Make costly
clones visible. Use RAII for resources and scope-bound cleanup instead of manual protocols.

## Toolchain and quality gates (Rules 04, 05, 07, 08)

Use rustup stable, Cargo, rustfmt, and Clippy. Declare the supported minimum in `Cargo.toml` with
`rust-version`; pin an exact toolchain only when reproducibility requires it. The project guide
records actual commands.

Recommended gates are `cargo fmt --all -- --check`,
`cargo clippy --workspace --all-targets -- -D warnings`, and `cargo test --workspace`. The default
test run covers unit and integration tests, examples, and library doctests. Use built-in `#[test]`
and `#[cfg(test)]`; add a framework only for a demonstrated fixture or property-testing need. Test
supported feature configurations deliberately; `--all-features` may be invalid when features
conflict. Use `cargo-nextest` when its CI or execution features justify another tool, and run
doctests separately with it.

Document public items with rustdoc (`///`) and verify examples through doctests. Module visibility
defines crate APIs: expose deliberate `pub` items, keep implementation modules private, and import
other workspace crates through their public surfaces.

## Waivers

- **Rule 02.3, error-record shape:** Rust enum variants are the typed discriminator; a repeated
  `type` field adds no safety and is not required.
- **Rule 07.6, cross-language helper API:** the standard library's `Result` and `assert!` replace
  custom `ok` / `err`, `invariant`, and `ResultAsync` packages. The behavior remains: expected
  failures are returned, impossible states panic, and async operations return futures of `Result`.
- **Rule 02.5, exception translation:** Rust `Result`-returning APIs do not throw for expected
  failures; propagate with `?`. Panics remain invariant failures, not boundary errors to translate.
