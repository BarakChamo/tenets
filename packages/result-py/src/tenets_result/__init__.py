"""Immutable typed results and awaitable composition for recoverable failures."""

from __future__ import annotations

import asyncio
import inspect
from collections.abc import Awaitable, Callable, Generator, Iterable, Mapping
from dataclasses import dataclass, field
from typing import Generic, Literal, TypeAlias, TypeGuard, TypeVar

__all__ = [
    "Ok", "Err", "Result", "ResultHandlers", "ResultAsync", "ResultAsyncInput",
    "MaybeAwaitable", "ok", "err", "is_ok", "is_err", "is_rejected_result", "map",
    "map_err", "and_then", "match", "unwrap_or", "combine", "try_sync", "try_async",
]

T = TypeVar("T", covariant=True)
E = TypeVar("E", covariant=True)
U = TypeVar("U")
F = TypeVar("F")


@dataclass(frozen=True, slots=True)
class Ok(Generic[T]):
    """Successful variant; freezing is shallow, as in the TypeScript package."""

    value: T
    ok: Literal[True] = field(default=True, init=False)


@dataclass(frozen=True, slots=True)
class Err(Generic[E]):
    """Recoverable failure variant carrying a caller-defined error value."""

    error: E
    ok: Literal[False] = field(default=False, init=False)


Result: TypeAlias = Ok[T] | Err[E]
MaybeAwaitable: TypeAlias = U | Awaitable[U]


@dataclass(frozen=True, slots=True)
class ResultHandlers(Generic[T, E, U]):
    """Handlers for folding either variant to one output type."""

    ok: Callable[[T], U]
    err: Callable[[E], U]


def ok(value: U) -> Ok[U]:
    return Ok(value)


def err(error: F) -> Err[F]:
    return Err(error)


def is_ok(result: Result[T, E]) -> TypeGuard[Ok[T]]:
    return result.ok


def is_err(result: Result[T, E]) -> TypeGuard[Err[E]]:
    return not result.ok


def is_rejected_result(value: object) -> bool:
    """Recognize a false discriminator on mappings or objects at unknown boundaries."""
    if isinstance(value, Mapping):
        return value.get("ok") is False
    return getattr(value, "ok", None) is False


def map(result: Result[T, E], transform: Callable[[T], U]) -> Result[U, E]:
    return ok(transform(result.value)) if isinstance(result, Ok) else result


def map_err(result: Result[T, E], transform: Callable[[E], F]) -> Result[T, F]:
    return err(transform(result.error)) if isinstance(result, Err) else result


def and_then(result: Result[T, E], transform: Callable[[T], Result[U, F]]) -> Result[U, E | F]:
    return transform(result.value) if isinstance(result, Ok) else result


def match(result: Result[T, E], handlers: ResultHandlers[T, E, U]) -> U:
    return handlers.ok(result.value) if isinstance(result, Ok) else handlers.err(result.error)


def unwrap_or(result: Result[T, E], fallback: U) -> T | U:
    return result.value if isinstance(result, Ok) else fallback


def combine(results: Iterable[Result[T, E]]) -> Result[list[T], E]:
    """Collect successes in order, stopping without consuming past the first failure."""
    values: list[T] = []
    for result in results:
        if isinstance(result, Err):
            return result
        values.append(result.value)
    return ok(values)


def try_sync(operation: Callable[[], U], map_unknown_error: Callable[[Exception], F]) -> Result[U, F]:
    """Translate an exception-based boundary; process-control exceptions propagate."""
    try:
        return ok(operation())
    except Exception as error:
        return err(map_unknown_error(error))


async def _resolve(value: MaybeAwaitable[U]) -> U:
    if inspect.isawaitable(value):
        return await value
    return value


async def try_async(
    operation: Callable[[], MaybeAwaitable[U]], map_unknown_error: Callable[[Exception], F],
) -> Result[U, F]:
    """Translate setup or await exceptions; cancellation remains cancellation."""
    try:
        return ok(await _resolve(operation()))
    except Exception as error:
        return err(map_unknown_error(error))


class ResultAsync(Generic[T, E]):
    """Lazy, shared async computation. First await starts it once in the current loop.

    Subsequent awaits and branches share the task. Cancelling a waiter does not cancel
    shared work. Use within one event loop; mapper/handler bugs remain exceptions.
    """

    def __init__(self, operation: Callable[[], Awaitable[Result[T, E]]]) -> None:
        self._operation = operation
        self._task: asyncio.Future[Result[T, E]] | None = None

    async def _wait(self) -> Result[T, E]:
        if self._task is None:
            self._task = asyncio.ensure_future(self._operation())
        return await asyncio.shield(self._task)

    def __await__(self) -> Generator[object, None, Result[T, E]]:
        return self._wait().__await__()

    @staticmethod
    def from_result(result: Result[U, F]) -> ResultAsync[U, F]:
        async def resolve() -> Result[U, F]:
            return result
        return ResultAsync(resolve)

    @staticmethod
    def from_result_awaitable(awaitable: Awaitable[Result[U, F]]) -> ResultAsync[U, F]:
        """Wrap a Result awaitable without translating its exceptions."""
        return ResultAsync(lambda: awaitable)

    @staticmethod
    def from_awaitable(
        awaitable: Awaitable[U], map_unknown_error: Callable[[Exception], F],
    ) -> ResultAsync[U, F]:
        return ResultAsync(lambda: try_async(lambda: awaitable, map_unknown_error))

    @staticmethod
    def try_(
        operation: Callable[[], MaybeAwaitable[U]], map_unknown_error: Callable[[Exception], F],
    ) -> ResultAsync[U, F]:
        """Defer a boundary operation until first await, mapping ordinary exceptions."""
        return ResultAsync(lambda: try_async(operation, map_unknown_error))

    def to_awaitable(self) -> Awaitable[Result[T, E]]:
        """Expose the same reusable awaitable at a native Python boundary."""
        return self

    def map(self, transform: Callable[[T], MaybeAwaitable[U]]) -> ResultAsync[U, E]:
        async def mapped() -> Result[U, E]:
            result = await self
            return ok(await _resolve(transform(result.value))) if isinstance(result, Ok) else result
        return ResultAsync(mapped)

    def map_err(self, transform: Callable[[E], MaybeAwaitable[F]]) -> ResultAsync[T, F]:
        async def mapped() -> Result[T, F]:
            result = await self
            return err(await _resolve(transform(result.error))) if isinstance(result, Err) else result
        return ResultAsync(mapped)

    def and_then(self, transform: Callable[[T], ResultAsyncInput[U, F]]) -> ResultAsync[U, E | F]:
        async def chained() -> Result[U, E | F]:
            result = await self
            return await _resolve(transform(result.value)) if isinstance(result, Ok) else result
        return ResultAsync(chained)

    async def match(self, handlers: ResultHandlers[T, E, MaybeAwaitable[U]]) -> U:
        return await _resolve(match(await self, handlers))

    async def unwrap_or(self, fallback: U) -> T | U:
        return unwrap_or(await self, fallback)

    async def then(
        self,
        on_fulfilled: Callable[[Result[T, E]], MaybeAwaitable[U]],
        on_rejected: Callable[[Exception], MaybeAwaitable[U]] | None = None,
    ) -> U:
        """Fold the resolved Result or handle an unmapped exception, like Promise.then."""
        try:
            result = await self
        except Exception as error:
            if on_rejected is None:
                raise
            return await _resolve(on_rejected(error))
        return await _resolve(on_fulfilled(result))


ResultAsyncInput: TypeAlias = Result[T, E] | Awaitable[Result[T, E]]
