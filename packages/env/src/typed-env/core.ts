/**
 * @description Defines composable environment schemas and parses injected sources into immutable typed
 * snapshots.
 *
 * @module @tenets/env
 */

import { z } from 'zod';

/** @description Raw values accepted from process, build-tool, or test environment sources. */
export type EnvSourceValue = string | number | boolean | undefined;

/** @description Injected environment source used by the runtime parser. */
export type EnvSource = Readonly<Record<string, EnvSourceValue>>;

/** @description Zod schema supported for one environment variable. */
export type EnvSchema = z.ZodType;

/** @description Named environment-variable schema map. */
export type EnvSchemaShape = Readonly<Record<string, EnvSchema>>;

/** @description Any issue emitted while validating an environment definition. */
export type EnvIssue = z.core.$ZodIssue;

type EmptyShape = Readonly<Record<never, never>>;

/**
 * @description Composable environment definition with explicit server, client, and shared ownership.
 *
 * @remarks
 *   Extensions retain their original partitions. Application definitions are applied after
 *   extensions, allowing an application to deliberately refine a package schema for the same key.
 */
export interface AnyEnvDefinition {
	readonly name: string;
	readonly server: EnvSchemaShape;
	readonly client: EnvSchemaShape;
	readonly shared: EnvSchemaShape;
	readonly clientPrefix: string | undefined;
	readonly extends: readonly AnyEnvDefinition[];
	readonly checks: readonly EnvCheck[];
}

export interface EnvDefinition<
	TServer extends EnvSchemaShape = EmptyShape,
	TClient extends EnvSchemaShape = EmptyShape,
	TShared extends EnvSchemaShape = EmptyShape,
	TExtends extends readonly AnyEnvDefinition[] = readonly [],
> extends AnyEnvDefinition {
	readonly server: TServer;
	readonly client: TClient;
	readonly shared: TShared;
	readonly extends: TExtends;
}

/** @description Options for defining one package or application environment. */
export interface DefineEnvOptions<
	TServer extends EnvSchemaShape,
	TClient extends EnvSchemaShape,
	TShared extends EnvSchemaShape,
	TExtends extends readonly AnyEnvDefinition[],
> {
	readonly name: string;
	readonly server?: TServer;
	readonly client?: TClient;
	readonly shared?: TShared;
	readonly clientPrefix?: string;
	readonly extends?: TExtends;
	/**
	 * @description Cross-field rules, applied after the per-key shape validates. Each receives the object schema
	 * and returns it wrapped, so callers compose with the schema's own `check`/`refine` rather than
	 * hand-rolling a validator.
	 */
	readonly checks?: readonly EnvCheck[];
}

/**
 * @description A cross-field rule applied to the whole parsed environment.
 *
 * @remarks
 *   Built with Zod's own checks — an issue pushed with `path: [key]` attaches to the variable at
 *   fault, so a deployed environment missing a secret reports that secret rather than "the
 *   environment".
 */
export type EnvObjectSchema = z.ZodType<Record<string, unknown>>;

export type EnvCheck = (schema: EnvObjectSchema) => EnvObjectSchema;

/**
 * @description Selects which environment partition is parsed.
 *
 * @remarks
 *   `emptyStringAsUndefined` defaults to true: dashboards and `.env` files routinely hold a key
 *   with an empty value, and an empty string satisfying a "required" schema defeats the reason the
 *   variable was declared required. Pass `false` only when an empty string is a meaningful value.
 */
export interface ParseEnvOptions {
	readonly target?: 'server' | 'client';
	readonly emptyStringAsUndefined?: boolean;
}

type ShapeOutput<TShape extends EnvSchemaShape> = Readonly<{
	[TKey in keyof TShape]: z.output<TShape[TKey]>;
}>;

type UnionToIntersection<TValue> = (
	TValue extends unknown ? (value: TValue) => void : never
) extends (value: infer TIntersection) => void
	? TIntersection
	: unknown;

type ExtendedServerOutput<TExtends extends readonly AnyEnvDefinition[]> =
	TExtends extends readonly []
		? unknown
		: number extends TExtends['length']
			? unknown
			: UnionToIntersection<ServerEnvOutput<TExtends[number]>>;

type ExtendedClientOutput<TExtends extends readonly AnyEnvDefinition[]> =
	TExtends extends readonly []
		? unknown
		: number extends TExtends['length']
			? unknown
			: UnionToIntersection<ClientEnvOutput<TExtends[number]>>;

/** @description Fully inferred server output, including client/shared values and all extensions. */
export type ServerEnvOutput<TDefinition extends AnyEnvDefinition> = Readonly<
	ShapeOutput<TDefinition['server']> &
		ShapeOutput<TDefinition['client']> &
		ShapeOutput<TDefinition['shared']> &
		ExtendedServerOutput<TDefinition['extends']>
>;

/** @description Fully inferred client-safe output, including shared/client values from all extensions. */
export type ClientEnvOutput<TDefinition extends AnyEnvDefinition> = Readonly<
	ShapeOutput<TDefinition['client']> &
		ShapeOutput<TDefinition['shared']> &
		ExtendedClientOutput<TDefinition['extends']>
>;

/** @description Raised when an environment definition is internally inconsistent. */
export class EnvDefinitionError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'EnvDefinitionError';
	}
}

/** @description Structured validation failure that callers can render through their own output boundary. */
export class EnvValidationError extends Error {
	public readonly definitionName: string;
	public readonly issues: readonly EnvIssue[];

	public constructor(definitionName: string, issues: readonly EnvIssue[]) {
		// The reasons belong in the message, not only in `issues`. A process that
		// refuses to start prints its error and exits, so a summary that says
		// only "invalid environment" costs an operator the round trip of
		// attaching a debugger to find out which variable.
		super(
			`Invalid or missing environment variables for ${definitionName}: ${issues
				.map((issue) => {
					const path = z.core.toDotPath(issue.path);
					return path ? `${path} ${issue.message}` : issue.message;
				})
				.join('; ')}`,
		);
		this.name = 'EnvValidationError';
		this.definitionName = definitionName;
		this.issues = issues;
	}
}

/**
 * @description Defines a composable environment contract without reading or validating runtime state.
 *
 * @throws { EnvDefinitionError } When a declared client key violates `clientPrefix`.
 */
export function defineEnv<
	const TServer extends EnvSchemaShape = EmptyShape,
	const TClient extends EnvSchemaShape = EmptyShape,
	const TShared extends EnvSchemaShape = EmptyShape,
	const TExtends extends readonly AnyEnvDefinition[] = readonly [],
>(
	options: DefineEnvOptions<TServer, TClient, TShared, TExtends>,
): EnvDefinition<TServer, TClient, TShared, TExtends>;
export function defineEnv(
	options: DefineEnvOptions<
		EnvSchemaShape,
		EnvSchemaShape,
		EnvSchemaShape,
		readonly AnyEnvDefinition[]
	>,
): AnyEnvDefinition {
	const client = options.client ?? {};
	const clientPrefix = options.clientPrefix;
	if (clientPrefix) {
		const invalidClientKey = Object.keys(client).find((key) => !key.startsWith(clientPrefix));
		if (invalidClientKey) {
			throw new EnvDefinitionError(
				`Client environment variable "${invalidClientKey}" must start with "${clientPrefix}".`,
			);
		}
	}

	return {
		checks: options.checks ?? [],
		client,
		clientPrefix,
		extends: options.extends ?? [],
		name: options.name,
		server: options.server ?? {},
		shared: options.shared ?? {},
	};
}

/**
 * @description Built schemas per definition and target. Construction walks the extension graph and rebuilds
 * the object schema and its cross-field checks, which costs roughly a thousand times what one parse
 * does, so caching it is what makes repeated parses cheap. A definition is treated as immutable once
 * it has parsed successfully; only a successful collection is cached, so a definition that throws
 * (for example on an extension cycle) is re-collected on every attempt.
 *
 * @remarks
 *   Deliberately not `z.compile`. An environment contract is parsed once per process, while
 *   compiling an environment-shaped schema costs about as much as two thousand parses of it, so the
 *   generated fast path never repays its own code generation here and only adds startup work. It
 *   also cannot be reached by a build-time compiler: the object schema is composed at runtime from
 *   the caller's definition, and `z.url()` and cross-field `check` callbacks are constructs every
 *   compiler delegates back to the runtime anyway.
 */
const builtSchemaCache = new WeakMap<AnyEnvDefinition, Map<string, EnvObjectSchema>>();

/**
 * @description Parses a client-safe environment snapshot.
 *
 * @throws { EnvDefinitionError } When the extension graph contains a cycle or a cross-field rule
 *   references an undeclared variable.
 * @throws { EnvValidationError } When the selected environment values are missing or invalid.
 */
export function parseEnv<const TDefinition extends AnyEnvDefinition>(
	definition: TDefinition,
	source: EnvSource,
	options: ParseEnvOptions & { readonly target: 'client' },
): ClientEnvOutput<TDefinition>;

/**
 * @description Parses a full server environment snapshot.
 *
 * @throws { EnvDefinitionError } When the extension graph contains a cycle or a cross-field rule
 *   references an undeclared variable.
 * @throws { EnvValidationError } When the selected environment values are missing or invalid.
 */
export function parseEnv<const TDefinition extends AnyEnvDefinition>(
	definition: TDefinition,
	source: EnvSource,
	options?: ParseEnvOptions & { readonly target?: 'server' },
): ServerEnvOutput<TDefinition>;
export function parseEnv(
	definition: AnyEnvDefinition,
	source: EnvSource,
	options: ParseEnvOptions = {},
): Readonly<Record<string, unknown>> {
	const target = options.target === 'client' ? 'client' : 'server';
	const schema = builtSchema(definition, target);
	const validationSource =
		options.emptyStringAsUndefined === false
			? source
			: Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
	const parsed = schema.safeParse(validationSource);
	if (!parsed.success) {
		throw new EnvValidationError(definition.name, parsed.error.issues);
	}
	return Object.freeze({ ...parsed.data });
}

/** @description Builds (or returns the cached) schema for one definition and target. */
const builtSchema = (definition: AnyEnvDefinition, target: string): EnvObjectSchema => {
	const cachedByTarget = builtSchemaCache.get(definition);
	const cached = cachedByTarget?.get(target);
	if (cached) {
		return cached;
	}

	// Collection walks the extension graph and throws on cycles and definition
	// errors, so only a successfully built schema is ever cached.
	const partitions = collectDefinitionPartitions(definition);
	const selectedShape =
		target === 'client'
			? { ...partitions.shared, ...partitions.client }
			: { ...partitions.server, ...partitions.shared, ...partitions.client };
	// Cross-field rules run only on the server target: a client bundle sees a
	// subset of the variables, so a rule spanning both would report a missing
	// server secret to the browser.
	const shapeSchema: EnvObjectSchema = z.object(selectedShape);
	const checks = target === 'client' ? [] : collectDefinitionChecks(definition);
	const schema = checks.reduce<EnvObjectSchema>((carried, wrap) => wrap(carried), shapeSchema);

	const byTarget = cachedByTarget ?? new Map<string, EnvObjectSchema>();
	byTarget.set(target, schema);
	builtSchemaCache.set(definition, byTarget);
	return schema;
};

/** @description Every cross-field rule in the definition and everything it extends. */
const collectDefinitionChecks = (root: AnyEnvDefinition): readonly EnvCheck[] => {
	const collected: EnvCheck[] = [];
	const visited = new Set<AnyEnvDefinition>();
	const collect = (definition: AnyEnvDefinition): void => {
		if (visited.has(definition)) return;
		visited.add(definition);
		for (const extension of definition.extends) collect(extension);
		collected.push(...definition.checks);
	};
	collect(root);
	return collected;
};

interface DefinitionPartitions {
	readonly server: Record<string, EnvSchema>;
	readonly client: Record<string, EnvSchema>;
	readonly shared: Record<string, EnvSchema>;
}

const collectDefinitionPartitions = (root: AnyEnvDefinition): DefinitionPartitions => {
	const partitions: DefinitionPartitions = {
		client: {},
		server: {},
		shared: {},
	};
	const active = new Set<AnyEnvDefinition>();
	const visited = new Set<AnyEnvDefinition>();

	const collect = (definition: AnyEnvDefinition): void => {
		if (active.has(definition)) {
			throw new EnvDefinitionError(
				`Environment definition extension cycle detected at "${definition.name}".`,
			);
		}
		if (visited.has(definition)) {
			return;
		}
		active.add(definition);
		for (const extension of definition.extends) {
			collect(extension);
		}
		Object.assign(partitions.server, definition.server);
		Object.assign(partitions.client, definition.client);
		Object.assign(partitions.shared, definition.shared);
		active.delete(definition);
		visited.add(definition);
	};

	collect(root);
	return partitions;
};
