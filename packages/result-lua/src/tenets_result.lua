-- A dependency-free Result module for stock Lua 5.1+ and Luau.
local Result = {}

local function freeze(value)
	if type(table.freeze) == "function" then
		return table.freeze(value)
	end
	return value
end

local function valid(result)
	if type(result) ~= "table" or (result.ok ~= true and result.ok ~= false) then
		error("expected a Result value", 3)
	end
	return result
end

function Result.ok(value)
	return freeze({ ok = true, value = value })
end

function Result.err(problem)
	return freeze({ ok = false, error = problem })
end

function Result.isOk(result)
	return type(result) == "table" and result.ok == true
end

function Result.isErr(result)
	return type(result) == "table" and result.ok == false
end

function Result.isRejectedResult(value)
	return type(value) == "table" and value.ok == false
end

function Result.map(result, transform)
	valid(result)
	if result.ok then
		return Result.ok(transform(result.value))
	end
	return result
end

function Result.mapErr(result, transform)
	valid(result)
	if result.ok then
		return result
	end
	return Result.err(transform(result.error))
end

function Result.andThen(result, transform)
	valid(result)
	if result.ok then
		return valid(transform(result.value))
	end
	return result
end

function Result.match(result, handlers)
	valid(result)
	if type(handlers) ~= "table" then
		error("expected Result handlers", 2)
	end
	local handler
	local value
	if result.ok then
		handler = handlers.ok
		value = result.value
	else
		handler = handlers.err
		value = result.error
	end
	if type(handler) ~= "function" then
		error("missing Result handler", 2)
	end
	return handler(value)
end

function Result.unwrapOr(result, fallback)
	valid(result)
	if result.ok then
		return result.value
	end
	return fallback
end

function Result.combine(results)
	local values = {}
	local count = 0
	for index, result in ipairs(results) do
		valid(result)
		if not result.ok then
			return result
		end
		values[index] = result.value
		count = index
	end
	values.n = count
	return Result.ok(freeze(values))
end

function Result.trySync(operation, mapError)
	if type(operation) ~= "function" or type(mapError) ~= "function" then
		error("trySync expects an operation and an error mapper", 2)
	end
	local succeeded, value = pcall(operation)
	if succeeded then
		return Result.ok(value)
	end
	return Result.err(mapError(value))
end

return Result
