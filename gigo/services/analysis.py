"""
Analysis Service

Domain service for coordinating video analysis.
"""

import asyncio
from pathlib import Path
from typing import Optional

from gigo.core.models import EditDecisionList, Transcript
from gigo.core.protocols import ChunkAnalyzer, VideoAnalyzer, VideoProcessor, Logger


class AnalysisService:
    """
    Coordinates video analysis (single or parallel).

    Handles compression, chunking, parallel analysis, and result merging.
    """

    def __init__(
        self,
        logger: Logger,
        analyzer: VideoAnalyzer,
        chunk_analyzer: ChunkAnalyzer,
        processor: VideoProcessor,
        long_video_threshold: float = 180.0,
    ):
        """
        Initialize analysis service.

        Args:
            logger: Injected logger
            analyzer: Video analyzer (e.g., Gemini)
            chunk_analyzer: Chunk point analyzer
            processor: Video processor for compression/splitting
            long_video_threshold: Duration (seconds) above which to use chunking
        """
        self._logger = logger
        self._analyzer = analyzer
        self._chunk_analyzer = chunk_analyzer
        self._processor = processor
        self._long_video_threshold = long_video_threshold

    async def analyze_async(
        self,
        video_path: Path,
        transcript: Transcript,
        user_instructions: str | None = None,
    ) -> EditDecisionList:
        """
        Analyze video asynchronously.

        For long videos, uses smart chunking and parallel analysis.

        Args:
            video_path: Path to video file
            transcript: Transcript with word-level timestamps
            user_instructions: Optional user guidance

        Returns:
            EditDecisionList with keep/remove decisions
        """
        video_path = Path(video_path)
        loop = asyncio.get_running_loop()

        # Compress video for analysis
        self._logger.info("Compressing video for analysis...")
        compressed_path = await loop.run_in_executor(
            None, self._processor.compress, video_path
        )

        try:
            if transcript.duration > self._long_video_threshold:
                return await self._analyze_parallel(
                    compressed_path, transcript, loop, user_instructions
                )
            else:
                return await loop.run_in_executor(
                    None,
                    self._analyzer.analyze,
                    compressed_path,
                    transcript,
                    user_instructions,
                )
        finally:
            if compressed_path != video_path:
                compressed_path.unlink(missing_ok=True)

    async def _analyze_parallel(
        self,
        video_path: Path,
        transcript: Transcript,
        loop: asyncio.AbstractEventLoop,
        user_instructions: str | None = None,
    ) -> EditDecisionList:
        """Analyze long video using parallel chunking."""
        self._logger.info(
            f"Video is long ({transcript.duration:.1f}s). Using smart chunking..."
        )

        # Get split points
        split_points = await loop.run_in_executor(
            None, self._chunk_analyzer.get_split_points, transcript
        )
        self._logger.info(f"Found {len(split_points)} split points: {split_points}")

        # Split video
        chunk_paths = await loop.run_in_executor(
            None, self._processor.split, video_path, split_points
        )

        # Prepare tasks
        boundaries = [0.0] + split_points + [transcript.duration]
        tasks = []

        for i, chunk_path in enumerate(chunk_paths):
            chunk_start = boundaries[i]
            chunk_end = boundaries[i + 1]
            chunk_transcript = transcript.slice(chunk_start, chunk_end)

            tasks.append(
                loop.run_in_executor(
                    None,
                    self._analyzer.analyze,
                    chunk_path,
                    chunk_transcript,
                    user_instructions,
                )
            )

        # Run in parallel
        self._logger.info(f"Processing {len(tasks)} chunks in parallel...")
        results = await asyncio.gather(*tasks)

        # Merge results
        self._logger.info("Merging results...")
        final_edl = self._merge_results(results, boundaries[:-1], transcript.duration)

        # Cleanup chunks
        for cp in chunk_paths:
            cp.unlink(missing_ok=True)
        if chunk_paths:
            chunk_paths[0].parent.rmdir()

        return final_edl

    def analyze(
        self,
        video_path: Path,
        transcript: Transcript,
        user_instructions: str | None = None,
    ) -> EditDecisionList:
        """Sync wrapper for analyze_async."""
        return asyncio.run(
            self.analyze_async(video_path, transcript, user_instructions)
        )

    def _merge_results(
        self,
        results: list[EditDecisionList],
        start_offsets: list[float],
        total_duration: float,
    ) -> EditDecisionList:
        """Merge multiple EDLs from chunks into one master EDL."""
        all_keep = []
        all_interactive = []

        for i, res in enumerate(results):
            offset = start_offsets[i]

            for seg in res.keep_segments:
                seg.start += offset
                seg.end += offset
                all_keep.append(seg)

            if res.interactive_segments:
                for seg in res.interactive_segments:
                    seg.start += offset
                    seg.end += offset
                    all_interactive.append(seg)

        return EditDecisionList(
            keep_segments=all_keep,
            interactive_segments=all_interactive or None,
            original_duration=total_duration,
        )
