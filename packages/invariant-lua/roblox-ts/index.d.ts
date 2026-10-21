export type InvariantMode = "development" | "production";

export interface InvariantError {
	readonly name: "InvariantError";
	readonly message?: string;
	readonly code: string;
	readonly docsUrl?: string;
	readonly details?: unknown;
	readonly cause?: unknown;
}

export interface CreateInvariantOptions {
	readonly mode?: InvariantMode;
	readonly code?: string;
	readonly docsUrl?: string;
	readonly details?: unknown;
	readonly cause?: unknown;
	readonly message?: string;
	readonly strippedMessage?: string;
	readonly requireMessageInDevelopment?: boolean;
}

export interface ConfiguredInvariant {
	(condition: boolean, message?: string, ...formatValues: unknown[]): asserts condition;
}

export declare function isInvariantError(value: unknown): value is InvariantError;
export declare function invariant(condition: boolean, message: string, ...formatValues: unknown[]): asserts condition;
export declare function createInvariant(options?: CreateInvariantOptions): ConfiguredInvariant;
