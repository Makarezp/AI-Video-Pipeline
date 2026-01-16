"""
Pipeline - Orchestrates all services together.

This is the main entry point for processing videos.
"""

from pathlib import Path
from dataclasses import dataclass

from .models import Transcript, EditDecisionList
from .transcription import OpenAITranscriptionService
from .editorial import OpenAIEditorialService


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
    Main pipeline that orchestrates transcription and editorial services.

    Services are injected, allowing easy swapping of implementations.
    """

    def __init__(self, transcription_service=None, editorial_service=None):
        self.transcription = transcription_service or OpenAITranscriptionService()
        self.editorial = editorial_service or OpenAIEditorialService()

    def process(self, video_path: "str | Path") -> ProcessingResult:
        """
        Process a video through the full pipeline.

        Args:
            video_path: Path to the video file

        Returns:
            ProcessingResult with transcript and EDL
        """
        video_path = Path(video_path)

        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        # Step 1: Transcribe
        print(f"[1/2] Transcribing {video_path.name}...")
        transcript = self.transcription.transcribe(video_path)
        print(
            f"      Found {len(transcript.segments)} words in {transcript.duration:.1f}s"
        )

        # Step 2: Analyze and create EDL
        print("[2/2] Analyzing transcript with LLM...")
        edl = self.editorial.analyze(transcript)
        print(
            f"      Keeping {len(edl.keep_segments)} segments ({edl.compression_ratio:.1%} of original)"
        )

        return ProcessingResult(transcript=transcript, edl=edl)


def process_video(video_path: "str | Path") -> ProcessingResult:
    """Convenience function to process a video with default settings."""
    pipeline = VideoPipeline()
    return pipeline.process(video_path)
