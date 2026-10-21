local Invariant = require("./src/tenets_invariant")

Invariant.invariant(true, "this should pass")

local ok, failure = pcall(function()
	Invariant.invariant(false, "expected %s: %s", "value", 7)
end)
assert(not ok and Invariant.isInvariantError(failure))
assert(failure.message == "expected value: 7")
assert(failure.code == "ERR_INVARIANT")

local configured = Invariant.createInvariant({ mode = "development", code = "ERR_STATE", docsUrl = "https://example.test/docs" })
local configuredOk, configuredFailure = pcall(function()
	configured(false, "state %s", "invalid")
end)
assert(not configuredOk and configuredFailure.code == "ERR_STATE")
assert(configuredFailure.docsUrl == "https://example.test/docs")
assert(configuredFailure.message == "state invalid")

local production = Invariant.createInvariant({ mode = "production", message = "internal details", code = "ERR_PRIVATE" })
local productionOk, productionFailure = pcall(function()
	production(false)
end)
assert(not productionOk and productionFailure.code == "ERR_PRIVATE")
assert(productionFailure.message == "Invariant violation. Enable development diagnostics for the full error message.")
assert(not string.find(productionFailure.message, "internal details", 1, true))

local missingMessageOk, missingMessageFailure = pcall(function()
	configured(false)
end)
assert(not missingMessageOk and Invariant.isInvariantError(missingMessageFailure))
assert(missingMessageFailure.message == "invariant requires an error message argument")

print("invariant-lua: all tests passed")
