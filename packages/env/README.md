# @tenets/env

Composable, typed environment contracts on Zod 4.6: server/client/shared partitions, cross-field
deployed-environment rules, an exact-mapping Next.js adapter, and a cached schema per contract.

```ts
import { defineEnv, parseEnv, stringValue, urlValue, requiredWhenDeployed } from '@tenets/env';

const provider = defineEnv({ name: 'provider', server: { PROVIDER_TOKEN: stringValue } });

const app = defineEnv({
	name: 'app',
	extends: [provider],
	server: { API_URL: urlValue, VERCEL_ENV: enumValue(['development', 'preview', 'production']) },
	checks: [requiredWhenDeployed('PROVIDER_TOKEN')],
});

export const env = parseEnv(app, process.env); // frozen, typed, only declared keys
```

Next.js apps use `@tenets/env/next` for `NEXT_PUBLIC_` enforcement (compile-time and runtime) and an
exact runtime mapping — every declared key must be listed, because Next inlines `process.env.X`
member access at build time. `@tenets/env/node` is the explicit escape hatch for passing the whole
process environment to config expansion or child processes.

## Credit

Inspired by [t3-oss/t3-env](https://github.com/t3-oss/t3-env) (`@t3-oss/env-nextjs`,
`@t3-oss/env-core`), which established typed env validation with client-prefix safety for the
ecosystem. This package exists for what it adds on top:

- **Composition** — packages declare the variables they own; applications `extends` them into one
  contract, with application definitions deliberately able to refine an inherited key.
- **Deployed-environment rules** — `requiredWhenDeployed`, `forbiddenWhenDeployed`,
  `equalsWhenDeployed`, and the general `envRule`, each reported against the variable at fault and
  each refusing (at parse time) to guard variables the schema does not declare — a rule that would
  pass vacuously is a definition error, not a silent no-op.
- **Performance** — a per-definition, per-target schema cache: steady-state parses run about 30×
  faster than rebuilding the contract each time (`src/typed-env/parse.bench.ts`; `npm run bench`).
  Deliberately not `z.compile`. The same benchmark prices compilation against what it saves:
  compiling an environment-shaped schema costs roughly as much as two thousand parses of it, and a
  contract is parsed once per process, so the generated fast path would only add startup work. A
  build-time compiler cannot reach it either — the object schema is composed at runtime from your
  definition, and `z.url()` and cross-field checks are constructs compilers delegate back to the
  runtime.

## Behavior notes

- Empty strings are treated as undefined by default (`{ emptyStringAsUndefined: false }` opts out).
- Snapshots are frozen and contain only declared keys; server values cannot reach the client target.
- Extension cycles and invalid client prefixes throw `EnvDefinitionError`; invalid values throw
  `EnvValidationError` with the failing variables named in the message.
- `zod ^4.6` is a peer dependency; the package re-exports `z` so consumers stay on one version.
