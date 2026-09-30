"""Always-on assertions for impossible internal states, with explicit diagnostics."""

from collections.abc import Mapping
from typing import Literal, Protocol

__all__ = [
    "DEFAULT_INVARIANT_ERROR_CODE", "DEFAULT_STRIPPED_INVARIANT_MESSAGE",
    "InvariantError", "InvariantMode", "ConfiguredInvariant", "create_invariant", "invariant",
]

DEFAULT_INVARIANT_ERROR_CODE = "ERR_INVARIANT"
DEFAULT_STRIPPED_INVARIANT_MESSAGE = (
    "Invariant violation. Enable development diagnostics for the full error message."
)
InvariantMode = Literal["development", "production"]


class InvariantError(Exception):
    """Programmer failure with stable metadata and optional native exception chaining."""

    name = "InvariantError"

    def __init__(
        self,
        message: str,
        *,
        code: str = DEFAULT_INVARIANT_ERROR_CODE,
        docs_url: str | None = None,
        details: Mapping[str, object] | None = None,
        cause: BaseException | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.docs_url = docs_url
        self.details = details
        self.cause = cause
        if cause is not None:
            self.__cause__ = cause


class ConfiguredInvariant(Protocol):
    """Callable assertion configured independently of environment variables."""

    def __call__(
        self, condition: object, message: str | None = None, *format_values: object,
    ) -> None: ...


def create_invariant(
    *,
    mode: InvariantMode = "development",
    code: str = DEFAULT_INVARIANT_ERROR_CODE,
    docs_url: str | None = None,
    stripped_message: str = DEFAULT_STRIPPED_INVARIANT_MESSAGE,
    require_message_in_development: bool | None = None,
) -> ConfiguredInvariant:
    """Configure message requirements, production stripping, and failure metadata."""
    if mode not in ("development", "production"):
        raise ValueError("mode must be 'development' or 'production'")
    requires_message = (
        mode == "development"
        if require_message_in_development is None
        else require_message_in_development
    )

    def check(
        condition: object, message: str | None = None, *format_values: object,
    ) -> None:
        if requires_message and message is None:
            raise InvariantError(
                "invariant requires an error message argument", code=code, docs_url=docs_url,
            )
        if message is not None and not isinstance(message, str):
            raise InvariantError(
                "invariant message must be a string", code=code, docs_url=docs_url,
                details={"received_type": type(message).__name__},
            )
        if condition:
            return
        diagnostic = stripped_message
        if mode == "development" and message is not None:
            # Split first so placeholder-like text inside a value is never interpolated again.
            parts = message.split("%s")
            diagnostic = parts[0] + "".join(
                (str(format_values[i]) if i < len(format_values) else "undefined") + part
                for i, part in enumerate(parts[1:])
            )
        raise InvariantError(diagnostic, code=code, docs_url=docs_url)

    return check


invariant: ConfiguredInvariant = create_invariant()
