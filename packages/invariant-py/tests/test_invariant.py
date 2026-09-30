"""Ports of invariant-ts contracts, plus Python-specific runtime guarantees."""

import unittest
from unittest.mock import Mock

from tenets_invariant import (
    DEFAULT_INVARIANT_ERROR_CODE, DEFAULT_STRIPPED_INVARIANT_MESSAGE,
    InvariantError, create_invariant, invariant,
)


class InvariantTests(unittest.TestCase):
    def test_truthy_conditions(self):
        for value in (True, 1, 'id', [1], {'id': 1}):
            with self.subTest(value=value):
                self.assertIsNone(invariant(value, 'valid'))

    def test_falsey_conditions(self):
        for value in (False, None, 0, '', [], {}):
            with self.subTest(value=value), self.assertRaises(InvariantError):
                invariant(value, 'invalid')

    def test_preserves_diagnostic(self):
        with self.assertRaises(InvariantError) as caught:
            invariant(False, 'workspace id must exist')
        self.assertEqual(str(caught.exception), 'workspace id must exist')

    def test_formats_placeholders(self):
        with self.assertRaises(InvariantError) as caught:
            invariant(False, 'workspace %s revision %s', 'workspace_123', 42)
        self.assertEqual(caught.exception.message, 'workspace workspace_123 revision 42')

    def test_missing_placeholder_values(self):
        with self.assertRaises(InvariantError) as caught:
            invariant(False, 'value %s and %s', 'one')
        self.assertEqual(str(caught.exception), 'value one and undefined')

    def test_extra_placeholder_values(self):
        with self.assertRaises(InvariantError) as caught:
            invariant(False, 'value %s', 'one', 'ignored')
        self.assertEqual(str(caught.exception), 'value one')

    def test_default_metadata(self):
        with self.assertRaises(InvariantError) as caught:
            invariant(False, 'missing')
        self.assertEqual(caught.exception.name, 'InvariantError')
        self.assertEqual(caught.exception.code, DEFAULT_INVARIANT_ERROR_CODE)

    def test_requires_message_even_when_truthy(self):
        with self.assertRaisesRegex(InvariantError, 'requires an error message'):
            invariant(True)

    def test_rejects_non_string_message_even_when_truthy(self):
        with self.assertRaisesRegex(InvariantError, 'message must be a string'):
            invariant(True, 123)

    def test_development_preserves_message(self):
        with self.assertRaisesRegex(InvariantError, 'internal detail abc'):
            create_invariant(mode='development')(False, 'internal detail %s', 'abc')

    def test_production_strips_message(self):
        with self.assertRaises(InvariantError) as caught:
            create_invariant(mode='production')(False, 'secret %s', 'workspace_123')
        self.assertEqual(str(caught.exception), DEFAULT_STRIPPED_INVARIANT_MESSAGE)

    def test_production_allows_omitted_message(self):
        self.assertIsNone(create_invariant(mode='production')(True))

    def test_production_failure_without_message(self):
        with self.assertRaises(InvariantError) as caught:
            create_invariant(mode='production')(False)
        self.assertEqual(str(caught.exception), DEFAULT_STRIPPED_INVARIANT_MESSAGE)

    def test_custom_stripped_message(self):
        with self.assertRaisesRegex(InvariantError, 'See docs'):
            create_invariant(mode='production', stripped_message='See docs')(False, 'secret')

    def test_custom_metadata(self):
        with self.assertRaises(InvariantError) as caught:
            create_invariant(code='ERR_TEST', docs_url='https://example.com')(False, 'bad')
        self.assertEqual(caught.exception.code, 'ERR_TEST')
        self.assertEqual(caught.exception.docs_url, 'https://example.com')

    def test_bad_message_details(self):
        with self.assertRaises(InvariantError) as caught:
            create_invariant()(True, 123)
        self.assertEqual(caught.exception.details, {'received_type': 'int'})

    def test_empty_message(self):
        with self.assertRaises(InvariantError) as caught:
            create_invariant()(False, '')
        self.assertEqual(str(caught.exception), '')

    def test_explicit_error_metadata_and_chaining(self):
        cause = ValueError('lower-level failure')
        error = InvariantError('postcondition', code='ERR_POST', details={'revision': 1},
                               docs_url='https://example.com', cause=cause)
        self.assertEqual(error.message, 'postcondition')
        self.assertEqual(error.code, 'ERR_POST')
        self.assertEqual(error.details, {'revision': 1})
        self.assertEqual(error.docs_url, 'https://example.com')
        self.assertIs(error.cause, cause)
        self.assertIs(error.__cause__, cause)

    def test_optional_development_message(self):
        check = create_invariant(require_message_in_development=False)
        check(True)
        with self.assertRaises(InvariantError) as caught:
            check(False)
        self.assertEqual(str(caught.exception), DEFAULT_STRIPPED_INVARIANT_MESSAGE)

    def test_explicit_production_message_requirement(self):
        with self.assertRaisesRegex(InvariantError, 'requires an error message'):
            create_invariant(mode='production', require_message_in_development=True)(True)

    def test_invalid_production_message(self):
        with self.assertRaisesRegex(InvariantError, 'message must be a string'):
            create_invariant(mode='production')(True, 123)

    def test_does_not_stringify_values_on_success_or_in_production(self):
        value = Mock()
        value.__str__ = Mock(side_effect=RuntimeError('must not render'))
        invariant(True, '%s', value)
        with self.assertRaises(InvariantError):
            create_invariant(mode='production')(False, '%s', value)
        value.__str__.assert_not_called()

    def test_python_string_conversion_and_no_recursive_interpolation(self):
        with self.assertRaises(InvariantError) as caught:
            invariant(False, '%s %s %s %%', None, True, '%s')
        self.assertEqual(str(caught.exception), 'None True %s %%')

    def test_invalid_mode_is_rejected(self):
        with self.assertRaises(ValueError):
            create_invariant(mode='typo')
