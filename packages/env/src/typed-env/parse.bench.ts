/**
 * @description Benchmarks the built-schema cache and the case for not compiling. Repeated parses of one
 * definition reuse its built schema; a fresh definition per parse pays construction every time.
 * The last three cases price `z.compile` against what it saves, which is why `parseEnv` does not
 * call it. Run with `npm run bench`.
 *
 * @module @tenets/env
 */
import { bench, describe } from 'vitest';
import { z } from 'zod';

import { defineEnv, enumValue, integerValue, parseEnv, stringValue, urlValue } from './index';

const shape = {
	API_URL: urlValue,
	MODE: enumValue(['a', 'b', 'c']),
	NAME: stringValue,
	PORT: integerValue({ min: 1, max: 65_535 }),
	REGION: stringValue,
	TOKEN: stringValue,
} as const;

const source = {
	API_URL: 'https://api.example.com',
	MODE: 'b',
	NAME: 'svc',
	PORT: '8080',
	REGION: 'iad1',
	TOKEN: 'secret-token',
};

const cached = defineEnv({ name: 'cached', server: shape });

const objectSchema = z.object(shape);
const compiledSchema = z.compile(objectSchema);

describe('parseEnv', () => {
	bench('cached definition (steady state)', () => {
		parseEnv(cached, source);
	});

	bench('fresh definition per parse (builds the schema every time)', () => {
		parseEnv(defineEnv({ name: 'fresh', server: shape }), source);
	});
});

describe('z.compile payback', () => {
	// Compile once, parse many: dividing this case's time by the gap between the two parse cases
	// below gives the number of parses a compile must serve before it pays for itself. An
	// environment contract is parsed once per process, so it never reaches that number.
	bench('compile an environment-shaped schema', () => {
		z.compile(z.object(shape));
	});

	bench('parse with the built schema', () => {
		objectSchema.safeParse(source);
	});

	bench('parse with the compiled schema', () => {
		compiledSchema.safeParse(source);
	});
});
