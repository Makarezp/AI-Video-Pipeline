"""
Gemini Video Analysis Adapter

Implements VideoAnalyzer and ChunkAnalyzer protocols using Google Gemini API.
"""

import json
import logging
import time
from datetime import datetime
from pathlib import Path

from google import genai
from google.genai import types

from gigo.core.models import (
    EditDecisionList,
    KeepSegment,
    TimelineSegment,
    Transcript,
)

logger = logging.getLogger("gigo.adapters.gemini")


class GeminiVideoAnalyzer:
    """
    Video analysis adapter using Google Gemini.

    Implements the VideoAnalyzer protocol for AI-powered
    video segment analysis (keep/remove decisions).
    """

    # Padding applied to segments to prevent clipped words
    START_PADDING = 0.05  # 50ms before
    END_PADDING = 0.15  # 150ms after

    def __init__(
        self,
        client: genai.Client,
        model: str = "gemini-3-flash-preview",
        prompt_template: str = "",
        log_dir: Path | None = None,
    ):
        """
        Initialize Gemini analyzer.

        Args:
            client: Configured Gemini client instance
            model: Model name to use for analysis
            prompt_template: The analysis prompt template
            log_dir: Directory for debug logs (optional)
        """
        self._client = client
        self._model = model
        self._prompt_template = prompt_template
        self._log_dir = log_dir

    def analyze(self, video_path: Path, transcript: Transcript) -> EditDecisionList:
        """
        Analyze video content and decide which segments to keep/remove.

        Args:
            video_path: Path to video file
            transcript: Transcript with word-level timestamps

        Returns:
            EditDecisionList with keep/remove decisions.
        """
        # Upload video to Gemini
        logger.info("Uploading video to Gemini...")
        video_file = self._client.files.upload(file=video_path)

        # Wait for processing
        while video_file.state and video_file.state.name == "PROCESSING":
            logger.debug("Waiting for Gemini processing...")
            time.sleep(5)
            if video_file.name:
                video_file = self._client.files.get(name=video_file.name)

        if video_file.state and video_file.state.name == "FAILED":
            raise RuntimeError("Gemini video processing failed")

        # Format transcript and build prompt
        transcript_text = self._format_transcript(transcript)
        prompt = self._build_prompt(transcript, transcript_text)

        # Call Gemini
        logger.info("Analyzing with Gemini...")
        response = self._client.models.generate_content(
            model=self._model,
            contents=[
                types.Part.from_uri(
                    file_uri=video_file.uri or "",
                    mime_type=video_file.mime_type or "video/mp4",
                ),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        # Parse response
        content = response.text
        if content is None:
            raise RuntimeError("Gemini returned empty response")
        content = content.strip()
        self._save_debug_log(video_path, transcript, content)

        result = self._parse_response(content)
        return self._build_edl(result, transcript.duration)

    def _format_transcript(self, transcript: Transcript) -> str:
        """Format transcript with word timestamps."""
        lines = []
        for seg in transcript.segments:
            lines.append(f"[{seg.start:.2f}-{seg.end:.2f}] {seg.word}")
        return "\n".join(lines)

    def _build_prompt(self, transcript: Transcript, transcript_text: str) -> str:
        """Build the full analysis prompt."""
        return (
            self._prompt_template
            + f"\n\nCRITICAL: The video duration is EXACTLY {transcript.duration:.2f} seconds. "
            f"DO NOT return any timestamp greater than {transcript.duration:.2f}. "
            "For this long video, focus on LARGER blocks to avoid reaching output token limits.\n\n"
            + transcript_text
        )

    def _save_debug_log(
        self, video_path: Path, transcript: Transcript, content: str
    ) -> None:
        """Save raw response to file for debugging."""
        if not self._log_dir:
            return

        self._log_dir.mkdir(exist_ok=True)
        debug_file = (
            self._log_dir / f"gemini_response_{datetime.now().strftime('%H%M%S')}.txt"
        )

        with open(debug_file, "w") as f:
            f.write(f"Video: {video_path}\n")
            f.write(f"Duration: {transcript.duration}s\n")
            f.write(f"Words: {len(transcript.segments)}\n")
            f.write("=" * 60 + "\n")
            f.write(content)

        logger.debug(f"Saved raw response to {debug_file.name}")

    def _parse_response(self, content: str) -> dict:
        """Parse JSON response from Gemini, handling edge cases."""
        # Strip markdown code blocks
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            # Handle "Extra data" error (Gemini appends text after JSON)
            if e.msg == "Extra data":
                logger.warning(f"JSON has extra data at pos {e.pos}. Recovering...")
                return json.loads(content[: e.pos])
            raise

    def _build_edl(self, result: dict | list, duration: float) -> EditDecisionList:
        """Build EditDecisionList from parsed Gemini response."""
        interactive_segments = []
        segments_to_process = []

        # Handle various response formats
        if isinstance(result, dict) and "segments" in result:
            all_segments = result["segments"]

            # Build interactive timeline from all segments
            sorted_all = sorted(all_segments, key=lambda s: s.get("start", 0))
            for seg in sorted_all:
                try:
                    s_start = float(seg.get("start", 0))
                    s_end = float(seg.get("end", 0))
                    s_keep = seg.get("keep", True)
                    s_reason = seg.get("reason", "")
                    s_action = "keep" if s_keep else "remove"

                    interactive_segments.append(
                        TimelineSegment(
                            start=s_start,
                            end=s_end,
                            action=s_action,
                            reason=s_reason,
                            original_action=s_action,
                        )
                    )
                except (ValueError, TypeError):
                    continue

            segments_to_process = [s for s in all_segments if s.get("keep", True)]

        elif isinstance(result, dict) and "keep_segments" in result:
            segments_to_process = result["keep_segments"]
        elif isinstance(result, list):
            segments_to_process = result
        else:
            logger.warning(f"Unexpected result format: {type(result)}")
            segments_to_process = []

        # Apply padding and build keep segments
        raw_segments = []
        for seg in segments_to_process:
            try:
                start = float(seg["start"])
                end = float(seg["end"])
                reason = seg.get("reason", "")

                padded_start = max(0, start - self.START_PADDING)
                padded_end = min(duration, end + self.END_PADDING)

                if padded_start < padded_end:
                    raw_segments.append(
                        {"start": padded_start, "end": padded_end, "reason": reason}
                    )
            except (ValueError, KeyError) as e:
                logger.warning(f"Failed to parse segment: {seg}, error: {e}")

        if not raw_segments:
            logger.warning("No valid keep segments found!")
            return EditDecisionList(
                keep_segments=[],
                interactive_segments=interactive_segments or None,
                original_duration=duration,
            )

        # Sort and merge overlapping segments
        raw_segments.sort(key=lambda x: x["start"])
        merged = self._merge_segments(raw_segments)

        return EditDecisionList(
            keep_segments=merged,
            interactive_segments=interactive_segments or None,
            original_duration=duration,
        )

    def _merge_segments(self, segments: list[dict]) -> list[KeepSegment]:
        """Merge overlapping or adjacent segments."""
        if not segments:
            return []

        merged = []
        current = segments[0]

        for next_seg in segments[1:]:
            if next_seg["start"] <= current["end"] + 0.01:
                # Merge overlapping segments
                current["end"] = max(current["end"], next_seg["end"])
                if next_seg["reason"] and next_seg["reason"] not in current["reason"]:
                    current["reason"] += f"; {next_seg['reason']}"
            else:
                merged.append(
                    KeepSegment(
                        start=current["start"],
                        end=current["end"],
                        reason=current["reason"],
                    )
                )
                current = next_seg

        merged.append(
            KeepSegment(
                start=current["start"],
                end=current["end"],
                reason=current["reason"],
            )
        )

        return merged


class GeminiChunkAnalyzer:
    """
    Chunk analysis adapter using Google Gemini.

    Implements the ChunkAnalyzer protocol for finding semantic
    split points in transcripts.
    """

    def __init__(
        self,
        client: genai.Client,
        model: str = "gemini-2.0-flash-exp",
        prompt_template: str = "",
    ):
        """
        Initialize chunk analyzer.

        Args:
            client: Configured Gemini client instance
            model: Model name to use (should be fast/cheap)
            prompt_template: The chunking prompt template
        """
        self._client = client
        self._model = model
        self._prompt_template = prompt_template

    def get_split_points(
        self, transcript: Transcript, target_duration: int = 150
    ) -> list[float]:
        """
        Find optimal split points in transcript.

        Args:
            transcript: Full transcript to analyze
            target_duration: Target chunk duration in seconds

        Returns:
            List of timestamps where video should be split.
        """
        # Format transcript with periodic timestamp markers
        text_with_timestamps = []
        last_ts = 0
        for seg in transcript.segments:
            if seg.start - last_ts > 10:
                text_with_timestamps.append(f"[{seg.start:.1f}s]")
                last_ts = seg.start
            text_with_timestamps.append(seg.word)

        full_text = " ".join(text_with_timestamps)
        prompt = self._prompt_template + full_text

        try:
            response = self._client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )

            content = response.text
            if content is None:
                return []
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()

            timestamps = json.loads(content)

            if isinstance(timestamps, list):
                valid_ts = [t for t in timestamps if 0 < t < transcript.duration]
                valid_ts.sort()
                logger.info(f"Found {len(valid_ts)} split points")
                return valid_ts

            return []

        except Exception as e:
            logger.warning(
                f"Smart splitting failed: {e}. Falling back to fixed chunks."
            )
            return []
