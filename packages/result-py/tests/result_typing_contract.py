"""Static consumer contracts; checked by mypy, not executed by unittest."""

from collections.abc import Awaitable

from tenets_result import (
    Err, Ok, Result, ResultAsync, ResultHandlers, and_then, combine, err,
    is_err, is_ok, map, map_err, match, ok, try_async, try_sync,
)


def variants(result: Result[int, str]) -> None:
    success: Ok[int] = ok(1)
    failure: Err[str] = err('bad')
    items: list[Result[int, str]] = [success, failure]
    combined: Result[list[int], str] = combine(items)
    if result.ok:
        number: int = result.value
    else:
        message: str = result.error
    if is_ok(result):
        narrowed_success: Ok[int] = result
    if is_err(result):
        narrowed_failure: Err[str] = result
    mapped: Result[str, str] = map(result, str)
    remapped: Result[int, int] = map_err(result, len)
    chained: Result[str, str | int] = and_then(result, lambda n: err(n) if n < 0 else ok(str(n)))
    folded: str = match(result, ResultHandlers(ok=str, err=str))
    captured: Result[int, str] = try_sync(lambda: 12, str)


async def async_contract(result: Result[int, str]) -> None:
    wrapped: ResultAsync[int, str] = ResultAsync.from_result(result)
    mapped: ResultAsync[str, str] = wrapped.map(str)
    remapped: ResultAsync[int, int] = wrapped.map_err(len)
    chained: ResultAsync[str, str | int] = wrapped.and_then(
        lambda n: ResultAsync.from_result(err(n) if n < 0 else ok(str(n)))
    )
    awaited: Result[int, str] = await wrapped
    native: Awaitable[Result[int, str]] = wrapped.to_awaitable()
    folded: str = await wrapped.match(ResultHandlers(ok=str, err=str))
    captured: Result[int, str] = await try_async(lambda: 12, str)
