/**
 * @description Assertion primitive for impossible internal states with configurable diagnostics.
 *
 * @module @principles/invariant
 */

/** @description Default stable error code used by invariant failures. */
export const DEFAULT_INVARIANT_ERROR_CODE = 'ERR_INVARIANT';

/** @description Default message used when diagnostic stripping is enabled. */
export const DEFAULT_STRIPPED_INVARIANT_MESSAGE =
	'Invariant violation. Enable development diagnostics for the full error message.';

/** @description Runtime mode for configured invariant functions. */
export type InvariantMode = 'development' | 'production';

/** @description Values accepted by invariant `%s` message formatting. */
export type InvariantFormatValue = unknown;

/** @description Metadata attached to thrown invariant errors. */
export interface InvariantErrorOptions {
	/** @description Stable machine-readable code for grouping invariant failures. */
	readonly code?: string;

	/** @description Optional documentation URL with remediation context. */
	readonly docsUrl?: string;

	/** @description Structured diagnostic context for logs and tests. */
	readonly details?: Readonly<Record<string, unknown>>;

	/** @description Optional lower-level cause for crash reporters. */
	readonly cause?: unknown;
}

/**
 * @description Error thrown when an internal invariant is violated.
 *
 * @remarks
 *   Invariant failures indicate programmer bugs or corrupted trusted state, not expected domain
 *   failures. Use typed Result errors for recoverable caller/provider/business failures.
 */
export class InvariantError extends Error {
	public override readonly name = 'InvariantError';

	/** @description Stable machine-readable code for grouping invariant failures. */
	public readonly code: string;

	/** @description Optional documentation URL with remediation context. */
	public readonly docsUrl?: string;

	/** @description Optional structured context for logs and tests. */
	public readonly details?: Readonly<Record<string, unknown>>;

	/**
	 * @description Creates an invariant error with stable metadata.
	 *
	 * @param message - Human-readable diagnostic or configured stripped message.
	 * @param options - Optional machine-readable metadata for crash reporting.
	 */
	public constructor(message: string, options: InvariantErrorOptions = {}) {
		super(message, buildErrorOptions(options.cause));
		this.code = options.code ?? DEFAULT_INVARIANT_ERROR_CODE;

		if (options.docsUrl !== undefined) {
			this.docsUrl = options.docsUrl;
		}

		if (options.details !== undefined) {
			this.details = options.details;
		}
	}
}

/** @description Options used to create a configured invariant function. */
export interface CreateInvariantOptions {
	/**
	 * @description Diagnostic mode. Development preserves messages; production strips them by default.
	 *
	 * @default 'development'
	 */
	readonly mode?: InvariantMode;

	/**
	 * @description Stable machine-readable code attached to thrown errors.
	 *
	 * @default 'ERR_INVARIANT'
	 */
	readonly code?: string;

	/** @description Documentation URL attached to thrown errors. */
	readonly docsUrl?: string;

	/**
	 * @description Generic message used when diagnostics are stripped.
	 *
	 * @default DEFAULT_STRIPPED_INVARIANT_MESSAGE
	 */
	readonly strippedMessage?: string;

	/**
	 * @description Whether development-mode calls require a message even when the condition is truthy.
	 *
	 * @remarks
	 *   This mirrors invariant-style packages while keeping production stripping explicit.
	 * @default true in development mode, false in production mode
	 */
	readonly requireMessageInDevelopment?: boolean;
}

/**
 * @description Configured invariant assertion function.
 *
 * @param condition - Internal condition that must hold if the program is correct.
 * @param message - Diagnostic message format. `%s` placeholders are replaced by later values.
 * @throws { InvariantError } For missing/invalid diagnostics or falsey conditions.
 */
export type ConfiguredInvariant = (
	condition: unknown,
	message?: string,
	...formatValues: InvariantFormatValue[]
) => asserts condition;

/**
 * @description Asserts that a condition is true and narrows the checked value for TypeScript.
 *
 * @param condition - Internal condition that must hold if the program is correct.
 * @param message - Diagnostic message format. `%s` placeholders are replaced by later values.
 * @param formatValues - Values used to replace `%s` placeholders in the message.
 * @throws { InvariantError } When the message is missing/invalid or the condition is falsey.
 */
export function invariant(
	condition: unknown,
	message: string,
	...formatValues: InvariantFormatValue[]
): asserts condition {
	const conditionHolds = Boolean(condition);
	developmentInvariant(conditionHolds, message, ...formatValues);
}

/**
 * @description Creates an invariant assertion function with deterministic diagnostic behavior.
 *
 * @param options - Diagnostic and metadata configuration for thrown invariant errors.
 * @returns Assertion function that throws `InvariantError` for programmer-error states.
 */
export function createInvariant(options: CreateInvariantOptions = {}): ConfiguredInvariant {
	const config = normalizeOptions(options);

	return (condition, message, ...formatValues): asserts condition => {
		if (config.requiresMessage && message === undefined) {
			throw new InvariantError(
				'invariant requires an error message argument',
				buildInvariantErrorOptions(config),
			);
		}

		if (message !== undefined && typeof message !== 'string') {
			throw new InvariantError('invariant message must be a string', {
				...buildInvariantErrorOptions(config),
				details: { receivedType: typeof message },
			});
		}

		const conditionHolds = Boolean(condition);
		if (conditionHolds) {
			return;
		}

		throw new InvariantError(
			buildFailureMessage(config, message, formatValues),
			buildInvariantErrorOptions(config),
		);
	};
}

interface NormalizedInvariantOptions {
	readonly mode: InvariantMode;
	readonly code: string;
	readonly docsUrl?: string;
	readonly strippedMessage: string;
	readonly requiresMessage: boolean;
}

const developmentInvariant: ConfiguredInvariant = createInvariant();

function normalizeOptions(options: CreateInvariantOptions): NormalizedInvariantOptions {
	const mode = options.mode ?? 'development';
	const normalized: NormalizedInvariantOptions = {
		code: options.code ?? DEFAULT_INVARIANT_ERROR_CODE,
		mode,
		requiresMessage: options.requireMessageInDevelopment ?? mode === 'development',
		strippedMessage: options.strippedMessage ?? DEFAULT_STRIPPED_INVARIANT_MESSAGE,
	};

	if (options.docsUrl !== undefined) {
		return { ...normalized, docsUrl: options.docsUrl };
	}

	return normalized;
}

function buildFailureMessage(
	config: NormalizedInvariantOptions,
	message: string | undefined,
	formatValues: readonly InvariantFormatValue[],
): string {
	if (config.mode === 'production') {
		return config.strippedMessage;
	}

	if (message === undefined) {
		return config.strippedMessage;
	}

	return formatInvariantMessage(message, formatValues);
}

function buildInvariantErrorOptions(config: NormalizedInvariantOptions): InvariantErrorOptions {
	if (config.docsUrl !== undefined) {
		return { code: config.code, docsUrl: config.docsUrl };
	}

	return { code: config.code };
}

function formatInvariantMessage(
	message: string,
	formatValues: readonly InvariantFormatValue[],
): string {
	let nextValueIndex = 0;

	return message.replaceAll('%s', () => {
		const value = formatValues[nextValueIndex];
		nextValueIndex += 1;
		return String(value);
	});
}

function buildErrorOptions(cause: unknown): ErrorOptions | undefined {
	if (cause === undefined) {
		return undefined;
	}

	return { cause };
}
