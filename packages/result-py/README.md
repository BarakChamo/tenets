# tenets-result

Zero-runtime-dependency `Result[T, E]` and `ResultAsync[T, E]` primitives for
recoverable failures. Python 3.10+; import from `tenets_result`. Select `"profile": "python"` in
`tenets.json` to use the Python profile.

Install from PyPI:

```sh
python -m pip install tenets-result
```

For local development, run `python -m pip install ./packages/result-py`
from the repository root.

```python
from tenets_result import Result, ResultAsync, ResultHandlers, err, ok, try_sync

parsed: Result[int, str] = try_sync(lambda: int('42'), str)
if parsed.ok:
    print(parsed.value)
else:
    print(parsed.error)

async def load():
    return await ResultAsync.from_result(parsed).map(lambda value: value * 2)
```

`Ok` and `Err` are frozen, slotted dataclasses with literal `ok` discriminators
and `value` / `error` fields. Freezing is shallow, matching TypeScript's
`Object.freeze`. Equality is structural between variants; `dataclasses.asdict`
converts results to dictionaries for serialization. `is_ok` / `is_err` provide
type guards. `is_rejected_result` checks unknown mappings or objects for an `ok`
field that is exactly `False` (not `0`).

| TypeScript | Python | Contract |
| --- | --- | --- |
| `ok`, `err` | `ok`, `err` | Construct immutable variants |
| `isOk`, `isErr`, `isRejectedResult` | `is_ok`, `is_err`, `is_rejected_result` | Inspect results |
| `map`, `mapErr` | `map`, `map_err` | Transform only the matching variant |
| `andThen` | `and_then` | Chain success, preserve first failure |
| `match` | `match` | Fold with `ResultHandlers(ok=..., err=...)` |
| `unwrapOr` | `unwrap_or` | Return value or fallback |
| `combine` | `combine` | Collect in order; stop at first error, including for iterators |
| `trySync`, `tryAsync` | `try_sync`, `try_async` | Translate boundary exceptions with a supplied mapper |
| `ResultAsync.fromResult` | `ResultAsync.from_result` | Wrap a synchronous Result |
| `ResultAsync.fromResultPromise` | `ResultAsync.from_result_awaitable` | Wrap an awaitable Result; exceptions propagate |
| `ResultAsync.fromPromise` | `ResultAsync.from_awaitable` | Wrap an awaitable value; map exceptions |
| `ResultAsync.try` | `ResultAsync.try_` | Wrap an operation (Python reserves `try`) |
| `toPromise`, `then` | `to_awaitable`, `then` | Native awaitable access and fulfillment/rejection handlers |

`ResultAsync` also offers `map`, `map_err`, `and_then`, `match`, and `unwrap_or`.
Transforms and handlers may return immediate values or awaitables. Chaining
accepts a Result, ResultAsync, or any awaitable Result. `await result_async`
returns the Result directly. Public aliases `MaybeAwaitable` and
`ResultAsyncInput` describe these boundaries; inline types ship with `py.typed`.

Python-specific semantics:

- Work starts on first await and is cached in one task. Repeated awaits and
  branched chains share it, including exceptions. Use each ResultAsync within
  one event loop. Use `try_` to defer creation of a coroutine too; a coroutine
  passed to `from_awaitable` remains the caller's responsibility if never awaited.
- Cancelling one waiter propagates cancellation to that waiter but leaves shared
  work running for other consumers. Cancellation of the underlying operation
  still propagates. Event-loop shutdown cancels pending work normally.
- Exception adapters catch `Exception`, preserving `BaseException` control flow
  such as `KeyboardInterrupt`, `SystemExit`, and `asyncio.CancelledError`.
- Exceptions in transforms, match handlers, or error mappers propagate; they are
  never silently converted to domain errors. `then` handles only source errors,
  not errors thrown by its fulfillment handler.

| Command (repository root, after installation) | Purpose |
| --- | --- |
| `python -m unittest discover -s packages/result-py/tests -v` | Ported TypeScript behavior and Python edge cases |
| `python -m build packages/result-py` | Build wheel and source distribution (requires the build frontend) |

Uses Hatchling only at build time. See the [TypeScript package](../result-ts) for
API lineage and credits. The Python tests port every runtime case from both
TypeScript suites; language-specific typing is verified separately in
`tests/result_typing_contract.py`.

## ty compatibility

With ty 0.0.84, `ResultAsync.from_result(result)` can infer `ResultAsync[Unknown, Unknown]`
when `result` is a typed `Ok[T] | Err[E]` union. The Python profile's `unsound-assignment` /
`unsound-return-statement` checks correctly refuse to treat that inferred type as fully static.
This affects the 0.6.0 factory's typing, not runtime execution. Do not silence the diagnostics or
cast them away. A directly constructed `ResultAsync` with an explicitly annotated async operation
preserves the value and error types in the verified consumer case; factory inference remains a
compatibility follow-up.
