"""Ports of result-ts synchronous contracts and Python boundary cases."""

import asyncio
from dataclasses import FrozenInstanceError, asdict
import unittest
from unittest.mock import Mock

from tenets_result import (
    Err, Ok, ResultHandlers, and_then, combine, err, is_err, is_ok,
    is_rejected_result, map, map_err, match, ok, try_async, try_sync, unwrap_or,
)


def fail():
    raise ValueError('bad parse')


class ResultTests(unittest.TestCase):
    def test_success_variant(self):
        result = ok(42)
        self.assertTrue(is_ok(result))
        self.assertFalse(is_err(result))
        self.assertIs(result.ok, True)
        self.assertEqual(result.value, 42)
        self.assertIsInstance(result, Ok)

    def test_success_is_frozen(self):
        result = ok(42)
        with self.assertRaises(FrozenInstanceError):
            result.value = 3
        with self.assertRaises(FrozenInstanceError):
            result.ok = False

    def test_failure_variant(self):
        result = err({'type': 'ParseError', 'input': 'abc'})
        self.assertTrue(is_err(result))
        self.assertFalse(is_ok(result))
        self.assertIs(result.ok, False)
        self.assertEqual(result.error['input'], 'abc')
        self.assertIsInstance(result, Err)

    def test_failure_is_frozen(self):
        result = err('bad')
        with self.assertRaises(FrozenInstanceError):
            result.error = 'other'

    def test_map_success(self):
        self.assertEqual(map(ok(2), lambda value: value * 4), ok(8))

    def test_map_skips_failure(self):
        transform = Mock()
        result = err('abc')
        self.assertIs(map(result, transform), result)
        transform.assert_not_called()

    def test_map_error(self):
        self.assertEqual(map_err(err('abc'), str.upper), err('ABC'))

    def test_map_error_skips_success(self):
        transform = Mock()
        result = ok(3)
        self.assertIs(map_err(result, transform), result)
        transform.assert_not_called()

    def test_chain_success(self):
        self.assertEqual(and_then(ok(5), lambda value: ok(str(value))), ok('5'))
        failure = err('downstream')
        self.assertIs(and_then(ok(5), lambda value: failure), failure)

    def test_chain_skips_failure(self):
        transform = Mock()
        result = err('abc')
        self.assertIs(and_then(result, transform), result)
        transform.assert_not_called()

    def test_match_variants(self):
        handlers = ResultHandlers(ok=lambda value: f'value:{value}', err=str.upper)
        self.assertEqual(match(ok(7), handlers), 'value:7')
        self.assertEqual(match(err('abc'), handlers), 'ABC')

    def test_unwrap_variants(self):
        self.assertEqual(unwrap_or(ok('parsed'), 'fallback'), 'parsed')
        self.assertEqual(unwrap_or(err('abc'), 'fallback'), 'fallback')
        self.assertIsNone(unwrap_or(ok(None), 'fallback'))

    def test_capture_sync_exception(self):
        self.assertEqual(try_sync(fail, str), err('bad parse'))

    def test_capture_sync_success(self):
        mapper = Mock()
        self.assertEqual(try_sync(lambda: 12, mapper), ok(12))
        mapper.assert_not_called()

    def test_combine_success(self):
        self.assertEqual(combine([ok(1), ok(2), ok(3)]), ok([1, 2, 3]))

    def test_combine_first_failure(self):
        first = err('first')
        self.assertIs(combine([ok(1), first, err('second')]), first)

    def test_combine_empty(self):
        self.assertEqual(combine([]), ok([]))

    def test_combine_does_not_consume_past_failure(self):
        def results():
            yield err('first')
            self.fail('iterator must not advance')
        self.assertEqual(combine(results()), err('first'))

    def test_rejected_result_unknown_boundary(self):
        for value in (err('bad'), {'ok': False}, {'ok': False, 'extra': 1}):
            self.assertTrue(is_rejected_result(value))
        for value in (None, False, 0, 'bad', [], {}, {'ok': 0}, {'ok': None}, ok(1)):
            self.assertFalse(is_rejected_result(value))

    def test_serialization_and_shallow_freezing(self):
        payload = []
        result = ok(payload)
        payload.append(1)
        self.assertEqual(asdict(result), {'ok': True, 'value': [1]})
        self.assertEqual(asdict(err('bad')), {'ok': False, 'error': 'bad'})

    def test_transform_and_mapper_errors_propagate(self):
        for operation in (
            lambda: map(ok(1), lambda _: fail()),
            lambda: map_err(err(1), lambda _: fail()),
            lambda: and_then(ok(1), lambda _: fail()),
            lambda: try_sync(fail, lambda _: fail()),
        ):
            with self.assertRaisesRegex(ValueError, 'bad parse'):
                operation()

    def test_process_control_exceptions_propagate(self):
        for exception in (KeyboardInterrupt, SystemExit, asyncio.CancelledError):
            def stop():
                raise exception()
            with self.assertRaises(exception):
                try_sync(stop, str)


class TryAsyncTests(unittest.IsolatedAsyncioTestCase):
    async def test_capture_async_exception(self):
        async def reject():
            raise ValueError('provider timeout')
        self.assertEqual(await try_async(reject, str), err('provider timeout'))

    async def test_capture_async_success(self):
        async def load():
            return 'loaded'
        self.assertEqual(await try_async(load, str), ok('loaded'))

    async def test_capture_setup_exception(self):
        self.assertEqual(await try_async(fail, str), err('bad parse'))

    async def test_cancellation_propagates(self):
        async def cancel():
            raise asyncio.CancelledError()
        with self.assertRaises(asyncio.CancelledError):
            await try_async(cancel, str)

    async def test_mapper_exception_propagates(self):
        with self.assertRaisesRegex(ValueError, 'bad parse'):
            await try_async(fail, lambda _: fail())
