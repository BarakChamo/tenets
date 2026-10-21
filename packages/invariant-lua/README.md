# tenets-invariant-lua

Dependency-free invariant checks for Lua 5.1+ and Roblox Luau. LuaRocks installs the stock Lua
module `tenets_invariant` from `src/tenets_invariant.lua`; Wally exposes the typed Luau entry at
`src/init.luau`.

```lua
local Invariant = require("tenets_invariant")

Invariant.invariant(workspaceId ~= nil, "workspace id must exist")
Invariant.invariant(revision > 0, "workspace %s has invalid revision %s", workspaceId, revision)

local productionInvariant = Invariant.createInvariant({ mode = "production", code = "ERR_WORKSPACE" })
productionInvariant(workspaceId ~= nil)
```

Failures throw a structured table with `name = "InvariantError"`, `message`, `code`, `docsUrl`,
`details`, and `cause`. `tostring` includes the error name and message. `createInvariant` supports
development diagnostics, production message stripping, metadata, and configurable message
requirements. Use `isInvariantError` to identify one across `pcall` boundaries. Checks use Lua
truthiness (`nil` and `false` fail; `0` and empty strings are truthy).
Use Result values for expected failures.

The Lua module maps to the `tenets-invariant-lua` LuaRocks package; Roblox projects can depend on
the `tenets/invariant-lua` Wally package. Both manifests are included beside the module source.

Run the Luau runtime contract tests from the repository root with
`lune run packages/invariant-lua/tests.luau`.

For roblox-ts, install `@rbxts/tenets-invariant-lua`. Its npm artifact contains the same native Luau
implementation plus TypeScript declarations; it does not ship a TypeScript runtime implementation.

```ts
import * as Invariant from "@rbxts/tenets-invariant-lua";

Invariant.invariant(workspaceId !== undefined, "workspace id must exist");
```
