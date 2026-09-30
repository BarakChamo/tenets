/**
 * @description Typed Result and ResultAsync primitives for recoverable failures.
 *
 * @module @principles/result
 */

/**
 * @description Value that may be returned immediately or through a Promise-like async boundary.
 *
 * @template T - Resolved value type.
 */
export type MaybePromise<T> = T | PromiseLike<T>;

/**
 * @description Successful Result variant.
 *
 * @template T - Successful value type.
 */
export interface Ok<T> {
	readonly ok: true;
	readonly value: T;
}

/**
 * @description Failed Result variant.
 *
 * @template E - Typed recoverable error value.
 */
export interface Err<E> {
	readonly ok: false;
	readonly error: E;
}

/**
 * @description Discriminated union for operations that may return a typed recoverable failure.
 *
 * @template T - Successful value type.
 * @template E - Typed recoverable error value.
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * @description Handler object used to fold a Result into another value.
 *
 * @template T - Successful value type.
 * @template E - Typed recoverable error value.
 * @template U - Folded return type.
 */
export interface ResultHandlers<T, E, U> {
	readonly ok: (value: T) => U;
	readonly err: (error: E) => U;
}

/**
 * @description Values accepted by ResultAsync chaining operations.
 *
 * @template T - Successful value type.
 * @template E - Typed recoverable error value.
 */
export type ResultAsyncInput<T, E> = Result<T, E> | ResultAsync<T, E> | PromiseLike<Result<T, E>>;

/**
 * @description Creates a successful Result.
 *
 * @param value - Successful value.
 */
export const ok = <T>(value: T): Ok<T> =>
	Object.freeze({
		ok: true,
		value,
	});

/**
 * @description Creates a failed Result.
 *
 * @param error - Typed recoverable error value.
 */
export const err = <E>(error: E): Err<E> =>
	Object.freeze({
		error,
		ok: false,
	});

/**
 * @description Narrows a Result to its successful variant.
 *
 * @param result - Result to inspect.
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

/**
 * @description Narrows a Result to its failed variant.
 *
 * @param result - Result to inspect.
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

/**
 * @description Reports whether an unknown value is a rejected Result.
 *
 * @remarks
 *   For boundaries that run work of an unknown shape and must know whether it refused — a cache
 *   fence, a transaction wrapper — where `isErr` cannot be used because the value is not statically
 *   a Result. Callers that gate a commit or an invalidation on "did the work refuse" should share
 *   this one rule rather than each carrying their own copy.
 * @param value - Any value, including one that is not a Result at all.
 */
export const isRejectedResult = (value: unknown): boolean =>
	typeof value === 'object' && value !== null && 'ok' in value && value.ok === false;

/**
 * @description Transforms the successful value while preserving failures.
 *
 * @param result - Result to transform.
 * @param transform - Function applied only to successful values.
 */
export const map = <T, E, U>(result: Result<T, E>, transform: (value: T) => U): Result<U, E> =>
	isOk(result) ? ok(transform(result.value)) : result;

/**
 * @description Transforms the failed value while preserving successes.
 *
 * @param result - Result to transform.
 * @param transform - Function applied only to failed values.
 */
export const mapErr = <T, E, F>(result: Result<T, E>, transform: (error: E) => F): Result<T, F> =>
	isErr(result) ? err(transform(result.error)) : result;

/**
 * @description Chains a successful Result into another Result.
 *
 * @param result - Result to chain from.
 * @param transform - Function applied only to successful values.
 */
export const andThen = <T, E, U, F>(
	result: Result<T, E>,
	transform: (value: T) => Result<U, F>,
): Result<U, E | F> => (isOk(result) ? transform(result.value) : result);

/**
 * @description Folds a Result into a single return type.
 *
 * @param result - Result to fold.
 * @param handlers - Handlers for successful and failed variants.
 */
export const match = <T, E, U>(result: Result<T, E>, handlers: ResultHandlers<T, E, U>): U =>
	isOk(result) ? handlers.ok(result.value) : handlers.err(result.error);

/**
 * @description Returns the successful value or a fallback when the Result is failed.
 *
 * @param result - Result to unwrap.
 * @param fallback - Value returned when the Result is failed.
 */
export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
	isOk(result) ? result.value : fallback;

/**
 * @description Collapses a list of Results into one Result of all values, failing on the first error.
 *
 * @remarks
 *   Short-circuits: the returned failure is the first `Err` in list order, and later values are not
 *   inspected. For async work, resolve the operations first (for example with `Promise.all`) and
 *   combine the settled Results.
 * @param results - Results to combine, in order.
 */
export const combine = <T, E>(results: readonly Result<T, E>[]): Result<readonly T[], E> => {
	const values: T[] = [];
	for (const result of results) {
		if (isErr(result)) {
			return result;
		}
		values.push(result.value);
	}
	return ok(values);
};

/**
 * @description Captures a synchronous exception as a typed failed Result.
 *
 * @param operation - Synchronous operation to run.
 * @param mapUnknownError - Maps unknown thrown values into a typed error.
 */
export const trySync = <T, E>(
	operation: () => T,
	mapUnknownError: (error: unknown) => E,
): Result<T, E> => {
	try {
		return ok(operation());
	} catch (error) {
		return err(mapUnknownError(error));
	}
};

/**
 * @description Captures an async rejection as a typed failed Result.
 *
 * @param operation - Async operation to run.
 * @param mapUnknownError - Maps unknown thrown values into a typed error.
 */
export const tryAsync = async <T, E>(
	operation: () => Promise<T>,
	mapUnknownError: (error: unknown) => E,
): Promise<Result<T, E>> => {
	try {
		return ok(await operation());
	} catch (error) {
		return err(mapUnknownError(error));
	}
};

/**
 * @description Promise-backed Result composition primitive for recoverable async failures. It is thenable, so
 * `await resultAsync` returns `Result<T, E>`.
 *
 * @template T - Successful value type.
 * @template E - Typed recoverable error value.
 */
export class ResultAsync<T, E> implements PromiseLike<Result<T, E>> {
	readonly #promise: Promise<Result<T, E>>;

	private constructor(promise: PromiseLike<Result<T, E>>) {
		this.#promise = Promise.resolve(promise);
	}

	/**
	 * @description Wraps an existing sync Result in a ResultAsync.
	 *
	 * @param result - Result value to expose through async composition.
	 */
	public static fromResult<T, E>(result: Result<T, E>): ResultAsync<T, E> {
		return new ResultAsync(Promise.resolve(result));
	}

	/**
	 * @description Wraps a promise that already resolves to a Result.
	 *
	 * @remarks
	 *   Rejections are not converted because there is no mapper. Use `fromPromise` or `tryAsync` when
	 *   unknown rejections should become typed recoverable errors.
	 * @param promise - Promise-like value that resolves to a Result.
	 */
	public static fromResultPromise<T, E>(promise: PromiseLike<Result<T, E>>): ResultAsync<T, E> {
		return new ResultAsync(promise);
	}

	/**
	 * @description Wraps a promise and maps unknown rejections into typed failed Results.
	 *
	 * @param promise - Promise-like operation result.
	 * @param mapUnknownError - Maps unknown rejected values into typed errors.
	 */
	public static fromPromise<T, E>(
		promise: PromiseLike<T>,
		mapUnknownError: (error: unknown) => E,
	): ResultAsync<T, E> {
		const resultPromise = Promise.resolve(promise).then(
			(value) => ok(value),
			(error: unknown) => err(mapUnknownError(error)),
		);

		return new ResultAsync(resultPromise);
	}

	/**
	 * @description Creates a ResultAsync from an async operation and typed rejection mapper.
	 *
	 * @param operation - Operation to execute immediately.
	 * @param mapUnknownError - Maps unknown thrown or rejected values into typed errors.
	 */
	public static try<T, E>(
		operation: () => PromiseLike<T>,
		mapUnknownError: (error: unknown) => E,
	): ResultAsync<T, E> {
		try {
			return ResultAsync.fromPromise(operation(), mapUnknownError);
		} catch (error) {
			return ResultAsync.fromResult(err(mapUnknownError(error)));
		}
	}

	/**
	 * @description Supports `await resultAsync` and Promise-like interop.
	 *
	 * @param onfulfilled - Handler called when the underlying Result promise resolves.
	 * @param onrejected - Handler called when the underlying promise rejects.
	 */
	// Deliberately thenable: `await resultAsync` yielding Result<T, E> is the API.
	// oxlint-disable-next-line unicorn/no-thenable
	public async then<TResult1 = Result<T, E>, TResult2 = never>(
		onfulfilled?: ((value: Result<T, E>) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		return this.#promise.then(onfulfilled, onrejected);
	}

	/** @description Returns the underlying Result promise. */
	public async toPromise(): Promise<Result<T, E>> {
		return this.#promise;
	}

	/**
	 * @description Transforms the successful value while preserving async failures.
	 *
	 * @param transform - Function applied only to successful values.
	 */
	public map<U>(transform: (value: T) => MaybePromise<U>): ResultAsync<U, E> {
		return ResultAsync.fromResultPromise(
			this.#promise.then(async (result) =>
				isOk(result) ? ok(await transform(result.value)) : result,
			),
		);
	}

	/**
	 * @description Transforms the failed value while preserving async successes.
	 *
	 * @param transform - Function applied only to failed values.
	 */
	public mapErr<F>(transform: (error: E) => MaybePromise<F>): ResultAsync<T, F> {
		return ResultAsync.fromResultPromise(
			this.#promise.then(async (result) =>
				isErr(result) ? err(await transform(result.error)) : result,
			),
		);
	}

	/**
	 * @description Chains a successful ResultAsync into another sync or async Result.
	 *
	 * @param transform - Function applied only to successful values.
	 */
	public andThen<U, F>(transform: (value: T) => ResultAsyncInput<U, F>): ResultAsync<U, E | F> {
		return ResultAsync.fromResultPromise(
			this.#promise.then(async (result) => {
				if (isErr(result)) {
					return result;
				}

				return resolveResultAsyncInput(transform(result.value));
			}),
		);
	}

	/**
	 * @description Folds the async Result into one async return value.
	 *
	 * @param handlers - Handlers for successful and failed variants.
	 */
	public async match<U>(handlers: ResultHandlers<T, E, MaybePromise<U>>): Promise<U> {
		const result = await this.#promise;

		return match(result, handlers);
	}

	/**
	 * @description Resolves to the successful value or the fallback when failed.
	 *
	 * @param fallback - Value returned when the Result is failed.
	 */
	public async unwrapOr(fallback: T): Promise<T> {
		return unwrapOr(await this.#promise, fallback);
	}
}

const resolveResultAsyncInput = async <T, E>(
	input: ResultAsyncInput<T, E>,
): Promise<Result<T, E>> => {
	if (input instanceof ResultAsync) {
		return input.toPromise();
	}

	return input;
};
