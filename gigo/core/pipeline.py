"""
Pipeline - Orchestrates all services together.

This is the main entry point for processing videos.
"""

from pathlib import Path
from dataclasses import dataclass

from .models import Transcript, EditDecisionList
from .hybrid import HybridVideoService


@dataclass
class ProcessingResult:
    """Result of processing a video through the pipeline."""

    transcript: Transcript
    edl: EditDecisionList

    def summary(self) -> str:
        """Human-readable summary of the processing result."""
        return f"""
=== Processing Complete ===
Original duration: {self.edl.original_duration:.1f}s
Final duration: {self.edl.final_duration:.1f}s
Compression: {self.edl.compression_ratio:.1%}
Segments kept: {len(self.edl.keep_segments)}

=== Transcript ===
{self.transcript.full_text[:500]}{"..." if len(self.transcript.full_text) > 500 else ""}

=== Edit Decision List ===
""" + "\n".join(
            f"  [{s.start:.2f}s - {s.end:.2f}s] {s.reason}"
            for s in self.edl.keep_segments
        )


class VideoPipeline:
    """
    Main pipeline that orchestrates multimodal analysis.
    Uses HybridVideoService (Whisper + Gemini 3) for the best results.
    """

    def __init__(self, service=None):
        self.service = service or HybridVideoService()

    def process(self, video_path: "str | Path") -> ProcessingResult:
        """
        Process a video through the hybrid multimodal pipeline.

        Args:
            video_path: Path to the video file

        Returns:
            ProcessingResult with transcript and EDL
        """
        video_path = Path(video_path)

        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        # In HybridVideoService, word-level transcription and
        # multimodal analysis happen inside analyze_video
        edl = self.service.analyze_video(video_path)

        # We need the transcript for the ProcessingResult
        # Re-running transcription is a bit wasteful, but the pipeline
        # is becoming a legacy wrapper around HybridVideoService anyway.
        # For now, we'll extract the transcript from the service's internal method
        # and focus on getting the EDL.
        transcript = self.service._transcribe_with_whisper(video_path)

        return ProcessingResult(transcript=transcript, edl=edl)


def process_video(video_path: "str | Path") -> ProcessingResult:
    """Convenience function to process a video with default settings."""
    pipeline = VideoPipeline()
    return pipeline.process(video_path)
