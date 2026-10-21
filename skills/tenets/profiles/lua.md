# Lua and Luau Profile

Rules state principles, this profile binds them to Lua and Luau, and the project guide records
runtime versions, paths, commands, and deviations. Select with `"profile": "lua"` in
`tenets.json`, or add a path-scoped `lua` entry to the `profiles` map in a mixed project.

Applies to stock Lua and Roblox Luau. The project guide must identify the actual dialect and version:
Lua 5.1/5.4 and Luau have different standard libraries, module loaders, type systems, and runtime
facilities. Do not assume Roblox globals (`game`, `Instance`, `task`) exist outside Roblox.

## Primitives (Rule 07.6)

Use `Result<T, E>` with `ok(value)` / `err(error)` constructors and `invariant(condition, message)`
raising a structured `InvariantError`. The reference modules are `tenets_result` and
`tenets_invariant`; the guide names their package and module paths. Results are tagged tables
(`ok = true` with `value`, or `ok = false` with `error`); branch on the tag before accessing the
corresponding payload. Provide `isOk` / `isErr`,
`map`, `mapErr`, `andThen`, `match`, `unwrapOr`, `combine`, and `trySync`. The guide names the
module paths. Invariant failures are programmer errors; expected failures use `Err`. Do not use
`assert` as a substitute for the configured invariant API.

Lua has no standard Promise or async/await contract. Keep Result synchronous and adapt to the
project's scheduler or Promise library at its boundary. Never swallow a thrown invariant while
translating a dependency failure.

## Type system (Rules 07.7, 02.4, 09.1)

In Luau modules, begin with `--!strict`; do not disable checking to make a gate pass. Annotate public
parameters, returns, exported tables, callback types, and generic Result variants. Prefer explicit
unions and narrowing on the literal `ok` tag; avoid `any` and casts that claim unproved types. A
stock Lua target has no static type checker: keep that source parseable by the declared Lua version,
and type-check a Luau-specific surface separately when both dialects are supported.

## Boundaries and errors (Rules 02.1–02.5)

Validate external tables at the adapter that receives them. Treat missing keys, false values, and
`nil` distinctly; Lua's `and`/`or` fallback idiom loses a legitimate `false`. Return a typed `Err`
for expected malformed input and preserve the validated value. A `trySync`/`pcall` error mapper must
rethrow invariants and unexpected programmer failures instead of converting them to `Err`. Keep
`pcall` around the smallest foreign call that declares a throwing contract.

## Idioms and state (Rules 03, 12)

Use local scope by default; export a deliberate module table and avoid global writes. Prefer explicit
loops over callback-heavy chains when control flow or mutation is involved. Copy inputs before
normalizing caller-owned tables. Lua tables are mutable; Luau `table.freeze` is shallow and not
available in stock Lua, so do not promise deep immutability from it.

## Tests, docs, packaging (Rules 04, 05, 07, 08)

Use the repository's declared Lua/Luau test runner and import it explicitly. Keep tests parseable by
the dialect they claim to cover; run Roblox-dependent tests in the Roblox-compatible environment.
Use concise module comments for module responsibility and document public functions with parameter,
return, failure, and example information where needed.

Package modules through the ecosystem selected by the project: LuaRocks for stock Lua, Wally for
Roblox Luau, or project-owned source modules. For roblox-ts, pair an `@rbxts/` declaration package
with the native `.lua` module entrypoint; keep its TypeScript package type-only so consumers execute
the same Luau implementation. Record the tested Lua/Luau versions, module loader,
test/type-check/format/lint commands, and publishing mechanism in the project guide. A `.lua` file
must not silently depend on Luau syntax or Roblox globals.

## Waivers

None — every rule's intent applies; static typing and async APIs are available only where the
selected dialect and runtime support them.
