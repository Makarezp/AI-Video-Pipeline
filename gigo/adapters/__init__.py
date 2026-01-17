"""
GIGO Adapters Package

Infrastructure adapters for external services (FFmpeg, Whisper, Gemini).
"""

from .ffmpeg import FFmpegVideoProcessor
from .whisper import WhisperTranscriptionAdapter
from .gemini import GeminiVideoAnalyzer, GeminiChunkAnalyzer

__all__ = [
    "FFmpegVideoProcessor",
    "WhisperTranscriptionAdapter",
    "GeminiVideoAnalyzer",
    "GeminiChunkAnalyzer",
]
