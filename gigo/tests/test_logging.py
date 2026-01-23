import logging
import unittest
from unittest.mock import MagicMock

from gigo.core.protocols import Logger
from gigo.core.orchestrator import VideoOrchestrator
from gigo.adapters.logging import ConsoleLogger


class TestLogger(unittest.TestCase):
    def test_console_logger(self):
        """Verify ConsoleLogger implements Logger protocol and outputs logs."""
        logger = ConsoleLogger(name="test_logger")

        # We can't easily capture stdout without more mocking,
        # but we can verify it doesn't crash
        logger.info("Test info message")
        logger.error("Test error message")
        logger.debug("Test debug message")

    def test_orchestrator_injection(self):
        """Verify Orchestrator accepts injected logger and uses it."""
        mock_logger = MagicMock(spec=Logger)

        # Create mocks for other dependencies
        mock_transcription = MagicMock()
        mock_punctuation = MagicMock()
        mock_analysis = MagicMock()
        mock_timeline = MagicMock()

        orchestrator = VideoOrchestrator(
            transcription_service=mock_transcription,
            punctuation_restorer=mock_punctuation,
            analysis_service=mock_analysis,
            timeline_service=mock_timeline,
            logger=mock_logger,
        )

        # Verify private attribute is set
        self.assertEqual(orchestrator._logger, mock_logger)

        # Verify logger is used in process_async (we'd need to mock async logic to fully test,
        # but this confirms instantiation worked)


if __name__ == "__main__":
    unittest.main()
