"""
Transcription Service - OpenAI Whisper Implementation

Converts audio/video files to word-level transcripts using OpenAI's Whisper API.
The service is decoupled via the TranscriptionService protocol in models.py.
"""

import subprocess
import tempfile
from pathlib import Path
from typing import Optional
from openai import OpenAI

from .models import Transcript, WordSegment


class OpenAITranscriptionService:
    """
    Transcription service using OpenAI's Whisper API.

    To swap implementations, create a new class that matches the
    TranscriptionService protocol and inject it into the pipeline.
    """

    def __init__(self, client: Optional[OpenAI] = None):
        self.client = client or OpenAI()

    def transcribe(self, audio_path: Path) -> Transcript:
        """
        Transcribe an audio/video file to a word-level transcript.

        Args:
            audio_path: Path to the audio or video file

        Returns:
            Transcript object with word-level timestamps
        """
        audio_path = Path(audio_path)

        # For video files or large files, extract audio first
        if self._needs_audio_extraction(audio_path):
            print("      Extracting audio from video...")
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                tmp_path = Path(tmp.name)

            try:
                self._extract_audio(audio_path, tmp_path)
                return self._transcribe_file(tmp_path)
            finally:
                tmp_path.unlink(missing_ok=True)
        else:
            return self._transcribe_file(audio_path)

    def _needs_audio_extraction(self, path: Path) -> bool:
        """Check if we need to extract audio (video files or large files)."""
        video_extensions = {".mov", ".mp4", ".avi", ".mkv", ".webm", ".m4v"}
        is_video = path.suffix.lower() in video_extensions
        is_large = path.stat().st_size > 25 * 1024 * 1024  # > 25MB
        return is_video or is_large

    def _extract_audio(self, video_path: Path, audio_path: Path) -> None:
        """Extract audio from video using ffmpeg."""
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vn",  # No video
            "-acodec",
            "libmp3lame",
            "-ab",
            "128k",  # 128kbps is enough for speech
            "-ar",
            "16000",  # 16kHz sample rate (optimal for Whisper)
            str(audio_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {result.stderr}")
        print(f"      Audio extracted: {audio_path.stat().st_size / 1024 / 1024:.1f}MB")

    def _transcribe_file(self, audio_path: Path) -> Transcript:
        """Send audio file to Whisper API."""
        print(f"      Uploading to Whisper API...")

        with open(audio_path, "rb") as audio_file:
            response = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["word"],
            )

        # Parse word-level timestamps from response
        segments = []
        if hasattr(response, "words") and response.words:
            for word_data in response.words:
                segments.append(
                    WordSegment(
                        word=word_data.word,
                        start=word_data.start,
                        end=word_data.end,
                        confidence=1.0,  # Whisper API doesn't return confidence per word
                    )
                )

        return Transcript(
            segments=segments,
            full_text=response.text,
            duration=response.duration
            if hasattr(response, "duration")
            else segments[-1].end
            if segments
            else 0.0,
        )
