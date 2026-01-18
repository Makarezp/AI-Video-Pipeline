"""
GarbageInGoldOut - Core Data Models

All data contracts between services are defined here using Pydantic.
This ensures type safety and validation across the entire pipeline.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Literal, Protocol
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

    def slice(self, start: float, end: float) -> "Transcript":
        """
        Create a new Transcript containing only words within [start, end].
        Timestamps are adjusted relative to 'start'.
        """
        # Filter segments that overlap with the window
        new_segments = []
        for seg in self.segments:
            # We include a word if its midpoint falls within the range
            midpoint = (seg.start + seg.end) / 2
            if start <= midpoint < end:
                # Create copy with offset timestamps
                new_seg = seg.model_copy()
                new_seg.start = max(0.0, seg.start - start)
                new_seg.end = max(0.0, seg.end - start)
                new_segments.append(new_seg)

        # Reconstruct full text from kept segments
        new_text = " ".join([s.word for s in new_segments])

        return Transcript(
            segments=new_segments, full_text=new_text, duration=end - start
        )


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
    interactive_segments: list["TimelineSegment"] | None = None
    original_duration: float
    final_duration: float = 0.0
    compression_ratio: float = 0.0

    def model_post_init(self, __context):
        # Calculate final duration and compression ratio
        self.final_duration = sum(s.end - s.start for s in self.keep_segments)
        if self.original_duration > 0:
            self.compression_ratio = self.final_duration / self.original_duration


# =============================================================================
# INTERACTIVE TIMELINE MODELS (Human-in-the-Loop)
# =============================================================================


class TimelineSegment(BaseModel):
    """A segment with action (keep/remove) and reason for the interactive UI."""

    start: float = Field(ge=0, description="Start time in seconds")
    end: float = Field(ge=0, description="End time in seconds")
    action: str = Field(description="'keep' or 'remove'")
    reason: str = Field(default="", description="Why this action was chosen")
    original_action: str = Field(
        default="", description="What the AI originally decided"
    )

    @field_validator("action")
    @classmethod
    def validate_action(cls, v):
        if v not in ("keep", "remove"):
            raise ValueError("action must be 'keep' or 'remove'")
        return v


class InteractiveEDL(BaseModel):
    """
    Gapless timeline covering 100% of video duration.
    Every millisecond is either 'keep' or 'remove'.
    """

    segments: list[TimelineSegment]
    original_duration: float = Field(ge=0)

    def to_edit_decision_list(self) -> "EditDecisionList":
        """Convert back to EditDecisionList for rendering (keep segments only)."""
        keep_segments = [
            KeepSegment(start=seg.start, end=seg.end, reason=seg.reason)
            for seg in self.segments
            if seg.action == "keep"
        ]
        return EditDecisionList(
            keep_segments=keep_segments, original_duration=self.original_duration
        )


# =============================================================================
# SERVICE PROTOCOLS (Abstractions for decoupling)
# =============================================================================


class RenderingService(Protocol):
    """Protocol for video rendering implementations."""

    def render(
        self, video_path: Path, edl: EditDecisionList, output_path: Path
    ) -> Path: ...


# =============================================================================
# PERSISTENCE MODELS
# =============================================================================


class ProjectMetadata(BaseModel):
    """Metadata for a video project."""

    id: str
    name: str = "Untitled Project"
    status: Literal["created", "analyzing", "ready", "failed"] = "created"
    created_at: str
    duration: float = 0.0
    thumbnail_path: str = ""
    source_video_path: str = ""
    user_instructions: str | None = None
