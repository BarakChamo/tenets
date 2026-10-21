export interface Ok<T> {
	readonly ok: true;
	readonly value: T;
}

export interface Err<E> {
	readonly ok: false;
	readonly error: E;
}

export type Result<T, E> = Ok<T> | Err<E>;
export type Combined<T> = T[] & { readonly n: number };

export interface Handlers<T, E, U> {
	readonly ok: (value: T) => U;
	readonly err: (error: E) => U;
}

export declare function ok<T>(value: T): Ok<T>;
export declare function err<E>(error: E): Err<E>;
export declare function isOk<T, E>(result: Result<T, E>): result is Ok<T>;
export declare function isErr<T, E>(result: Result<T, E>): result is Err<E>;
export declare function isRejectedResult(value: unknown): boolean;
export declare function map<T, E, U>(result: Result<T, E>, transform: (value: T) => U): Result<U, E>;
export declare function mapErr<T, E, F>(result: Result<T, E>, transform: (error: E) => F): Result<T, F>;
export declare function andThen<T, E, U, F>(
	result: Result<T, E>,
	transform: (value: T) => Result<U, F>,
): Result<U, E | F>;
export declare function match<T, E, U>(result: Result<T, E>, handlers: Handlers<T, E, U>): U;
export declare function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T;
export declare function combine<T, E>(results: readonly Result<T, E>[]): Result<Combined<T>, E>;
export declare function trySync<T, E>(operation: () => T, mapError: (error: unknown) => E): Result<T, E>;
