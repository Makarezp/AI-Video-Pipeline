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
import asyncio
import concurrent.futures

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


HYBRID_PROMPT = """You are an expert video editor. Your goal is to create a seamless, natural-sounding talking head video.

I'm giving you:

    The VIDEO itself - watch for visual context.

    A TRANSCRIPT with exact timestamps.

Your job: Analyze the ENTIRE video and mark segments as KEEP or REMOVE.

CORE PHILOSOPHY: PREFER KEEPING OVER CUTTING.
Visual jump cuts are jarring. Only remove a segment if it clearly damages the quality of the video. If you are unsure, MARK AS KEEP.

CRITERIA FOR REMOVAL (keep=false):

    Audio Glitches: Loud throat clearing, heavy coughing, or mic bumps.

    True Stumbles: "Um", "uh", or stuttering only if it interrupts the flow of speech. (Ignore quiet "ums" that blend in).

    False Starts: When the speaker stops a sentence mid-way and restarts it entirely (e.g., "I went to the... I decided to go to the store").

    Dead Air: Silence lasting > 2.0 seconds where nothing is happening visually.

    Breaking Character: Clearly talking to the camera crew, asking for a line, or checking a phone.

CRITERIA FOR KEEPING (keep=true):

    Thinking Pauses: Moments where the speaker is silent but looking thoughtful. DO NOT CUT THESE.

    Natural Breaths: Taking a breath between sentences is natural. Keep it.

    Emphatic Repetition: If they repeat a word for effect (e.g., "It was a long, long day"), KEEP IT.

    Personality: Small chuckles, smiles, or slight hesitations that make the speaker feel human.

CRITICAL RULES:

    Return ALL segments covering the ENTIRE video duration (Start time 0 to End of video). NO GAPS.

    Use ONLY timestamps from the transcript below.

    Your start/end times MUST exactly match transcript timestamps.

OUTPUT FORMAT (JSON only):
{
"segments": [
{"start": <start_time>, "end": <end_time>, "keep": true, "reason": "Intro content, natural flow"},
{"start": <start_time>, "end": <end_time>, "keep": false, "reason": "False start: Speaker restarts sentence"},
...
]
}

=== TRANSCRIPT WITH TIMESTAMPS ===
"""


SPLIT_PROMPT = """Analyze this transcript and find cut points to split the video into chunks.
Target chunk length: 150 seconds (2.5 minutes).

Rules:
1. Splits MUST happen at the end of a sentence (period/question mark).
2. PREFER splits at topic transitions or paragraph breaks.
3. Chunks should be roughly 120-180 seconds long.
4. Return ONLY a JSON list of timestamps (seconds) for the cuts. e.g. [152.5, 305.2, 451.0]

TRANSCRIPT:
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
        # Whisper for transcription
        self.openai = OpenAI(api_key=openai_api_key or os.getenv("OPENAI_API_KEY"))

        # Gemini for video analysis
        gemini_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            raise ValueError("GEMINI_API_KEY not found")
        self.gemini = genai.Client(api_key=gemini_key)
        self.gemini_model = gemini_model

        # Use a cheaper/faster model for splitting
        self.splitter_model = "gemini-2.0-flash-exp"

    def _get_smart_split_points(
        self, transcript: Transcript, target_duration: int = 150
    ) -> list[float]:
        """
        Ask Gemini to find semantic split points in the transcript.
        """
        # Format transcript for splitting (condensed text is fine)
        # We need timestamps though, so let's format it with [time] markers every 10s
        text_with_timestamps = []
        last_ts = 0
        for seg in transcript.segments:
            if seg.start - last_ts > 10:
                text_with_timestamps.append(f"[{seg.start:.1f}s]")
                last_ts = seg.start
            text_with_timestamps.append(seg.word)

        full_text = " ".join(text_with_timestamps)

        prompt = SPLIT_PROMPT + full_text

        try:
            response = self.gemini.models.generate_content(
                model=self.splitter_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )

            # Robust parsing (reuse logic)
            content = response.text.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()

            timestamps = json.loads(content)
            if isinstance(timestamps, list):
                # Validate timestamps
                valid_ts = [t for t in timestamps if 0 < t < transcript.duration]
                valid_ts.sort()
                return valid_ts
            return []

        except Exception as e:
            logger.warning(
                f"Smart splitting failed: {e}. Falling back to fixed chunks."
            )
            return []

    def _split_video_at_timestamps(
        self, video_path: Path, timestamps: list[float]
    ) -> list[Path]:
        """
        Split video physically using FFmpeg at the given timestamps.
        Returns list of paths to chunks.
        """
        chunks = []
        start = 0.0

        # Create temp dir for chunks if not exists
        temp_dir = video_path.parent / "chunks"
        temp_dir.mkdir(exist_ok=True)

        # Add end of video to timestamps
        all_points = timestamps + [None]

        for i, end in enumerate(all_points):
            chunk_name = f"{video_path.stem}_chunk_{i:03d}.mp4"
            output_path = temp_dir / chunk_name

            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                str(video_path),
                "-ss",
                str(start),
            ]

            if end is not None:
                duration = end - start
                cmd.extend(["-t", str(duration)])

            cmd.extend(
                [
                    "-c:v",
                    "libx264",
                    "-c:a",
                    "aac",  # Re-encode to ensure clean cuts
                    "-preset",
                    "ultrafast",  # Speed over compression for temp chunks
                    str(output_path),
                ]
            )

            # Run ffmpeg
            try:
                subprocess.run(
                    cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
                )
                chunks.append(output_path)
                if end is not None:
                    start = end
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to split chunk {i}: {e}")
                # Analyze remaining video as one chunk if split fails?
                # For now just continue

        return chunks

    async def analyze_video_async(self, video_path: Path) -> EditDecisionList:
        """
        Async version of analyze_video supporting parallel processing.
        """
        video_path = Path(video_path)

        # Step 1: Extract audio and get Whisper transcript
        print("  [1/3] Transcribing with Whisper...")
        # Run Whisper in thread pool since it's blocking/heavy
        loop = asyncio.get_running_loop()
        transcript = await loop.run_in_executor(
            None, self._transcribe_with_whisper, video_path
        )

        print(
            f"        Found {len(transcript.segments)} words in {transcript.duration:.1f}s"
        )

        # Step 2: Compress video for Gemini
        print("  [2/3] Preparing video for Gemini...")
        compressed_path = await loop.run_in_executor(
            None, self._compress_video, video_path
        )

        try:
            # Step 3: Analyze with Gemini (Parallel if needed)
            print("  [3/3] Analyzing with Gemini...")

            # Smart Chunking for long videos (> 3 min)
            if transcript.duration > 180:
                print(
                    f"        Video is long ({transcript.duration:.1f}s). Using Smart Chunking..."
                )

                # 3a. Get Smart Split Points
                split_points = await loop.run_in_executor(
                    None, self._get_smart_split_points, transcript
                )
                print(
                    f"        Found {len(split_points)} semantic split points: {split_points}"
                )

                # 3b. Split Video
                # Run ffmpeg splitting in thread pool
                chunk_paths = await loop.run_in_executor(
                    None, self._split_video_at_timestamps, compressed_path, split_points
                )

                # 3c. Prepare tasks for each chunk
                tasks = []
                start_time = 0.0
                # Prepare duration boundaries for slicing transcript
                boundaries = [0.0] + split_points + [transcript.duration]

                for i, chunk_path in enumerate(chunk_paths):
                    chunk_start = boundaries[i]
                    chunk_end = boundaries[i + 1]

                    # Slice transcript for this chunk
                    chunk_transcript = transcript.slice(chunk_start, chunk_end)

                    # Create async task
                    # We wrap the sync analyze call in a thread
                    tasks.append(
                        loop.run_in_executor(
                            None,
                            self._analyze_with_gemini,
                            chunk_path,
                            chunk_transcript,
                        )
                    )

                # 3d. Run all chunks in parallel
                print(f"        Processing {len(tasks)} chunks in parallel...")
                results = await asyncio.gather(*tasks)

                # 3e. Merge results
                print("        Merging results...")
                final_edl = self._merge_chunk_results(
                    results, boundaries[:-1], transcript.duration
                )

                # Cleanup chunks
                for cp in chunk_paths:
                    cp.unlink(missing_ok=True)
                if chunk_paths:
                    chunk_paths[0].parent.rmdir()  # Start cleaning temp dir

                return final_edl

            else:
                # Short video: Single pass
                edl = await loop.run_in_executor(
                    None, self._analyze_with_gemini, compressed_path, transcript
                )
                return edl

        finally:
            if compressed_path != video_path:
                compressed_path.unlink(missing_ok=True)

    def _merge_chunk_results(
        self,
        results: list[EditDecisionList],
        start_offsets: list[float],
        total_duration: float,
    ) -> EditDecisionList:
        """
        Merge multiple EDLs from chunks into one master EDL.
        Adjusts timestamps by adding start_offsets.
        """
        all_keep = []
        all_interactive = []

        for i, res in enumerate(results):
            offset = start_offsets[i]

            # Offset keep segments
            for seg in res.keep_segments:
                seg.start += offset
                seg.end += offset
                all_keep.append(seg)

            # Offset interactive segments
            if res.interactive_segments:
                for seg in res.interactive_segments:
                    seg.start += offset
                    seg.end += offset
                    all_interactive.append(seg)

        # Merge adjacent keep segments if they touch (optional, but clean)
        # For now, just return valid list

        return EditDecisionList(
            keep_segments=all_keep,
            interactive_segments=all_interactive if all_interactive else None,
            original_duration=total_duration,
        )

    def analyze_video(self, video_path: Path) -> EditDecisionList:
        """Sync wrapper for backward compatibility."""
        return asyncio.run(self.analyze_video_async(video_path))

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
        """Compress video for Gemini upload. Skip if small enough."""

        # 1. Skip if file is already small (< 50MB)
        file_size_mb = video_path.stat().st_size / (1024 * 1024)
        if file_size_mb < 50:
            print(
                f"        Video is small ({file_size_mb:.1f}MB). Skipping compression."
            )
            return video_path

        tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
        tmp.close()
        compressed_path = Path(tmp.name)

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vf",
            "scale=640:-2",  # 640p is plenty for Gemini visual analysis
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",  # Much faster than 'fast'
            "-crf",
            "30",  # Higher compression
            "-c:a",
            "aac",
            "-b:a",
            "64k",
            str(compressed_path),
        ]

        try:
            subprocess.run(cmd, capture_output=True, check=True)
            original = video_path.stat().st_size / 1024 / 1024
            compressed = compressed_path.stat().st_size / 1024 / 1024
            print(f"        Compressed: {original:.0f}MB → {compressed:.1f}MB")
            return compressed_path
        except subprocess.CalledProcessError as e:
            logger.error(f"Compression failed: {e}. Using original.")
            return video_path

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
