/**
 * @description Verifies invariant contracts, error metadata, message interpolation, and production stripping.
 *
 * @module @principles/invariant
 */

import { describe, expect, it } from 'vitest';

import type { ConfiguredInvariant } from './index';
import {
	DEFAULT_INVARIANT_ERROR_CODE,
	DEFAULT_STRIPPED_INVARIANT_MESSAGE,
	InvariantError,
	createInvariant,
	invariant,
} from './index';

const checkMissingPlaceholderValue = (): void => {
	invariant(false, 'value %s and %s', 'one');
};

const checkExtraPlaceholderValue = (): void => {
	invariant(false, 'value %s', 'one', 'ignored');
};

const checkDefaultInvariantMetadata = (): void => {
	invariant(Boolean(null), 'value must exist');
};

const checkMissingInvariantMessage = (): void => {
	Reflect.apply(invariant, undefined, [true, undefined]);
};

const checkNonStringInvariantMessage = (): void => {
	Reflect.apply(invariant, undefined, [true, 123]);
};

const captureThrown = (operation: () => void): unknown => {
	try {
		operation();
	} catch (error) {
		return error;
	}
	throw new Error('expected operation to throw');
};

describe('invariant', () => {
	it('should return without throwing when the condition is truthy', () => {
		expect.hasAssertions();
		// Given: a condition that represents a valid internal state
		const condition = true;

		// When: the invariant is checked
		const check = () => {
			invariant(condition, 'condition should hold');
		};

		// Then: no error is thrown
		expect(check).not.toThrow();
	});

	it('should throw InvariantError when the condition is falsey', () => {
		expect.hasAssertions();
		// Given: a condition that represents an impossible internal state
		const condition = false;

		// When: the invariant is checked
		const check = () => {
			invariant(condition, 'condition should hold');
		};

		// Then: the error type signals a programmer failure
		expect(check).toThrow(InvariantError);
	});

	it('should preserve the provided diagnostic message by default', () => {
		expect.hasAssertions();
		// Given: a failing invariant with a specific diagnostic
		const message = 'workspace id must be present after schema validation';

		// When: the invariant is checked
		const check = () => {
			invariant(Boolean(undefined), message);
		};

		// Then: the thrown error keeps the diagnostic intact
		expect(check).toThrow(message);
	});

	it('should format message placeholders in development mode', () => {
		expect.hasAssertions();
		// Given: a failing invariant with placeholder values
		const workspaceId = 'workspace_123';
		const revision = 42;

		// When: the invariant is checked
		const check = () => {
			invariant(false, 'workspace %s must have revision %s', workspaceId, revision);
		};

		// Then: the diagnostic includes the formatted values
		expect(check).toThrow('workspace workspace_123 must have revision 42');
	});

	it('should stringify missing placeholder values deterministically', () => {
		expect.hasAssertions();

		// When: the invariant is checked
		const error = captureThrown(checkMissingPlaceholderValue);

		// Then: formatting follows stable JavaScript string conversion semantics
		expectInvariantError(error);
		expect(error.message).toBe('value one and undefined');
	});

	it('should ignore extra placeholder values', () => {
		expect.hasAssertions();

		// When: the invariant is checked
		const error = captureThrown(checkExtraPlaceholderValue);

		// Then: unused values do not appear in the diagnostic
		expectInvariantError(error);
		expect(error.message).toBe('value one');
	});

	it('should expose stable default error metadata', () => {
		expect.hasAssertions();

		// When: the error is captured
		const error = captureThrown(checkDefaultInvariantMetadata);

		// Then: callers and logs can identify invariant failures by name and code
		expectInvariantError(error);
		expect(error.name).toBe('InvariantError');
		expect(error.code).toBe(DEFAULT_INVARIANT_ERROR_CODE);
	});

	it('should narrow checked values after a successful assertion', () => {
		expect.hasAssertions();
		// Given: a nullable value that has been validated by earlier code
		const maybeWorkspaceId: string | undefined = 'workspace_123';

		// When: the invariant confirms the value exists
		invariant(maybeWorkspaceId, 'workspace id must exist');

		// Then: TypeScript treats the value as non-nullish
		const workspaceId: string = maybeWorkspaceId;
		expect(workspaceId).toBe('workspace_123');
	});

	it('should require a message in default development mode even when the condition is truthy', () => {
		expect.hasAssertions();

		// When: the invariant is checked
		// Then: the caller receives a programmer-error diagnostic
		expect(checkMissingInvariantMessage).toThrow('invariant requires an error message argument');
	});

	it('should reject non-string messages in default development mode', () => {
		expect.hasAssertions();

		// When: the invariant is checked
		// Then: the caller receives a programmer-error diagnostic
		expect(checkNonStringInvariantMessage).toThrow('invariant message must be a string');
	});
});

describe('createInvariant', () => {
	it('should preserve caller messages in development mode', () => {
		expect.hasAssertions();
		// Given: a configured development invariant
		const developmentInvariant: ConfiguredInvariant = createInvariant({ mode: 'development' });

		// When: the invariant fails
		const check = () => {
			developmentInvariant(false, 'internal detail %s', 'abc');
		};

		// Then: the original diagnostic is available
		expect(check).toThrow('internal detail abc');
	});

	it('should strip caller messages in production mode', () => {
		expect.hasAssertions();
		// Given: a configured production invariant
		const productionInvariant: ConfiguredInvariant = createInvariant({ mode: 'production' });

		// When: the invariant fails with sensitive internal details
		const check = () => {
			productionInvariant(false, 'secret workspace id %s', 'workspace_123');
		};

		// Then: the thrown message is generic and stable
		expect(check).toThrow(DEFAULT_STRIPPED_INVARIANT_MESSAGE);
		expect(check).not.toThrow('workspace_123');
	});

	it('should allow omitted messages in production mode', () => {
		expect.hasAssertions();
		// Given: a configured production invariant and a JavaScript-style call without a message
		const productionInvariant: ConfiguredInvariant = createInvariant({ mode: 'production' });

		// When: the invariant is truthy
		const checkPassingCondition = () => {
			productionInvariant(true);
		};

		// Then: omitted messages do not fail before the condition is evaluated
		expect(checkPassingCondition).not.toThrow();
	});

	it('should throw a stripped message when production mode fails without a caller message', () => {
		expect.hasAssertions();
		// Given: a configured production invariant and a JavaScript-style call without a message
		const productionInvariant: ConfiguredInvariant = createInvariant({ mode: 'production' });

		// When: the invariant fails
		const check = () => {
			productionInvariant(false);
		};

		// Then: the message remains generic
		expect(check).toThrow(DEFAULT_STRIPPED_INVARIANT_MESSAGE);
	});

	it('should allow custom stripped messages', () => {
		expect.hasAssertions();
		// Given: a production invariant with a product-specific generic message
		const productionInvariant: ConfiguredInvariant = createInvariant({
			mode: 'production',
			strippedMessage: 'Invariant failed. See docs.',
		});

		// When: the invariant fails
		const check = () => {
			productionInvariant(false, 'internal detail');
		};

		// Then: the custom generic message is used
		expect(check).toThrow('Invariant failed. See docs.');
	});

	it('should attach custom code and docs URL metadata', () => {
		expect.hasAssertions();
		// Given: a configured invariant with stable reporting metadata
		const reportingInvariant: ConfiguredInvariant = createInvariant({
			code: 'ERR_TEST_INVARIANT',
			docsUrl: 'https://docs.example.com/docs/invariants',
		});

		// When: the invariant fails
		const error = captureThrown(() => {
			reportingInvariant(false, 'value must exist');
		});

		// Then: crash reporting can group and link the failure
		expectInvariantError(error);
		expect(error.code).toBe('ERR_TEST_INVARIANT');
		expect(error.docsUrl).toBe('https://docs.example.com/docs/invariants');
	});

	it('should attach structured details when message validation fails', () => {
		expect.hasAssertions();
		// Given: a configured development invariant and a JavaScript caller with a bad message value
		const developmentInvariant: ConfiguredInvariant = createInvariant({ mode: 'development' });

		// When: the invariant is checked
		const error = captureThrown(() => {
			Reflect.apply(developmentInvariant, undefined, [true, 123]);
		});

		// Then: metadata captures the bad runtime type for debugging
		expectInvariantError(error);
		expect(error.details).toStrictEqual({ receivedType: 'number' });
	});

	it('should permit empty string diagnostics when explicitly provided', () => {
		expect.hasAssertions();
		// Given: a configured development invariant with an explicit empty diagnostic
		const developmentInvariant: ConfiguredInvariant = createInvariant({ mode: 'development' });

		// When: the invariant fails
		const error = captureThrown(() => {
			developmentInvariant(false, '');
		});

		// Then: the explicit diagnostic is preserved exactly
		expectInvariantError(error);
		expect(error.message).toBe('');
	});
});

function expectInvariantError(error: unknown): asserts error is InvariantError {
	expect(error).toBeInstanceOf(InvariantError);
	if (!(error instanceof InvariantError)) {
		throw new Error('expected InvariantError');
	}
}

describe('InvariantError', () => {
	it('should preserve explicitly provided metadata', () => {
		expect.hasAssertions();
		// Given: a manually constructed invariant error
		const cause = new Error('lower-level failure');

		// When: metadata is attached
		const error = new InvariantError('postcondition failed', {
			cause,
			code: 'ERR_POSTCONDITION',
			details: { revisionId: 'rev_123' },
			docsUrl: 'https://docs.example.com/docs/postconditions',
		});

		// Then: crash reporters can read the stable metadata
		expect(error.message).toBe('postcondition failed');
		expect(error.code).toBe('ERR_POSTCONDITION');
		expect(error.cause).toBe(cause);
		expect(error.details).toStrictEqual({ revisionId: 'rev_123' });
		expect(error.docsUrl).toBe('https://docs.example.com/docs/postconditions');
	});
});
