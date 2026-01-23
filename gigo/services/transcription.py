"""
Transcription Service

Domain service for handling transcription workflow.
"""

from pathlib import Path

from gigo.core.models import Transcript
from gigo.core.protocols import TranscriptionProvider, VideoProcessor, Logger


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
        logger: Logger,
    ):
        """
        Initialize transcription service.

        Args:
            provider: Transcription provider (e.g., Whisper)
            processor: Video processor for audio extraction
        """
        self._provider = provider
        self._processor = processor
        self._logger = logger

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
        video_path = Path(video_path)
        self._logger.info(f"Transcribing video: {video_path.name}")

        # Extract audio
        audio_path = self._processor.extract_audio(video_path)

        try:
            # Transcribe
            transcript = self._provider.transcribe(audio_path)
            self._logger.info(
                f"Transcription complete: {len(transcript.segments)} words, "
                f"{transcript.duration:.1f}s"
            )
            return transcript
        finally:
            # Always cleanup audio file
            audio_path.unlink(missing_ok=True)
