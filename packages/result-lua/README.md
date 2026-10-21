# tenets-result-lua

Dependency-free tagged `Result<T, E>` values for Lua 5.1+ and Roblox Luau. LuaRocks installs the
stock Lua module `tenets_result` from `src/tenets_result.lua`; Wally exposes the typed Luau entry at
`src/init.luau`.

```lua
local Result = require("tenets_result")

local parsed = Result.trySync(function()
	return tonumber("42")
end, function(cause)
	return { type = "parse_failed", cause = cause }
end)

if parsed.ok then
	print(parsed.value)
else
	print(parsed.error.type)
end
```

The API includes `ok`, `err`, `isOk`, `isErr`, `isRejectedResult`, `map`, `mapErr`, `andThen`,
`match`, `unwrapOr`, `combine`, and `trySync`. `combine` preserves order, returns the first error,
and sets `value.n` to the value count so successful `nil` values remain distinguishable from gaps.
Callback failures propagate; `trySync` maps thrown values as the explicit boundary adapter, and its
mapper must rethrow invariants and unexpected programmer failures. If the
runtime provides `table.freeze`, result tables and the combined value list are shallow-frozen;
stock Lua versions without it return ordinary tables.

The Lua module maps to the `tenets-result-lua` LuaRocks package; Roblox projects can depend on the
`tenets/result-lua` Wally package. Both manifests are included beside the module source.

Run the Luau runtime contract tests from the repository root with
`lune run packages/result-lua/tests.luau`.

For roblox-ts, install `@rbxts/tenets-result-lua`. Its npm artifact contains the same native Luau
implementation plus TypeScript declarations; it does not ship a TypeScript runtime implementation.

```ts
import * as Result from "@rbxts/tenets-result-lua";

const parsed: Result.Result<number, string> = Result.ok(42);
```

Luau uses the same synchronous contract. Async behavior is intentionally owned by the project's
scheduler or Promise adapter; this package does not impose a Promise library.
