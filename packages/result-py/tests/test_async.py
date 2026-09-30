"""Ports of result-ts async contracts, including task sharing and cancellation."""

import asyncio
import unittest
from unittest.mock import Mock

from tenets_result import ResultAsync, ResultHandlers, err, ok


async def resolved(value):
    return value


async def rejected():
    raise ValueError('provider timeout')


def setup_failure():
    raise ValueError('missing token')


class ResultAsyncTests(unittest.IsolatedAsyncioTestCase):
    async def test_wrap_sync_result(self):
        self.assertEqual(await ResultAsync.from_result(ok(42)), ok(42))

    async def test_wrap_result_awaitable(self):
        self.assertEqual(await ResultAsync.from_result_awaitable(resolved(ok('loaded'))), ok('loaded'))

    async def test_map_awaitable_exception(self):
        self.assertEqual(await ResultAsync.from_awaitable(rejected(), str), err('provider timeout'))

    async def test_try_async_operation(self):
        self.assertEqual(await ResultAsync.try_(lambda: resolved('page-content'), str), ok('page-content'))

    async def test_try_setup_exception(self):
        self.assertEqual(await ResultAsync.try_(setup_failure, str), err('missing token'))

    async def test_map_success(self):
        self.assertEqual(await ResultAsync.from_result(ok(2)).map(lambda value: value * 4), ok(8))

    async def test_map_skips_failure(self):
        transform = Mock()
        failure = err('abc')
        self.assertIs(await ResultAsync.from_result(failure).map(transform), failure)
        transform.assert_not_called()

    async def test_map_failure(self):
        self.assertEqual(await ResultAsync.from_result(err('abc')).map_err(str.upper), err('ABC'))

    async def test_map_error_skips_success(self):
        transform = Mock()
        success = ok(3)
        self.assertIs(await ResultAsync.from_result(success).map_err(transform), success)
        transform.assert_not_called()

    async def test_chain_sync_async_and_awaitable(self):
        for transform in (
            lambda value: ok(value + 1),
            lambda value: ResultAsync.from_result(ok(value + 1)),
            lambda value: resolved(ok(value + 1)),
        ):
            self.assertEqual(await ResultAsync.from_result(ok(5)).and_then(transform), ok(6))

    async def test_chain_preserves_first_and_downstream_failures(self):
        transform = Mock()
        failure = err('first')
        self.assertIs(await ResultAsync.from_result(failure).and_then(transform), failure)
        transform.assert_not_called()
        self.assertEqual(await ResultAsync.from_result(ok('cms')).and_then(
            lambda provider: ResultAsync.from_result(err(provider))), err('cms'))

    async def test_match_and_unwrap(self):
        handlers = ResultHandlers(ok=lambda value: f'value:{value}', err=str.upper)
        success = ResultAsync.from_result(ok(7))
        failure = ResultAsync.from_result(err('abc'))
        self.assertEqual(await success.match(handlers), 'value:7')
        self.assertEqual(await failure.match(handlers), 'ABC')
        self.assertEqual(await success.unwrap_or(0), 7)
        self.assertEqual(await failure.unwrap_or('fallback'), 'fallback')

    async def test_awaitable_and_then_boundaries(self):
        result = ResultAsync.from_result(ok(12))
        self.assertEqual(await result.to_awaitable(), ok(12))
        self.assertEqual(await result.then(lambda value: str(value.value)), '12')

    async def test_nested_sync_to_async_composition(self):
        loaded = await ResultAsync.from_result(ok(7)).and_then(
            lambda value: ResultAsync.from_awaitable(resolved(f'page:{value}'), str))
        self.assertEqual(loaded, ok('page:7'))

    async def test_async_transforms_and_handlers(self):
        self.assertEqual(await ResultAsync.from_result(ok(2)).map(lambda n: resolved(n * 4)), ok(8))
        self.assertEqual(await ResultAsync.from_result(err('abc')).map_err(
            lambda error: resolved(error.upper())), err('ABC'))
        handlers = ResultHandlers(ok=lambda value: resolved(value + 1), err=lambda _: resolved(0))
        self.assertEqual(await ResultAsync.from_result(ok(7)).match(handlers), 8)
        self.assertEqual(await ResultAsync.from_result(err('bad')).match(handlers), 0)

    async def test_unmapped_errors_propagate(self):
        result = ResultAsync.from_result_awaitable(rejected())
        for _ in range(2):
            with self.assertRaisesRegex(ValueError, 'provider timeout'):
                await result
        self.assertEqual(await result.then(lambda _: 'unexpected', lambda error: str(error)),
                         'provider timeout')

    async def test_callback_errors_are_not_laundered(self):
        for result in (
            ResultAsync.from_result(ok(1)).map(lambda _: setup_failure()),
            ResultAsync.from_result(err(1)).map_err(lambda _: setup_failure()),
            ResultAsync.from_result(ok(1)).and_then(lambda _: setup_failure()),
            ResultAsync.try_(setup_failure, lambda _: setup_failure()),
        ):
            with self.assertRaisesRegex(ValueError, 'missing token'):
                await result
        on_rejected = Mock()
        with self.assertRaisesRegex(ValueError, 'missing token'):
            await ResultAsync.from_result(ok(1)).then(lambda _: setup_failure(), on_rejected)
        on_rejected.assert_not_called()

    async def test_repeated_and_concurrent_awaits_execute_once(self):
        operation = Mock(return_value=42)
        result = ResultAsync.try_(operation, str)
        operation.assert_not_called()
        values = await asyncio.gather(result, result.map(str), result.map(lambda value: value + 1))
        self.assertEqual(values, [ok(42), ok('42'), ok(43)])
        self.assertEqual(await result, ok(42))
        operation.assert_called_once_with()

    async def test_waiter_cancellation_does_not_cancel_shared_work(self):
        started = asyncio.Event()
        finish = asyncio.Event()
        async def operation():
            started.set()
            await finish.wait()
            return 42
        result = ResultAsync.try_(operation, str)
        waiter = asyncio.ensure_future(result)
        await started.wait()
        waiter.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await waiter
        finish.set()
        self.assertEqual(await result, ok(42))

    async def test_operation_cancellation_propagates(self):
        async def operation():
            raise asyncio.CancelledError()
        with self.assertRaises(asyncio.CancelledError):
            await ResultAsync.try_(operation, str)
