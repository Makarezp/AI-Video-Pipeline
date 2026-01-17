"""
Transcription Service

Domain service for handling transcription workflow.
"""

import logging
from pathlib import Path

from gigo.core.models import Transcript
from gigo.core.protocols import TranscriptionProvider, VideoProcessor

logger = logging.getLogger("gigo.services.transcription")


class TranscriptionService:
    """
    Handles the transcription workflow.

    Coordinates audio extraction and transcription,
    ensuring proper cleanup of temporary files.
    """

    def __init__(
        self,
        provider: TranscriptionProvider,
        processor: VideoProcessor,
    ):
        """
        Initialize transcription service.

        Args:
            provider: Transcription provider (e.g., Whisper)
            processor: Video processor for audio extraction
        """
        self._provider = provider
        self._processor = processor

    def transcribe_video(self, video_path: Path) -> Transcript:
        """
        Transcribe a video file.

        Extracts audio and sends to transcription provider.
        Cleans up temporary audio file after transcription.

        Args:
            video_path: Path to video file

        Returns:
            Transcript with word-level timestamps
        """
        video_path = Path(video_path)
        logger.info(f"Transcribing video: {video_path.name}")

        # Extract audio
        audio_path = self._processor.extract_audio(video_path)

        try:
            # Transcribe
            transcript = self._provider.transcribe(audio_path)
            logger.info(
                f"Transcription complete: {len(transcript.segments)} words, "
                f"{transcript.duration:.1f}s"
            )
            return transcript
        finally:
            # Always cleanup audio file
            audio_path.unlink(missing_ok=True)
