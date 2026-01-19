"""
Video Orchestrator

Thin coordinator that orchestrates the full video analysis pipeline.
This is the refactored version of HybridVideoService.
"""

import logging
from pathlib import Path

from gigo.core.protocols import PunctuationRestorer
from gigo.core.models import EditDecisionList, InteractiveEDL, Transcript
from gigo.services.transcription import TranscriptionService
from gigo.services.analysis import AnalysisService
from gigo.services.timeline import TimelineService

logger = logging.getLogger("gigo.orchestrator")


class VideoOrchestrator:
    """
    Orchestrates the full video analysis pipeline.

    Coordinates:
    1. Transcription (Whisper)
    2. Punctuation Restoration (Gemini)
    3. Analysis (Gemini)
    4. Timeline conversion

    This is a thin coordinator - all heavy lifting is done by services.
    """

    def __init__(
        self,
        transcription_service: TranscriptionService,
        punctuation_restorer: PunctuationRestorer,
        analysis_service: AnalysisService,
        timeline_service: TimelineService,
    ):
        """
        Initialize orchestrator with injected services.

        Args:
            transcription_service: Service for transcription workflow
            punctuation_restorer: Service for punctuation restoration
            analysis_service: Service for video analysis
            timeline_service: Service for timeline operations
        """
        self._transcription = transcription_service
        self._punctuation_restorer = punctuation_restorer
        self._analysis = analysis_service
        self._timeline = timeline_service

    async def process_async(
        self, video_path: Path, user_instructions: str | None = None
    ) -> tuple[EditDecisionList, Transcript]:
        """
        Process a video through the full analysis pipeline.

        Args:
            video_path: Path to video file
            user_instructions: Optional user guidance for calibration

        Returns:
            EditDecisionList with keep/remove decisions
        """
        video_path = Path(video_path)
        logger.info(f"Starting analysis of {video_path.name}")

        # Step 1: Transcribe
        logger.info("[1/3] Transcribing with Whisper...")
        transcript = self._transcription.transcribe_video(video_path)
        logger.info(
            f"      Found {len(transcript.segments)} words in {transcript.duration:.1f}s"
        )

        # Step 2: Restore Punctuation
        logger.info("[2/3] Restoring punctuation with Gemini...")
        transcript = self._punctuation_restorer.restore_punctuation(transcript)

        # Step 3: Analyze
        logger.info("[3/3] Analyzing with Gemini...")
        edl = await self._analysis.analyze_async(
            video_path, transcript, user_instructions
        )

        logger.info(
            f"Analysis complete: {len(edl.keep_segments)} segments, "
            f"{edl.compression_ratio:.1%} kept"
        )

        return edl, transcript

    def process(
        self, video_path: Path, user_instructions: str | None = None
    ) -> tuple[EditDecisionList, Transcript]:
        """Sync wrapper for process_async."""
        import asyncio

        return asyncio.run(self.process_async(video_path, user_instructions))

    def get_interactive_timeline(self, edl: EditDecisionList) -> InteractiveEDL:
        """Convert EDL to interactive timeline for UI."""
        return self._timeline.get_interactive_timeline(edl)
