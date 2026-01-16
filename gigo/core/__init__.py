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
    # Pipeline
    "VideoPipeline",
    "ProcessingResult",
    "process_video",
]
