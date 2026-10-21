--!strict
-- Typed facade over the stock-Lua-compatible implementation.

export type Ok<T> = { ok: true, value: T }
export type Err<E> = { ok: false, error: E }
export type Result<T, E> = Ok<T> | Err<E>
export type Combined<T> = { [number]: T, n: number }

export type Handlers<T, E, U> = {
	ok: (value: T) -> U,
	err: (error: E) -> U,
}

export type Api = {
	ok: <T>(value: T) -> Result<T, never>,
	err: <E>(problem: E) -> Result<never, E>,
	isOk: <T, E>(result: Result<T, E>) -> boolean,
	isErr: <T, E>(result: Result<T, E>) -> boolean,
	isRejectedResult: (value: unknown) -> boolean,
	map: <T, E, U>(result: Result<T, E>, transform: (value: T) -> U) -> Result<U, E>,
	mapErr: <T, E, F>(result: Result<T, E>, transform: (error: E) -> F) -> Result<T, F>,
	andThen: <T, E, U, F>(result: Result<T, E>, transform: (value: T) -> Result<U, F>) -> Result<U, E | F>,
	match: <T, E, U>(result: Result<T, E>, handlers: Handlers<T, E, U>) -> U,
	unwrapOr: <T, E>(result: Result<T, E>, fallback: T) -> T,
	combine: <T, E>(results: { Result<T, E> }) -> Result<Combined<T>, E>,
	trySync: <T, E>(operation: () -> T, mapError: (unknown) -> E) -> Result<T, E>,
}

local implementation = script:WaitForChild("tenets_result") :: ModuleScript
local resultModule = require(implementation)

local function ok<T>(value: T): Result<T, never>
	return resultModule.ok(value)
end

local function err<E>(problem: E): Result<never, E>
	return resultModule.err(problem)
end

local function isOk<T, E>(result: Result<T, E>): boolean
	return resultModule.isOk(result)
end

local function isErr<T, E>(result: Result<T, E>): boolean
	return resultModule.isErr(result)
end

local function isRejectedResult(value: unknown): boolean
	return resultModule.isRejectedResult(value)
end

local function map<T, E, U>(result: Result<T, E>, transform: (value: T) -> U): Result<U, E>
	return resultModule.map(result, transform)
end

local function mapErr<T, E, F>(result: Result<T, E>, transform: (error: E) -> F): Result<T, F>
	return resultModule.mapErr(result, transform)
end

local function andThen<T, E, U, F>(
	result: Result<T, E>,
	transform: (value: T) -> Result<U, F>
): Result<U, E | F>
	return resultModule.andThen(result, transform)
end

local function match<T, E, U>(result: Result<T, E>, handlers: Handlers<T, E, U>): U
	return resultModule.match(result, handlers)
end

local function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T
	return resultModule.unwrapOr(result, fallback)
end

local function combine<T, E>(results: { Result<T, E> }): Result<Combined<T>, E>
	return resultModule.combine(results)
end

local function trySync<T, E>(operation: () -> T, mapError: (unknown) -> E): Result<T, E>
	return resultModule.trySync(operation, mapError)
end

local api: Api = {
	ok = ok,
	err = err,
	isOk = isOk,
	isErr = isErr,
	isRejectedResult = isRejectedResult,
	map = map,
	mapErr = mapErr,
	andThen = andThen,
	match = match,
	unwrapOr = unwrapOr,
	combine = combine,
	trySync = trySync,
}

return api
