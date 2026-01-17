"""Core module exports."""

from .models import (
    WordSegment,
    Transcript,
    KeepSegment,
    EditDecisionList,
    TranscriptionService,
    EditorialService,
    RenderingService,
)
from .transcription import OpenAITranscriptionService
from .editorial import OpenAIEditorialService
from .rendering import FFmpegRenderingService
from .hybrid import HybridVideoService
from .pipeline import VideoPipeline, ProcessingResult, process_video

__all__ = [
    # Models
    "WordSegment",
    "Transcript",
    "KeepSegment",
    "EditDecisionList",
    # Protocols
    "TranscriptionService",
    "EditorialService",
    "RenderingService",
    # Services
    "OpenAITranscriptionService",
    "OpenAIEditorialService",
    "FFmpegRenderingService",
    "HybridVideoService",
    # Pipeline
    "VideoPipeline",
    "ProcessingResult",
    "process_video",
]
