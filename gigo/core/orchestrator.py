"""
Video Orchestrator

Thin coordinator that orchestrates the full video analysis pipeline.
This is the refactored version of HybridVideoService.
"""

import logging
from pathlib import Path

from gigo.core.models import EditDecisionList, InteractiveEDL
from gigo.services.transcription import TranscriptionService
from gigo.services.analysis import AnalysisService
from gigo.services.timeline import TimelineService

logger = logging.getLogger("gigo.orchestrator")


class VideoOrchestrator:
    """
    Orchestrates the full video analysis pipeline.

    Coordinates:
    1. Transcription (Whisper)
    2. Analysis (Gemini)
    3. Timeline conversion

    This is a thin coordinator - all heavy lifting is done by services.
    """

    def __init__(
        self,
        transcription_service: TranscriptionService,
        analysis_service: AnalysisService,
        timeline_service: TimelineService,
    ):
        """
        Initialize orchestrator with injected services.

        Args:
            transcription_service: Service for transcription workflow
            analysis_service: Service for video analysis
            timeline_service: Service for timeline operations
        """
        self._transcription = transcription_service
        self._analysis = analysis_service
        self._timeline = timeline_service

    async def process_async(self, video_path: Path) -> EditDecisionList:
        """
        Process a video through the full analysis pipeline.

        Args:
            video_path: Path to video file

        Returns:
            EditDecisionList with keep/remove decisions
        """
        video_path = Path(video_path)
        logger.info(f"Starting analysis of {video_path.name}")

        # Step 1: Transcribe
        logger.info("[1/2] Transcribing with Whisper...")
        transcript = self._transcription.transcribe_video(video_path)
        logger.info(
            f"      Found {len(transcript.segments)} words in {transcript.duration:.1f}s"
        )

        # Step 2: Analyze
        logger.info("[2/2] Analyzing with Gemini...")
        edl = await self._analysis.analyze_async(video_path, transcript)

        logger.info(
            f"Analysis complete: {len(edl.keep_segments)} segments, "
            f"{edl.compression_ratio:.1%} kept"
        )

        return edl

    def process(self, video_path: Path) -> EditDecisionList:
        """Sync wrapper for process_async."""
        import asyncio

        return asyncio.run(self.process_async(video_path))

    def get_interactive_timeline(self, edl: EditDecisionList) -> InteractiveEDL:
        """Convert EDL to interactive timeline for UI."""
        return self._timeline.get_interactive_timeline(edl)
