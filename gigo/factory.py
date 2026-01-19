"""
GIGO Factory

Factory functions for creating fully-wired service instances.
Handles dependency injection and configuration.
"""

import os

from google import genai
from openai import OpenAI

from gigo.adapters.ffmpeg import FFmpegVideoProcessor
from gigo.adapters.gemini import (
    GeminiChunkAnalyzer,
    GeminiPunctuationRestorer,
    GeminiVideoAnalyzer,
)
from gigo.adapters.whisper import WhisperTranscriptionAdapter
from gigo.config import GIGOConfig, default_config
from gigo.core.orchestrator import VideoOrchestrator
from gigo.services.analysis import AnalysisService
from gigo.services.timeline import TimelineService
from gigo.services.transcription import TranscriptionService


def create_orchestrator(
    config: GIGOConfig | None = None,
    openai_api_key: str | None = None,
    gemini_api_key: str | None = None,
) -> VideoOrchestrator:
    """
    Create a fully-wired VideoOrchestrator.

    This is the main factory function for creating orchestrators.
    All dependencies are created and injected.

    Args:
        config: Optional configuration (uses default if not provided)
        openai_api_key: OpenAI API key (defaults to env var)
        gemini_api_key: Gemini API key (defaults to env var)

    Returns:
        Fully configured VideoOrchestrator
    """
    config = config or default_config

    # Get API keys
    openai_key = openai_api_key or os.getenv("OPENAI_API_KEY")
    gemini_key = gemini_api_key or os.getenv("GEMINI_API_KEY")

    if not gemini_key:
        raise ValueError("GEMINI_API_KEY not found")

    # Create clients
    openai_client = OpenAI(api_key=openai_key)
    gemini_client = genai.Client(api_key=gemini_key)

    # Create adapters
    ffmpeg = FFmpegVideoProcessor(
        compression_preset=config.ffmpeg.compression_preset,
        compression_crf=config.ffmpeg.compression_crf,
        audio_bitrate=config.ffmpeg.audio_bitrate,
        audio_sample_rate=config.ffmpeg.audio_sample_rate,
    )

    whisper = WhisperTranscriptionAdapter(openai_client)

    gemini_analyzer = GeminiVideoAnalyzer(
        client=gemini_client,
        model=config.gemini.analysis_model,
        prompt_template=config.gemini.analysis_prompt,
        log_dir=config.log_dir,
    )

    chunk_analyzer = GeminiChunkAnalyzer(
        client=gemini_client,
        model=config.gemini.chunking_model,
        prompt_template=config.gemini.chunking_prompt,
    )

    punctuation_restorer = GeminiPunctuationRestorer(
        client=gemini_client,
        model="gemini-2.0-flash-lite",  # Use the latest lite model
    )

    # Create services
    transcription_service = TranscriptionService(
        provider=whisper,
        processor=ffmpeg,
    )

    analysis_service = AnalysisService(
        analyzer=gemini_analyzer,
        chunk_analyzer=chunk_analyzer,
        processor=ffmpeg,
        long_video_threshold=config.analysis.long_video_threshold,
    )

    timeline_service = TimelineService()

    # Create and return orchestrator
    return VideoOrchestrator(
        transcription_service=transcription_service,
        punctuation_restorer=punctuation_restorer,
        analysis_service=analysis_service,
        timeline_service=timeline_service,
    )


# Backward compatibility alias
def create_hybrid_service(
    openai_api_key: str | None = None,
    gemini_api_key: str | None = None,
) -> VideoOrchestrator:
    """
    Backward compatibility factory.

    Creates a VideoOrchestrator for code that was using HybridVideoService.
    """
    return create_orchestrator(
        openai_api_key=openai_api_key,
        gemini_api_key=gemini_api_key,
    )
