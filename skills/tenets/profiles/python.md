# Python Profile

Rules state principles, this profile binds them to Python, and the project guide records paths,
versions, commands, and deviations. Select with `"profile": "python"` in `tenets.json`.

Applies to Python applications and libraries. The guide names supported Python versions; check
against the minimum supported version and test the supported runtime matrix.

## Primitives (Rule 07.6)

Exact names: `Result[T, E]` / `ResultAsync[T, E]`, `ok()` / `err()`, and
`invariant(condition, message)` raising `InvariantError`. The reference distributions are
`tenets-result` and `tenets-invariant`, imported as `tenets_result` and `tenets_invariant`; the guide
records their locations. Composition uses `map`, `map_err`, `and_then`, `match`, `unwrap_or`,
`combine`, `try_sync`, and `try_async`. Consume every Result, including the Result yielded by await.

Errors are typed records with a `type: Literal["error_kind"]` discriminator and contextual fields;
prefer frozen dataclasses. Narrow Result variants with their literal `ok` discriminator, `is_ok`,
`is_err`, or `isinstance`. Never replace the always-on invariant with Python `assert`, which
optimization can remove. `invariant` does not statically narrow caller variables: use explicit
branches or sound type guards, not casts to compensate.

## Type system (Rules 07.7, 02.4, 09.1)

**ty is the type checker.** Pin it in development dependencies and the lockfile; include source,
tests, and executable scripts in the gate. Resolve installed dependencies in the project's actual
environment. ty has no single strict-mode switch; retain its default diagnostics and add:

```toml
[tool.ty.rules]
blanket-ignore-comment = "error"
dynamic-function-decorator-return = "error"
missing-type-argument = "error"
possibly-unresolved-reference = "error"
unsound-assignment = "error"
unsound-return-statement = "error"
unsound-yield = "error"
unsupported-dynamic-base = "error"
unused-awaitable = "error"

[tool.ty.analysis]
respect-type-ignore-comments = false
strict-equality-semantics = true
strict-generic-narrowing = true

[tool.ty.terminal]
error-on-warning = true
```

Annotate callable parameters and returns, including tests and fixtures; supply generic arguments.
Use `object` for unknown values, then parse or narrow. Protocols describe collaborators; typed
stubs describe otherwise untyped dependencies. Fully annotate decorators so they preserve callable
signatures. Keep optionality explicit (`T | None`); verify container membership or bounds where
absence is possible. ty does not provide TypeScript's unchecked-index compiler guarantee.

Each is a BLOCK: production `Any`, `cast` used to claim unproved types, `# type: ignore`,
`# ty: ignore`, `@no_type_check`, or exclusions/import replacement that hide owned code or erase
types to pass the gate. Test-only negative typing examples must be isolated and explicitly checked
for their expected diagnostics. A green ty run alone does not enforce annotation completeness or
prove the absence of dynamic types; review those contracts too.

## Boundaries (Rules 02.1, 01.3)

The schema library remains a guide slot. Use its non-throwing parse API when available; otherwise
adapt its specific validation exception once into `Result[Parsed, ValidationFailure]`. For example,
Pydantic `model_validate` / `TypeAdapter.validate_python` return parsed values but raise
`ValidationError` on rejection. Catch that declared failure, not every exception from validators.
Use the validated model/type as the static contract; never duplicate its shape in a parallel DTO.
Dataclass construction and type annotations alone do not validate external input.

Use the parsed output, including defaults and coercions. Boolean guards fit only when no parsed
output is consumed and validation cannot repair input. Reuse compiled schemas/adapters where
supported; measure initialization cost against parse savings and test the actual shipped validator.

## Translating a throwing dependency (Rule 02.5)

At the provider adapter, with the provider exception and typed error record defined by its contract:

```python
try:
    return ok(await code_host.pull_request(pr_id))
except InvariantError:
    raise
except ProviderTimeout as cause:
    return err(CodeHostUnavailable(provider="github", cause=cause))
```

Catch only declared recoverable exceptions. Never catch `BaseException` to recover or swallow
`asyncio.CancelledError`, `KeyboardInterrupt`, or `SystemExit`. When using `try_sync`, `try_async`,
or `ResultAsync.try_`, their mapper must re-raise invariants and undeclared exceptions; the helpers
capture ordinary exceptions but cannot decide which ones are recoverable for your operation.

## Idioms (Rules 03.4, 03.8)

Prefer comprehensions and generators; use named loops when state or effects need sequencing.
Immutability means frozen dataclasses, tuples, read-only interfaces, and non-mutating transforms
(`sorted` rather than `list.sort`); freezing is shallow. Use keyword-only parameters or a typed
request object for multiple inputs. Keep `os.environ`, `print` / logging sinks, `sys.exit`, clocks,
and randomness in adapters. Own resource lifetimes with `with` / `async with` and explicit cleanup.

## Tests (Rules 04.1, 04.6)

Default to pytest: `Test<Unit>` groups the public unit, `test_<behavior>` names observable behavior,
and Given/When/Then comments carry the example. Import pytest explicitly; assert exception messages:

```python
import pytest
from tenets_invariant import InvariantError, invariant


class TestInvariant:
    def test_rejects_missing_workspace_id(self) -> None:
        # Given: trusted state is missing its promised workspace id.
        workspace_id = None
        # When: the postcondition is checked.
        # Then: the violated promise is identified.
        with pytest.raises(InvariantError, match="workspace id must exist"):
            invariant(workspace_id, "workspace id must exist")
```

Test Results by discriminator and contextual fields. The guide records async-test support, runner
deviations, locations, and scope selection. Python `assert` is appropriate inside pytest tests.

## Documentation (Rules 05.2, 05.3)

Use module docstrings for file responsibility and Google-style callable docstrings: `Args`,
`Returns`, `Raises`, `Examples`, and `Notes` where needed. Types replace redundant prose. Document
`InvariantError` under `Raises`; a deliberately exception-native adapter also documents its declared
exceptions. Recoverable Result variants belong under `Returns`. Leading underscores mark internal
symbols; never publish a helper merely to test it.

## Packaging (Rules 07.1–07.3)

Use `pyproject.toml` metadata and a declared build backend; implementation lives in `src/<import_name>/`.
Public modules and their explicit `__all__` define the supported API; keep `__init__.py` cohesive.
Ship `py.typed` for typed distributions and test installed wheels. Declare inter-package dependencies
by distribution name; import by installed module name. Relative imports are package-internal only;
never patch `sys.path` or import another workspace's source tree to bypass installation.

## Boundary enforcement (Rules 07.2, 07.3, 07.10)

Python has no `package.json` export-map equivalent. `__all__` controls wildcard imports, and leading
underscores signal privacy; neither prevents an explicit private import. Enforce package and
capability seams with Import Linter's forbidden, protected, independence, or layers contracts as
appropriate. Record ownership and permitted directions in the guide. uv workspaces share resolution,
not import-access enforcement. Avoid wildcard imports; Ruff checks unused imports, not whether a
public API is used by downstream consumers. Review that surface explicitly.

## Tooling (Rule 08)

Defaults: uv for environments, dependency locking, and workspace resolution; Ruff for linting and
formatting; pytest for tests. Record deviations and equivalent enforcement in the guide. ty remains
required. Extend Ruff's existing selection with `ANN`, `PYI`, and `PGH003` for annotation and stub
checks; `ANN401` catches dynamically typed function annotations. These complement ty, not replace it.
The guide owns install, check, test, and build commands; CI uses the checked-in lockfile.

## Runtime (Rule 13)

For Python serverless targets, await independent I/O concurrently with structured task ownership
(`asyncio.TaskGroup` on Python 3.11+, or explicitly managed tasks on older targets), bounded fan-out,
and cleanup on cancellation. Task groups cancel siblings on exceptions, not on returned `Err`
values: consume those Results explicitly. Reuse clients only within their supported process and
event-loop lifetime. Keep blocking calls off the event loop; CPU-bound work needs an appropriate
worker. Durable queues or supported platform hooks own post-response work; a detached task is not a
delivery guarantee. The guide names the platform, async runtime, and limits.

## Waivers

- **Rules 07.1 and 07.3, manifest export mechanism only:** Python declares dependencies and build
  metadata in `pyproject.toml`, but has no manifest export allowlist. Public modules / `__all__` plus
  import contracts replace that mechanism; the boundary and smallest-surface requirements remain.
- **Rule 08.3, config-format preference only:** use native TOML for Python tooling instead of JSONC.
  All other configuration requirements remain.

Mechanism references: [ty strictness guidance](https://docs.astral.sh/ty/coming-from-mypy-or-pyright/),
[ty configuration](https://docs.astral.sh/ty/reference/configuration/),
[Import Linter contracts](https://import-linter.readthedocs.io/en/stable/contract_types/).
