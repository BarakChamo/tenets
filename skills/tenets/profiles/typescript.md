# TypeScript Profile

The language profile binds rule vocabulary to one ecosystem. Rules state the principle, this file
states the mechanism, the project guide states the project's paths and commands. A profile may bind
rule terms to real names, append ecosystem rules, and waive a rule anchor with a stated reason; it
never contradicts a rule's intent.

Applies to: TypeScript and JavaScript, including Node.js and browser targets.

## Primitives (Rule 07.6)

Exact names: `Result<T, E>` / `ResultAsync<T, E>` with `ok()` / `err()` constructors, and
`invariant(condition, message)` throwing `InvariantError`. Typed errors are discriminated objects
with a `type` field. The project guide names the packages that provide them.

## Type system (Rules 07.7, 02.4, 09.1)

Non-negotiable compiler settings: `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`. Forbidden escape hatches, each a BLOCK finding: `any`, `@ts-ignore` /
`@ts-expect-error` on production code, non-null assertion (`!`) on untrusted or nullable values,
and `as unknown as T`. Narrow `unknown` before use. Exported callable interfaces use function
properties, not method syntax, so strict parameter variance applies.

## Boundaries (Rules 02.1, 01.3)

Parse with a schema library's non-throwing API (`safeParse`-style) and use the parsed value; derive
the static type from the schema (`z.infer`-style) so runtime and compile-time contracts cannot
drift. The project guide names the schema library.

A boolean `validate`-style gate (Rule 3.5) fits only where nothing reads a parsed value **and** the
schema cannot repair its input: a fallback, default or coercion makes a repaired value answer
"valid", and the guard narrows the input type rather than the output. Everything else parses.

Schema compilation is a build-step concern before it is a runtime one. A build-time compiler emits
validators into the bundle, so nothing ships a compiler or reaches `new Function` — which a strict
content policy forbids and a browser bundle should not carry anyway. Reach for a runtime compiler
only where expected parses per process exceed the compile cost divided by the per-parse saving;
that is a measurement, not an assumption, and a contract parsed once per process (an environment
snapshot, say) never reaches it. Where compiled validators ship, the test suite runs them, so any
divergence from the interpreter fails the gate rather than production.

## Translating a throwing dependency (Rule 02.5)

```ts
try {
	return ok(await codeHost.pullRequest(id));
} catch (error) {
	if (error instanceof InvariantError) {
		throw error; // programmer bug — never laundered into a recoverable error
	}
	return err({ type: 'code_host_unavailable', provider: 'github', cause: error });
}
```

## Idioms (Rules 03.4, 03.8)

Prefer `map` / `filter` / `flatMap`; use a named loop when `reduce` would obscure state. Immutability
means `const`, `readonly`, spreads, and non-mutating transforms (`toSorted` over `sort`). Ambient
access that belongs only in adapters: `process.env`, `console`, `process.exit`, `Date.now`,
`Math.random`.

## Tests (Rules 04.1, 04.6)

Import `describe` / `it` explicitly from the project's runner — never rely on globals. `describe`
names the public unit, `it` names observable behavior, Given/When/Then comments carry the example,
and rejection tests assert the message:

```ts
describe('Package.operation', () => {
	it('should return ConflictError when saving a stale draft', () => {
		// Given: a draft based on an outdated revision
		// When: the caller attempts the save
		// Then: save returns a typed conflict error
	});
});
```

## Documentation (Rules 05.2, 05.3)

JSDoc is the doc system: `@param`, `@returns`, `@throws {InvariantError}` for programmer-error
throws only, `@example` when usage is non-obvious, `@remarks` for known abstraction leaks,
`@internal` for test-only exports. Types replace redundant `@param` / `@returns` restatements.

## Packaging (Rules 07.1–07.3)

Implementation lives in `src/`. `package.json` `exports` is the public API; subpath exports carry
cohesive modules and broad root barrels are prohibited. Package-internal references may use
`imports` aliases such as `#internal/*`. Cross-workspace imports use the installed package name,
never a path into another workspace's `src`.

## Boundary enforcement (Rules 07.2, 07.3, 07.10)

Mechanisms, strongest first. Prefer the ones the platform already gives you (Rule 10.4).

- **`package.json` `exports` is the only unbypassable layer.** An unlisted subpath fails to resolve
  with `ERR_PACKAGE_PATH_NOT_EXPORTED`, so a slice's internals are unreachable rather than merely
  discouraged. `imports` with `#internal/*` marks intra-package internals and requires
  `moduleResolution` `bundler`, `node16`, or `nodenext`; `resolvePackageJsonImports: false` silently
  disables it.
- **Workspace-graph enforcement** (`turbo boundaries`, `@nx/enforce-module-boundaries`) polices
  package seams, including whether an import is a declared dependency at all, and cascades through
  dependency chains. It cannot see inside a package, so slice-to-slice rules within one workspace are
  out of reach — promoting the slice to a workspace is usually the cheaper fix (Rule 7.10). Check
  the stability of whichever you adopt: Turborepo marks boundaries experimental, and the Nx rule
  requires an Nx project graph.
- **Unused exports** are how "smallest useful surface" (Rule 7.3) gets checked. `knip` reports
  them, but only counts a barrel's exports when `includeEntryExports` is enabled — off by default,
  so public-surface enforcement is opt-in.
- **Lint-level import rules** cover cycles and coarse path bans. Note for oxlint specifically: it
  implements `import/no-cycle` and `eslint/no-restricted-imports` (with `paths` and `patterns`) but
  **not** `import/no-restricted-paths`, and its Rust regex has no lookahead — so the usual "any
  slice except my own" pattern cannot be expressed that way.
- **A path-pattern dependency linter** — `dependency-cruiser` is the mature option — is the heavier
  fallback when the above genuinely cannot express the rule. Its cross-slice rule uses a capture
  group with a backreference written `$1` (not `\1`), and the group must appear in both the `from`
  and `to` patterns or the self-exclusion silently fails.
- **`@internal` with `stripInternal` enforces nothing** — it affects declaration emit only, and the
  compiler does not verify the result stays consistent. Treat it as documentation.

## Runtime (Rule 13)

Rule 13 applies to JavaScript serverless platforms: `Promise.all` for independent work, module-scope
client reuse, `after()`-style post-response hooks, streaming responses. The project guide names the
platform and its limits.

## Waivers

None — every rule anchor applies as written.
