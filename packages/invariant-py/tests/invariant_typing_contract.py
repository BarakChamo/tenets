"""Static consumer contracts for the configured assertion protocol."""

from tenets_invariant import ConfiguredInvariant, InvariantError, InvariantMode, create_invariant, invariant

mode: InvariantMode = 'production'
check: ConfiguredInvariant = create_invariant(mode=mode)
check(True)
invariant(True, 'value %s', 42)
error = InvariantError('failed', cause=ValueError('cause'), details={'revision': 1})
