/**
 * @description Verifies synchronous result construction, transformation, matching, and error handling.
 *
 * @module @principles/result
 */

import { describe, expect, it, vi } from 'vitest';

import {
	andThen,
	combine,
	err,
	isErr,
	isOk,
	map,
	mapErr,
	match,
	ok,
	tryAsync,
	trySync,
	unwrapOr,
} from './index';
import type { Err, Ok, Result } from './index';

interface ParseError {
	readonly type: 'ParseError';
	readonly input: string;
}

interface RangeErrorValue {
	readonly type: 'RangeError';
	readonly minimum: number;
}

const toParseError = (error: unknown): ParseError => ({
	input: error instanceof Error ? error.message : String(error),
	type: 'ParseError',
});

const foldResult = (result: Result<number, ParseError>): string =>
	match(result, {
		err: (error) => error.type,
		ok: (value) => `value:${value}`,
	});

const throwBadParse = (): never => {
	throw new Error('bad parse');
};

const returnTwelve = (): number => 12;

const rejectProviderTimeout = async (): Promise<never> => {
	throw new Error('provider timeout');
};

const loadValue = async (): Promise<string> => 'loaded';

describe('result', () => {
	it('should create and narrow a successful result', () => {
		expect.hasAssertions();
		// Given: a successful operation value
		const result: Result<number, ParseError> = ok(42);

		// When: the result is narrowed
		const success = isOk(result);

		// Then: the value is available with the successful type
		expect(success).toBe(true);
		if (!isOk(result)) {
			throw new Error('expected a successful result');
		}
		const value: number = result.value;
		expect(value).toBe(42);
	});

	it('should create immutable successful result values', () => {
		expect.hasAssertions();
		// Given: a successful operation value
		const result = ok({ id: 'page_123' });

		// When: the result is inspected at runtime
		const isFrozen = Object.isFrozen(result);

		// Then: the result wrapper cannot be mutated accidentally
		expect(isFrozen).toBe(true);
	});

	it('should create and narrow a failed result', () => {
		expect.hasAssertions();
		// Given: a typed recoverable error
		const parseError: ParseError = { input: 'abc', type: 'ParseError' };
		const result: Result<number, ParseError> = err(parseError);

		// When: the result is narrowed
		const failed = isErr(result);

		// Then: the error is available with the typed error shape
		expect(failed).toBe(true);
		if (!isErr(result)) {
			throw new Error('expected a failed result');
		}
		const error: ParseError = result.error;
		expect(error).toStrictEqual(parseError);
	});

	it('should create immutable failed result values', () => {
		expect.hasAssertions();
		// Given: a typed recoverable error
		const result = err<ParseError>({ input: 'abc', type: 'ParseError' });

		// When: the result is inspected at runtime
		const isFrozen = Object.isFrozen(result);

		// Then: the result wrapper cannot be mutated accidentally
		expect(isFrozen).toBe(true);
	});

	it('should map successful values', () => {
		expect.hasAssertions();
		// Given: a successful result
		const result = ok(2);

		// When: the success value is mapped
		const mapped = map(result, (value) => value * 3);

		// Then: the mapped result contains the transformed value
		expect(mapped).toStrictEqual(ok(6));
	});

	it('should not call map transforms for failed results', () => {
		expect.hasAssertions();
		// Given: a failed result and an observable transform
		const result = err<ParseError>({ input: 'abc', type: 'ParseError' });
		const transform = vi.fn<() => number>(() => 1);

		// When: the result is mapped
		const mapped = map(result, transform);

		// Then: the failure is preserved without running the transform
		expect(transform).not.toHaveBeenCalled();
		expect(mapped).toStrictEqual(result);
	});

	it('should map failed values', () => {
		expect.hasAssertions();
		// Given: a failed result
		const result = err<ParseError>({ input: 'abc', type: 'ParseError' });

		// When: the error value is mapped
		const mapped = mapErr(result, (error): RangeErrorValue => ({
			minimum: error.input.length,
			type: 'RangeError',
		}));

		// Then: the mapped result contains the transformed error
		expect(mapped).toStrictEqual(err({ minimum: 3, type: 'RangeError' }));
	});

	it('should not call mapErr transforms for successful results', () => {
		expect.hasAssertions();
		// Given: a successful result and an observable transform
		const result = ok(3);
		const transform = vi.fn<() => ParseError>(() => ({ input: 'abc', type: 'ParseError' }));

		// When: the error value is mapped
		const mapped = mapErr(result, transform);

		// Then: the success is preserved without running the transform
		expect(transform).not.toHaveBeenCalled();
		expect(mapped).toStrictEqual(result);
	});

	it('should chain successful values', () => {
		expect.hasAssertions();
		// Given: a successful result
		const result = ok(5);

		// When: the result is chained into another result
		const chained = andThen(result, (value) => ok(String(value)));

		// Then: the chained result contains the next success value
		expect(chained).toStrictEqual(ok('5'));
	});

	it('should not call chained transforms for failed results', () => {
		expect.hasAssertions();
		// Given: a failed result and an observable transform
		const result = err<ParseError>({ input: 'abc', type: 'ParseError' });
		const transform = vi.fn<() => Ok<number>>(() => ok(1));

		// When: the result is chained
		const chained = andThen(result, transform);

		// Then: the original failure is preserved without running the transform
		expect(transform).not.toHaveBeenCalled();
		expect(chained).toStrictEqual(result);
	});

	it('should match successful and failed variants into one return type', () => {
		expect.hasAssertions();
		const success = ok(7);
		const failure = err<ParseError>({ input: 'abc', type: 'ParseError' });

		// When: both results are folded
		const successMessage = foldResult(success);
		const failureMessage = foldResult(failure);

		// Then: the matching handler determines the return value
		expect(successMessage).toBe('value:7');
		expect(failureMessage).toBe('ParseError');
	});

	it('should unwrap successful values or return fallback for failures', () => {
		expect.hasAssertions();
		// Given: one successful result and one failed result
		const success = ok('parsed');
		const failure = err<ParseError>({ input: 'abc', type: 'ParseError' });

		// When: both results are unwrapped with a fallback
		const successValue = unwrapOr(success, 'fallback');
		const failureValue = unwrapOr(failure, 'fallback');

		// Then: only the failed result uses the fallback
		expect(successValue).toBe('parsed');
		expect(failureValue).toBe('fallback');
	});

	it('should capture synchronous exceptions as typed errors', () => {
		expect.hasAssertions();

		// When: the operation is wrapped
		const result = trySync(throwBadParse, (error): ParseError => ({
			input: error instanceof Error ? error.message : 'unknown',
			type: 'ParseError',
		}));

		// Then: the thrown value is mapped into a typed failed result
		expect(result).toStrictEqual(err({ input: 'bad parse', type: 'ParseError' }));
	});

	it('should preserve synchronous return values as successful results', () => {
		expect.hasAssertions();

		// When: the operation is wrapped
		const result = trySync(returnTwelve, (error): ParseError => ({
			input: String(error),
			type: 'ParseError',
		}));

		// Then: the return value becomes a successful result
		expect(result).toStrictEqual(ok(12));
	});

	it('should capture async rejections as typed errors', async () => {
		expect.hasAssertions();

		// When: the operation is wrapped
		const result = await tryAsync(rejectProviderTimeout, toParseError);

		// Then: the rejection is mapped into a typed failed result
		expect(result).toStrictEqual(err({ input: 'provider timeout', type: 'ParseError' }));
	});

	it('should preserve async return values as successful results', async () => {
		expect.hasAssertions();

		// When: the operation is wrapped
		const result = await tryAsync(loadValue, (error): ParseError => ({
			input: String(error),
			type: 'ParseError',
		}));

		// Then: the resolved value becomes a successful result
		expect(result).toStrictEqual(ok('loaded'));
	});

	it('should combine all successful results into one result of values', () => {
		expect.hasAssertions();
		// Given: a list of successful results
		const results = [ok(1), ok(2), ok(3)];

		// When: the list is combined
		const combined = combine(results);

		// Then: one successful result carries every value in order
		expect(combined).toStrictEqual(ok([1, 2, 3]));
	});

	it('should short-circuit combine on the first failure in list order', () => {
		expect.hasAssertions();
		// Given: a list with two failures
		const first: Result<number, ParseError> = err({ input: 'first', type: 'ParseError' });
		const second: Result<number, ParseError> = err({ input: 'second', type: 'ParseError' });

		// When: the list is combined
		const combined = combine([ok(1), first, second]);

		// Then: the first failure is returned unchanged
		expect(combined).toStrictEqual(err({ input: 'first', type: 'ParseError' }));
	});

	it('should combine an empty list into an empty success', () => {
		expect.hasAssertions();

		// When: an empty list is combined
		const combined = combine<number, ParseError>([]);

		// Then: the result is a success carrying no values
		expect(combined).toStrictEqual(ok([]));
	});

	it('should compile with direct Ok and Err assignments', () => {
		expect.hasAssertions();
		// Given: explicitly typed variants
		const success: Ok<number> = ok(1);
		const failure: Err<ParseError> = err({ input: 'abc', type: 'ParseError' });

		// When: the variants are assigned to the union type
		const results: readonly Result<number, ParseError>[] = [success, failure];

		// Then: public variant types are compatible with Result
		expect(results).toHaveLength(2);
	});
});
