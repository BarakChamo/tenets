-- Dependency-free invariant checks for stock Lua 5.1+ and Luau.
local M = {}
local DEFAULT_CODE = "ERR_INVARIANT"
local DEFAULT_STRIPPED_MESSAGE = "Invariant violation. Enable development diagnostics for the full error message."

local function formatMessage(message, values)
	if type(message) ~= "string" then
		return message
	end
	local index = 0
	return (string.gsub(message, "%%s", function()
		index = index + 1
		local value = values[index]
		if value == nil then
			return "nil"
		end
		return tostring(value)
	end))
end

local function createError(message, options)
	local problem = {
		name = "InvariantError",
		message = message,
		code = options.code or DEFAULT_CODE,
		docsUrl = options.docsUrl,
		details = options.details,
		cause = options.cause,
	}
	return setmetatable(problem, {
		__tostring = function(error)
			if error.message ~= nil then
				return error.name .. ": " .. error.message
			end
			return error.name
		end,
	})
end

function M.isInvariantError(value)
	return type(value) == "table" and value.name == "InvariantError"
end

function M.invariant(condition, message, ...)
	if type(message) ~= "string" then
		error(createError("invariant requires a string message", {
			details = { receivedType = type(message) },
		}), 2)
	end
	if condition then
		return
	end
	local formatted = formatMessage(message, { ... })
	error(createError(formatted, {}), 2)
end

function M.createInvariant(options)
	options = options or {}
	local production = options.mode == "production"
	local requireMessage = options.requireMessageInDevelopment
	if requireMessage == nil then
		requireMessage = not production
	end
	return function(condition, message, ...)
		if message == nil then
			message = options.message
		end
		if requireMessage and message == nil then
			error(createError("invariant requires an error message argument", options), 2)
		end
		if message ~= nil and type(message) ~= "string" then
			error(createError("invariant message must be a string", {
				code = options.code,
				docsUrl = options.docsUrl,
				details = { receivedType = type(message) },
				cause = options.cause,
			}), 2)
		end
		if condition then
			return
		end
		local failureMessage
		if production then
			failureMessage = options.strippedMessage or DEFAULT_STRIPPED_MESSAGE
		else
			failureMessage = formatMessage(message, { ... })
		end
		error(createError(failureMessage or DEFAULT_STRIPPED_MESSAGE, options), 2)
	end
end

return M
