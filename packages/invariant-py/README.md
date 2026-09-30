# tenets-invariant

Zero-runtime-dependency assertions for impossible internal states. Python 3.10+;
import from `tenets_invariant`. Select `"profile": "python"` in `tenets.json` to use the Python profile.

Install from PyPI:

```sh
python -m pip install tenets-invariant
```

For local development, run `python -m pip install ./packages/invariant-py`
from the repository root.

```python
from tenets_invariant import create_invariant, invariant

invariant(workspace_id, 'workspace id must exist')
invariant(revision > 0, 'workspace %s has invalid revision %s', workspace_id, revision)
production_check = create_invariant(mode='production', code='ERR_WORKSPACE')
production_check(workspace_id)
```

`invariant` raises `InvariantError`, with `message`, `name`, `code`, `docs_url`,
`details`, and `cause` metadata. An exception cause also sets Python's native
`__cause__`. Failures indicate programmer bugs, not recoverable domain failures.
Checks remain active under `python -O`.

`create_invariant` accepts keyword arguments `mode`, `code`, `docs_url`,
`stripped_message`, and `require_message_in_development`. Defaults match the
TypeScript package: development requires a string diagnostic even for passing
conditions; production permits omission and always strips failure diagnostics.
Explicitly empty messages are preserved. Non-string diagnostics are rejected in
both modes, with `details['received_type']` recording the Python type name.
`None` means an omitted message. No environment variables are read.

Formatting replaces each `%s` once using Python `str`; extra values are ignored,
missing values become `undefined` for parity with TypeScript. Successful checks
and production failures never stringify values. Truthiness follows Python, so
empty containers fail. Unlike TypeScript assertion signatures, Python cannot
express arbitrary caller-variable narrowing via an assertion function; use
explicit checks or type guards when static narrowing is needed.

The API uses snake_case (`createInvariant` → `create_invariant`, `docsUrl` →
`docs_url`). Public types include `InvariantMode` and `ConfiguredInvariant`;
inline types ship with a `py.typed` marker.

| Command (repository root, after installation) | Purpose |
| --- | --- |
| `python -m unittest discover -s packages/invariant-py/tests -v` | Ported TypeScript behavior and Python edge cases |
| `python -O -m unittest discover -s packages/invariant-py/tests` | Verify assertions survive optimization |
| `python -m build packages/invariant-py` | Build wheel and source distribution (requires the build frontend) |

Uses Hatchling only at build time. See the [TypeScript package](../invariant-ts)
for API lineage and credits.
