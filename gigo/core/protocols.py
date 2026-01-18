"""
GIGO Protocol Definitions

Interfaces (Protocols) for external dependencies allowing dependency injection
and easy mocking for tests.
"""

from pathlib import Path
from typing import Protocol

from .models import Transcript, EditDecisionList


class TranscriptionProvider(Protocol):
    """Protocol for speech-to-text services (e.g., Whisper)."""

    def transcribe(self, audio_path: Path) -> Transcript:
        """
        Transcribe an audio file to text with word-level timestamps.

        Args:
            audio_path: Path to audio file (mp3, wav, etc.)

        Returns:
            Transcript with word segments and timing information.
        """
        ...


class VideoAnalyzer(Protocol):
    """Protocol for AI-powered video analysis (e.g., Gemini)."""

    def analyze(
        self,
        video_path: Path,
        transcript: Transcript,
        user_instructions: str | None = None,
    ) -> EditDecisionList:
        """
        Analyze video content and decide which segments to keep/remove.

        Args:
            video_path: Path to video file
            transcript: Transcript with word-level timestamps
            user_instructions: Optional user guidance

        Returns:
            EditDecisionList with keep/remove decisions.
        """
        ...


class ChunkAnalyzer(Protocol):
    """Protocol for finding semantic split points in transcripts."""

    def get_split_points(
        self, transcript: Transcript, target_duration: int = 150
    ) -> list[float]:
        """
        Find optimal split points in a transcript for chunking.

        Args:
            transcript: Full transcript to analyze
            target_duration: Target chunk duration in seconds

        Returns:
            List of timestamps (seconds) where video should be split.
        """
        ...


class VideoProcessor(Protocol):
    """Protocol for video processing operations (e.g., FFmpeg)."""

    def extract_audio(self, video_path: Path, output_format: str = "mp3") -> Path:
        """
        Extract audio track from video.

        Args:
            video_path: Path to source video
            output_format: Audio format (mp3, wav, etc.)

        Returns:
            Path to extracted audio file.
        """
        ...

    def compress(
        self,
        video_path: Path,
        target_width: int = 640,
        skip_threshold_mb: int = 50,
    ) -> Path:
        """
        Compress video for analysis (reduced resolution/bitrate).

        Args:
            video_path: Path to source video
            target_width: Target width in pixels
            skip_threshold_mb: Skip compression if file smaller than this

        Returns:
            Path to compressed video (or original if skipped).
        """
        ...

    def split(self, video_path: Path, timestamps: list[float]) -> list[Path]:
        """
        Split video at given timestamps.

        Args:
            video_path: Path to source video
            timestamps: List of split points in seconds

        Returns:
            List of paths to chunk files.
        """
        ...

    def get_dimensions(self, video_path: Path) -> tuple[int, int]:
        """
        Get video width and height.

        Args:
            video_path: Path to video file

        Returns:
            Tuple of (width, height).
        """
        ...

    def render_segments(
        self,
        video_path: Path,
        segments: list,
        output_path: Path,
        zoom_scale: float = 1.15,
    ) -> Path:
        """
        Render final video from segment list.

        Args:
            video_path: Path to source video
            segments: List of KeepSegment to include
            output_path: Path for output video
            zoom_scale: Zoom factor for alternating segments

        Returns:
            Path to rendered video.
        """
        ...
