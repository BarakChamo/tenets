/**
 * @description Verifies asynchronous result composition, matching, recovery, and error preservation.
 *
 * @module @principles/result
 */

import { describe, expect, it, vi } from 'vitest';

import { ResultAsync, err, match, ok } from './index';
import type { Ok, Result } from './index';

interface ParseError {
	readonly type: 'ParseError';
	readonly input: string;
}

interface TimeoutError {
	readonly type: 'TimeoutError';
	readonly provider: string;
}

const toParseError = (error: unknown): ParseError => ({
	input: error instanceof Error ? error.message : String(error),
	type: 'ParseError',
});

const throwMissingToken = (): never => {
	throw new Error('missing token');
};

const parseId = (input: string): Result<number, ParseError> => {
	const parsed = Number(input);
	return Number.isInteger(parsed) ? ok(parsed) : err({ input, type: 'ParseError' });
};

// Given: async Result helpers wrap values, exceptions, and nested Result values.
// When: callers map, chain, match, unwrap, and cross promise boundaries.
// Then: success and failure semantics remain explicit and typed.

describe('ResultAsync', () => {
	it('should wrap a synchronous successful result', async () => {
		expect.hasAssertions();
		const asyncResult = await ResultAsync.fromResult(ok(42));
		expect(asyncResult).toStrictEqual(ok(42));
	});

	it('should wrap a promise that resolves to a result', async () => {
		expect.hasAssertions();
		const promise = Promise.resolve(ok('loaded') as Result<string, ParseError>);
		const result = await ResultAsync.fromResultPromise(promise);
		expect(result).toStrictEqual(ok('loaded'));
	});

	it('should map promise rejections into typed errors', async () => {
		expect.hasAssertions();
		const promise = Promise.reject(new Error('provider timeout'));
		const result = await ResultAsync.fromPromise(promise, toParseError);
		expect(result).toStrictEqual(err({ input: 'provider timeout', type: 'ParseError' }));
	});

	it('should execute async operations through ResultAsync.try', async () => {
		expect.hasAssertions();
		const result = await ResultAsync.try(async () => 'page-content', toParseError);
		expect(result).toStrictEqual(ok('page-content'));
	});

	it('should capture synchronously thrown async-operation setup errors', async () => {
		expect.hasAssertions();

		const result = await ResultAsync.try(throwMissingToken, toParseError);
		expect(result).toStrictEqual(err({ input: 'missing token', type: 'ParseError' }));
	});

	it('should map successful async values', async () => {
		expect.hasAssertions();
		const mapped = await ResultAsync.fromResult(ok(2)).map((value) => value * 4);
		expect(mapped).toStrictEqual(ok(8));
	});

	it('should not call async map transforms for failed results', async () => {
		expect.hasAssertions();
		const result = ResultAsync.fromResult(err<ParseError>({ input: 'abc', type: 'ParseError' }));
		const transform = vi.fn<() => number>(() => 1);

		const mapped = await result.map(() => transform());

		expect(transform).not.toHaveBeenCalled();
		expect(mapped).toStrictEqual(err({ input: 'abc', type: 'ParseError' }));
	});

	it('should map failed async values', async () => {
		expect.hasAssertions();
		const result = ResultAsync.fromResult(err<ParseError>({ input: 'abc', type: 'ParseError' }));

		const mapped = await result.mapErr((error): TimeoutError => ({
			provider: error.input,
			type: 'TimeoutError',
		}));

		expect(mapped).toStrictEqual(err({ provider: 'abc', type: 'TimeoutError' }));
	});

	it('should not call async mapErr transforms for successful results', async () => {
		expect.hasAssertions();
		const result = ResultAsync.fromResult(ok(3));
		const transform = vi.fn<() => ParseError>(() => ({ input: 'abc', type: 'ParseError' }));

		const mapped = await result.mapErr(transform);

		expect(transform).not.toHaveBeenCalled();
		expect(mapped).toStrictEqual(ok(3));
	});

	it('should chain successful async values into sync, async, and promised results', async () => {
		expect.hasAssertions();
		const syncChained = await ResultAsync.fromResult(ok(5)).andThen((value) => ok(String(value)));
		const asyncChained = await ResultAsync.fromResult(ok('members/alice')).andThen((path) =>
			ResultAsync.fromPromise(Promise.resolve(`# ${path}`), toParseError),
		);
		const promisedChained = await ResultAsync.fromResult(ok(5)).andThen((value) => ok(value + 1));

		expect(syncChained).toStrictEqual(ok('5'));
		expect(asyncChained).toStrictEqual(ok('# members/alice'));
		expect(promisedChained).toStrictEqual(ok(6));
	});

	it('should preserve first and downstream async failures when chaining', async () => {
		expect.hasAssertions();
		const firstFailure = ResultAsync.fromResult(
			err<ParseError>({ input: 'abc', type: 'ParseError' }),
		);
		const transform = vi.fn<() => Ok<number>>(() => ok(1));
		const downstreamFailure = ResultAsync.fromResult(ok('cms')).andThen((provider) =>
			ResultAsync.fromResult(err<TimeoutError>({ provider, type: 'TimeoutError' })),
		);

		await expect(firstFailure.andThen(transform)).resolves.toStrictEqual(
			err({ input: 'abc', type: 'ParseError' }),
		);
		expect(transform).not.toHaveBeenCalled();
		await expect(downstreamFailure).resolves.toStrictEqual(
			err({ provider: 'cms', type: 'TimeoutError' }),
		);
	});

	it('should match and unwrap async variants', async () => {
		expect.hasAssertions();
		const success = ResultAsync.fromResult<number, ParseError>(ok(7));
		const failure = ResultAsync.fromResult(err<ParseError>({ input: 'abc', type: 'ParseError' }));

		const successMessage = await success.match({
			err: (error) => error.type,
			ok: (value) => `value:${String(value)}`,
		});
		const failureMessage = await failure.match({
			err: (error) => error.type,
			ok: (value) => `value:${String(value)}`,
		});

		expect(successMessage).toBe('value:7');
		expect(failureMessage).toBe('ParseError');
		await expect(ResultAsync.fromResult(ok('parsed')).unwrapOr('fallback')).resolves.toBe('parsed');
		await expect(failure.unwrapOr('fallback')).resolves.toBe('fallback');
	});

	it('should expose promise and PromiseLike boundaries', async () => {
		expect.hasAssertions();
		const promised = ResultAsync.fromResult(ok(12)).toPromise();
		const value = await ResultAsync.fromResult(ok(9)).then((resolved) =>
			match(resolved, { err: () => 'err', ok: String }),
		);

		await expect(promised).resolves.toStrictEqual(ok(12));
		expect(value).toBe('9');
	});

	it('should compose nested sync-to-async operations', async () => {
		expect.hasAssertions();
		const loadPage = (id: number): ResultAsync<string, TimeoutError> =>
			ResultAsync.fromPromise(Promise.resolve(`page:${id}`), (): TimeoutError => ({
				provider: 'memory-store',
				type: 'TimeoutError',
			}));

		const loaded = await ResultAsync.fromResult(parseId('7')).andThen(loadPage);

		expect(loaded).toStrictEqual(ok('page:7'));
	});
});
