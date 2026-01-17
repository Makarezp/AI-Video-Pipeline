"""
Hybrid Video Analysis Service

Combines Whisper (accurate timestamps) with Gemini (video understanding).
Whisper provides the timestamp anchors, Gemini watches the video and transcript
to make editing decisions based on both audio and visual cues.
"""

import os
import json
import logging
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

from google import genai
from google.genai import types
from openai import OpenAI

from .models import (
    EditDecisionList,
    InteractiveEDL,
    KeepSegment,
    TimelineSegment,
    Transcript,
    WordSegment,
)

# Setup file logging
LOG_DIR = Path(__file__).parent.parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

logger = logging.getLogger("gigo.hybrid")
logger.setLevel(logging.DEBUG)

# File handler with detailed formatting
log_file = LOG_DIR / f"hybrid_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
file_handler = logging.FileHandler(log_file)
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(
    logging.Formatter("%(asctime)s | %(levelname)s | %(message)s", datefmt="%H:%M:%S")
)
logger.addHandler(file_handler)

# Also log to console
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
logger.addHandler(console_handler)


HYBRID_PROMPT = """You are a video editor cleaning up a talking head video.

I'm giving you:
1. The VIDEO itself - watch it to see facial expressions, hesitations, visual cues
2. A TRANSCRIPT with exact word timestamps from Whisper

Your job: Analyze the ENTIRE video and mark EVERY segment as either KEEP or REMOVE.

MARK AS keep=false (REMOVE):
- Filler sounds: "um", "uh", "eee", "hmm", stutters
- False starts: When they start, stop, restart a sentence  
- Repeated phrases: Same thing said twice (keep the better version)
- Long pauses: Awkward silence, thinking gaps
- Self-corrections: keep only the correction
- When the speaker looks confused, lost, or frustrated
- Moments where they clearly made a mistake
- Throat clearing, coughs, nervous laughter

MARK AS keep=true (KEEP): Everything else. Good content stays. This is a CLEANUP task, not compression.

CRITICAL RULES:
- Return ALL segments covering the ENTIRE video duration (no gaps!)
- Use ONLY timestamps from the transcript below
- Your start/end times MUST exactly match transcript timestamps
- Every segment needs a "reason" field
- For keep=false segments, reason MUST explain WHY it should be removed

OUTPUT FORMAT (JSON only):
{
  "segments": [
    {"start": <start_time>, "end": <end_time>, "keep": true, "reason": "good content"},
    {"start": <start_time>, "end": <end_time>, "keep": false, "reason": "filler word 'um'"},
    ...
  ]
}

=== TRANSCRIPT WITH TIMESTAMPS ===
"""


class HybridVideoService:
    """
    Hybrid service: Whisper for timestamps + Gemini for video analysis.

    This gives us:
    - Accurate word-level timestamps from Whisper
    - Visual understanding (expressions, body language) from Gemini
    - Audio context (tone, hesitations) from Gemini
    """

    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        gemini_api_key: Optional[str] = None,
        gemini_model: str = "gemini-3-flash-preview",
    ):
        # OpenAI for Whisper
        openai_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise ValueError("OPENAI_API_KEY not found")
        self.openai = OpenAI(api_key=openai_key)

        # Gemini for video analysis
        gemini_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            raise ValueError("GEMINI_API_KEY not found")
        self.gemini = genai.Client(api_key=gemini_key)
        self.gemini_model = gemini_model

    def analyze_video(self, video_path: Path) -> EditDecisionList:
        """
        Analyze video using both Whisper and Gemini.
        """
        video_path = Path(video_path)

        # Step 1: Extract audio and get Whisper transcript
        print("  [1/3] Transcribing with Whisper...")
        transcript = self._transcribe_with_whisper(video_path)
        print(
            f"        Found {len(transcript.segments)} words in {transcript.duration:.1f}s"
        )

        # Step 2: Compress video for Gemini
        print("  [2/3] Preparing video for Gemini...")
        compressed_path = self._compress_video(video_path)

        try:
            # Step 3: Send video + transcript to Gemini
            print("  [3/3] Analyzing with Gemini...")
            edl = self._analyze_with_gemini(compressed_path, transcript)
            return edl
        finally:
            if compressed_path != video_path:
                compressed_path.unlink(missing_ok=True)

    def _transcribe_with_whisper(self, video_path: Path) -> Transcript:
        """Get word-level timestamps from Whisper."""
        # Extract audio first
        audio_path = self._extract_audio(video_path)

        try:
            with open(audio_path, "rb") as f:
                response = self.openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=f,
                    response_format="verbose_json",
                    timestamp_granularities=["word"],
                )

            segments = []
            for word in response.words:
                segments.append(
                    WordSegment(word=word.word, start=word.start, end=word.end)
                )

            duration = segments[-1].end if segments else 0
            full_text = " ".join(seg.word for seg in segments)
            return Transcript(segments=segments, full_text=full_text, duration=duration)
        finally:
            audio_path.unlink(missing_ok=True)

    def _extract_audio(self, video_path: Path) -> Path:
        """Extract audio from video."""
        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tmp.close()
        audio_path = Path(tmp.name)

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-acodec",
            "libmp3lame",
            "-ab",
            "128k",
            "-ar",
            "16000",
            str(audio_path),
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        return audio_path

    def _compress_video(self, video_path: Path) -> Path:
        """Compress video for Gemini upload."""
        tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
        tmp.close()
        compressed_path = Path(tmp.name)

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vf",
            "scale=1280:-2",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "28",
            "-c:a",
            "aac",
            "-b:a",
            "96k",
            str(compressed_path),
        ]
        subprocess.run(cmd, capture_output=True, check=True)

        original = video_path.stat().st_size / 1024 / 1024
        compressed = compressed_path.stat().st_size / 1024 / 1024
        print(f"        Compressed: {original:.0f}MB → {compressed:.1f}MB")

        return compressed_path

    def _analyze_with_gemini(
        self, video_path: Path, transcript: Transcript
    ) -> EditDecisionList:
        """Send video + transcript to Gemini for analysis."""

        # Upload video
        print("        Uploading video...")
        video_file = self.gemini.files.upload(file=video_path)

        # Wait for processing
        import time

        while video_file.state.name == "PROCESSING":
            print("        Processing...")
            time.sleep(5)
            video_file = self.gemini.files.get(name=video_file.name)

        if video_file.state.name == "FAILED":
            raise RuntimeError("Gemini video processing failed")

        # Format transcript with timestamps
        transcript_text = self._format_transcript(transcript)

        # Inject duration into prompt
        prompt = (
            HYBRID_PROMPT
            + f"\n\nCRITICAL: The video duration is EXACTLY {transcript.duration:.2f} seconds. "
            f"DO NOT return any timestamp greater than {transcript.duration:.2f}. "
            "For this long video, focus on LARGER blocks to avoid reaching output token limits.\n\n"
            + transcript_text
        )

        print("        Analyzing...")
        response = self.gemini.models.generate_content(
            model=self.gemini_model,
            contents=[
                types.Part.from_uri(
                    file_uri=video_file.uri, mime_type=video_file.mime_type
                ),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                safety_settings=[
                    types.SafetySetting(
                        category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_HARASSMENT", threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"
                    ),
                ],
            ),
        )

        # Parse response
        content = response.text.strip()

        # Log raw response
        logger.debug("=" * 60)
        logger.debug("RAW GEMINI RESPONSE:")
        logger.debug(content[:2000] + ("..." if len(content) > 2000 else ""))
        logger.debug("=" * 60)

        # Save raw response to file for debugging
        debug_file = (
            LOG_DIR / f"gemini_response_{datetime.now().strftime('%H%M%S')}.txt"
        )
        with open(debug_file, "w") as f:
            f.write(f"Video: {video_path}\n")
            f.write(f"Duration: {transcript.duration}s\n")
            f.write(f"Words: {len(transcript.segments)}\n")
            f.write("=" * 60 + "\n")
            f.write(content)
        logger.info(f"        Saved raw response to {debug_file.name}")

        # Handle case where Gemini might wrap JSON in markdown blocks
        if content.startswith("```json"):
            content = content[7:-3].strip()
            logger.debug("Stripped ```json wrapper")
        elif content.startswith("```"):
            content = content[3:-3].strip()
            logger.debug("Stripped ``` wrapper")

        try:
            result = json.loads(content)
            logger.debug(f"Parsed JSON successfully. Type: {type(result)}")
            logger.debug(
                f"Keys: {result.keys() if isinstance(result, dict) else 'N/A (list)'}"
            )
        except json.JSONDecodeError as e:
            # Handle "Extra data" error which happens when Gemini appends text after JSON
            if e.msg == "Extra data":
                logger.warning(
                    f"JSON Parsing Error: Extra data at pos {e.pos}. Attempting to recover..."
                )
                try:
                    # Slice content up to the error position
                    result = json.loads(content[: e.pos])
                    logger.info("Successfully recovered JSON from extra data")
                except Exception as nested_e:
                    logger.error(f"Failed to recover JSON: {nested_e}")
                    raise e
            else:
                logger.error(f"JSON Parsing Error: {e}")
                print(f"        ❌ JSON Parsing Error: {e}")
                # Save for debugging
                with open("failed_response.txt", "w") as f:
                    f.write(content)
                raise

        # --- Padding & Merging Logic ---
        START_PADDING = 0.05  # 50ms before
        END_PADDING = 0.15  # 150ms after

        # Prepare interactive_segments if available
        interactive_segments_list = []

        # Handle new format {"segments": [...]} or old format {"keep_segments": [...]}
        if isinstance(result, dict) and "segments" in result:
            all_segments = result["segments"]
            logger.debug(f"Found 'segments' key with {len(all_segments)} items")

            # Sort full list by start time for interactive timeline
            sorted_all = sorted(all_segments, key=lambda s: s.get("start", 0))
            for seg in sorted_all:
                try:
                    s_start = float(seg.get("start", 0))
                    s_end = float(seg.get("end", 0))
                    s_keep = seg.get("keep", True)
                    s_reason = seg.get("reason", "")
                    s_action = "keep" if s_keep else "remove"

                    interactive_segments_list.append(
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

            # Filter for keep=true segments for editing
            segments_to_process = [s for s in all_segments if s.get("keep", True)]
            remove_segments = [s for s in all_segments if not s.get("keep", True)]
            logger.info(
                f"        Total segments: {len(all_segments)} (keep: {len(segments_to_process)}, remove: {len(remove_segments)})"
            )
        elif isinstance(result, dict) and "keep_segments" in result:
            segments_to_process = result["keep_segments"]
            logger.debug(
                f"Found 'keep_segments' key with {len(segments_to_process)} items"
            )
        elif isinstance(result, list):
            segments_to_process = result
            logger.debug(f"Result is a list with {len(segments_to_process)} items")
        else:
            segments_to_process = []
            logger.warning(f"Unexpected result format: {type(result)}")
            logger.debug(f"Result content: {str(result)[:500]}")

        logger.info(f"        Keep segments from Gemini: {len(segments_to_process)}")

        raw_segments = []
        for seg in segments_to_process:
            try:
                start = float(seg["start"])
                end = float(seg["end"])
                reason = seg.get("reason", "")

                # Apply padding
                padded_start = max(0, start - START_PADDING)
                padded_end = min(transcript.duration, end + END_PADDING)

                if padded_start < padded_end:
                    raw_segments.append(
                        {"start": padded_start, "end": padded_end, "reason": reason}
                    )
            except (ValueError, KeyError) as e:
                logger.warning(f"Failed to parse segment: {seg}, error: {e}")
                continue

        if not raw_segments:
            logger.warning("No valid keep segments found!")
            return EditDecisionList(
                keep_segments=[],
                interactive_segments=interactive_segments_list
                if interactive_segments_list
                else None,
                original_duration=transcript.duration,
            )

        # Sort by start time
        raw_segments.sort(key=lambda x: x["start"])

        # Merge overlaps
        merged_segments = []
        current = raw_segments[0]

        for next_seg in raw_segments[1:]:
            # If they overlap or are very close, merge them
            # We use a small gap tolerance (e.g. 0.01) to merge perfectly adjacent clips
            if next_seg["start"] <= current["end"] + 0.01:
                # Merge: take the later end time
                current["end"] = max(current["end"], next_seg["end"])
                if next_seg["reason"] and next_seg["reason"] not in current["reason"]:
                    current["reason"] += f"; {next_seg['reason']}"
            else:
                merged_segments.append(
                    KeepSegment(
                        start=current["start"],
                        end=current["end"],
                        reason=current["reason"],
                    )
                )
                current = next_seg

        # Add the last one
        merged_segments.append(
            KeepSegment(
                start=current["start"], end=current["end"], reason=current["reason"]
            )
        )

        return EditDecisionList(
            keep_segments=merged_segments,
            interactive_segments=interactive_segments_list
            if interactive_segments_list
            else None,
            original_duration=transcript.duration,
        )

    def _format_transcript(self, transcript: Transcript) -> str:
        """Format transcript showing word timestamps."""
        lines = []
        for seg in transcript.segments:
            lines.append(f"[{seg.start:.2f}-{seg.end:.2f}] {seg.word}")
        return "\n".join(lines)

    def get_interactive_timeline(self, edl: EditDecisionList) -> InteractiveEDL:
        """
        Convert keep-only EDL to gapless interactive timeline.

        If interactive_segments are present (from proper Gemini analysis), use those.
        Otherwise, fill gaps between keep_segments with generic 'remove' segments.
        """
        # Best case: We have the full interactive timeline from Gemini
        if edl.interactive_segments:
            return InteractiveEDL(
                segments=edl.interactive_segments,
                original_duration=edl.original_duration,
            )

        # Fallback: Reconstruct timeline by filling gaps
        segments: list[TimelineSegment] = []
        current_time = 0.0

        # Sort keep segments by start time
        sorted_keeps = sorted(edl.keep_segments, key=lambda s: s.start)

        for keep in sorted_keeps:
            # If there's a gap before this keep segment, add a "remove" segment
            if keep.start > current_time + 0.001:  # Small tolerance
                segments.append(
                    TimelineSegment(
                        start=current_time,
                        end=keep.start,
                        action="remove",
                        reason="AI suggested removal",
                        original_action="remove",
                    )
                )

            # Add the keep segment
            segments.append(
                TimelineSegment(
                    start=keep.start,
                    end=keep.end,
                    action="keep",
                    reason=keep.reason,
                    original_action="keep",
                )
            )
            current_time = keep.end

        # If there's remaining time after the last keep segment
        if current_time < edl.original_duration - 0.001:
            segments.append(
                TimelineSegment(
                    start=current_time,
                    end=edl.original_duration,
                    action="remove",
                    reason="AI suggested removal (end section)",
                    original_action="remove",
                )
            )

        return InteractiveEDL(
            segments=segments, original_duration=edl.original_duration
        )
