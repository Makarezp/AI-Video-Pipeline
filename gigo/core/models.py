"""
GarbageInGoldOut - Core Data Models

All data contracts between services are defined here using Pydantic.
This ensures type safety and validation across the entire pipeline.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Protocol
from pathlib import Path


# =============================================================================
# TRANSCRIPTION MODELS
# =============================================================================

class WordSegment(BaseModel):
    """A single word with its timing information."""
    word: str
    start: float = Field(ge=0, description="Start time in seconds")
    end: float = Field(ge=0, description="End time in seconds")
    confidence: float = Field(ge=0, le=1, default=1.0)

    @field_validator("end")
    @classmethod
    def end_after_start(cls, v, info):
        if "start" in info.data and v < info.data["start"]:
            raise ValueError("end must be >= start")
        return v


class Transcript(BaseModel):
    """Complete transcription result with word-level timestamps."""
    segments: list[WordSegment]
    full_text: str
    duration: float = Field(ge=0, description="Total duration in seconds")


# =============================================================================
# EDITORIAL MODELS
# =============================================================================

class KeepSegment(BaseModel):
    """A segment of video to keep in the final output."""
    start: float = Field(ge=0, description="Start time in seconds")
    end: float = Field(ge=0, description="End time in seconds")
    reason: str = Field(default="", description="Why this segment was kept")

    @field_validator("end")
    @classmethod
    def end_after_start(cls, v, info):
        if "start" in info.data and v <= info.data["start"]:
            raise ValueError("end must be > start")
        return v


class EditDecisionList(BaseModel):
    """The output of the editorial service - what to keep."""
    keep_segments: list[KeepSegment]
    original_duration: float
    final_duration: float = 0.0
    compression_ratio: float = 0.0

    def model_post_init(self, __context):
        # Calculate final duration and compression ratio
        self.final_duration = sum(s.end - s.start for s in self.keep_segments)
        if self.original_duration > 0:
            self.compression_ratio = self.final_duration / self.original_duration


# =============================================================================
# SERVICE PROTOCOLS (Abstractions for decoupling)
# =============================================================================

class TranscriptionService(Protocol):
    """Protocol for transcription implementations."""
    def transcribe(self, audio_path: Path) -> Transcript: ...


class EditorialService(Protocol):
    """Protocol for editorial/LLM implementations."""
    def analyze(self, transcript: Transcript) -> EditDecisionList: ...


class RenderingService(Protocol):
    """Protocol for video rendering implementations."""
    def render(self, video_path: Path, edl: EditDecisionList, output_path: Path) -> Path: ...
