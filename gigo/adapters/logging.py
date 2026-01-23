"""
Logging Adapter

Concrete implementation of the Logger protocol using Python's standard logging.
"""

import logging
from typing import Any

from gigo.core.protocols import Logger


class ConsoleLogger(Logger):
    """
    Logger implementation that outputs to console via standard logging.
    """

    def __init__(self, name: str = "gigo"):
        self.logger = logging.getLogger(name)

        # Configure if not already configured
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def info(self, message: str, **kwargs: Any) -> None:
        self.logger.info(message, extra=kwargs)

    def error(self, message: str, **kwargs: Any) -> None:
        self.logger.error(message, extra=kwargs)

    def warning(self, message: str, **kwargs: Any) -> None:
        self.logger.warning(message, extra=kwargs)

    def debug(self, message: str, **kwargs: Any) -> None:
        self.logger.debug(message, extra=kwargs)
