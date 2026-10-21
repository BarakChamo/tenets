--!strict
-- Typed facade over the stock-Lua-compatible implementation.

export type InvariantError = {
	name: "InvariantError",
	message: string?,
	code: string?,
	docsUrl: string?,
	details: unknown?,
	cause: unknown?,
}

export type Options = {
	mode: ("development" | "production")?,
	message: string?,
	code: string?,
	docsUrl: string?,
	details: unknown?,
	cause: unknown?,
	strippedMessage: string?,
	requireMessageInDevelopment: boolean?,
}

export type Api = {
	isInvariantError: (value: unknown) -> boolean,
	invariant: (condition: unknown, message: string, ...unknown) -> (),
	createInvariant: (options: Options?) -> (condition: unknown, message: string?, ...unknown) -> (),
}

local implementation = script:WaitForChild("tenets_invariant") :: ModuleScript
local invariantModule = require(implementation)

local function isInvariantError(value: unknown): boolean
	return invariantModule.isInvariantError(value)
end

local function invariant(condition: unknown, message: string, ...: unknown): ()
	invariantModule.invariant(condition, message, ...)
end

local function createInvariant(options: Options?): (condition: unknown, message: string?, ...: unknown) -> ()
	local configured = invariantModule.createInvariant(options)
	return function(condition: unknown, message: string?, ...: unknown): ()
		configured(condition, message, ...)
	end
end

local api: Api = {
	isInvariantError = isInvariantError,
	invariant = invariant,
	createInvariant = createInvariant,
}

return api
