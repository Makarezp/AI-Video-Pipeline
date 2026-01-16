"""GarbageInGoldOut - Semantic Video Distillery"""

from .core.pipeline import process_video, VideoPipeline, ProcessingResult
from .core.models import (
    Transcript,
    EditDecisionList,
    KeepSegment,
    WordSegment,
)

__all__ = [
    "process_video",
    "VideoPipeline",
    "ProcessingResult",
    "Transcript",
    "EditDecisionList",
    "KeepSegment",
    "WordSegment",
]
