local Result = require("./src/tenets_result")

local success = Result.ok(2)
assert(Result.isOk(success) and not Result.isErr(success))
assert(Result.map(success, function(value) return value * 3 end).value == 6)
assert(Result.andThen(success, function(value) return Result.ok(value + 1) end).value == 3)
assert(Result.match(success, { ok = function(value) return value end, err = function() error("wrong branch") end }) == 2)
assert(Result.unwrapOr(success, 0) == 2)

local problem = { code = "E_TEST" }
local failure = Result.err(problem)
assert(Result.isErr(failure) and failure.error == problem)
assert(Result.map(failure, function() error("must short circuit") end) == failure)
assert(Result.mapErr(failure, function(value) return value.code end).error == "E_TEST")
assert(Result.andThen(failure, function() error("must short circuit") end) == failure)
assert(Result.match(failure, { ok = function() error("wrong branch") end, err = function(value) return value.code end }) == "E_TEST")
assert(Result.unwrapOr(failure, "fallback") == "fallback")

local combined = Result.combine({ Result.ok("first"), Result.ok(nil), Result.ok("third") })
assert(Result.isOk(combined) and combined.value.n == 3)
assert(combined.value[1] == "first" and combined.value[2] == nil and combined.value[3] == "third")
assert(Result.combine({ Result.ok(1), failure }) == failure)

local tried = Result.trySync(function() return 42 end, tostring)
assert(Result.isOk(tried) and tried.value == 42)
local caught = Result.trySync(function() error("broken") end, function(value) return string.find(value, "broken", 1, true) ~= nil end)
assert(Result.isErr(caught) and caught.error == true)

print("result-lua: all tests passed")
