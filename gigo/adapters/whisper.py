"""
Whisper Transcription Adapter

Implements TranscriptionProvider protocol using OpenAI Whisper API.
"""

import logging
from pathlib import Path

from openai import OpenAI

from gigo.core.models import Transcript, WordSegment

logger = logging.getLogger("gigo.adapters.whisper")


class WhisperTranscriptionAdapter:
    """
    Transcription adapter using OpenAI Whisper API.

    Implements the TranscriptionProvider protocol for word-level
    speech-to-text transcription.
    """

    def __init__(self, client: OpenAI):
        """
        Initialize with OpenAI client.

        Args:
            client: Configured OpenAI client instance
        """
        self._client = client

    def transcribe(self, audio_path: Path) -> Transcript:
        """
        Transcribe audio file to text with word-level timestamps.

        Args:
            audio_path: Path to audio file (mp3, wav, etc.)

        Returns:
            Transcript with word segments and timing information.
        """
        audio_path = Path(audio_path)

        with open(audio_path, "rb") as f:
            response = self._client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json",
                timestamp_granularities=["word"],
            )

        segments = []
        for word in response.words:
            segments.append(WordSegment(word=word.word, start=word.start, end=word.end))

        if not segments:
            logger.warning("Whisper returned no words")
            return Transcript(segments=[], full_text="", duration=0.0)

        duration = segments[-1].end
        full_text = " ".join(seg.word for seg in segments)

        logger.info(f"Transcribed {len(segments)} words in {duration:.1f}s")

        return Transcript(segments=segments, full_text=full_text, duration=duration)
