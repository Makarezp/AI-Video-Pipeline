"""
Gemini Video Service - Multimodal Video Cleanup

Uses Gemini to analyze the actual video directly,
understanding both audio (hesitations, tone) and visual cues.
"""

import os
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from google import genai
from google.genai import types

from .models import EditDecisionList, KeepSegment


GEMINI_VIDEO_PROMPT = """Watch this video and identify timestamps to KEEP for a clean final edit.

REMOVE (by NOT including in keep_segments):
- Filler sounds: "um", "uh", "eee", "hmm", stutters, hesitations
- False starts: When they start a sentence, stop, and restart
- Repeated phrases: Same thing said twice - keep only the better version
- Long pauses: Awkward silence, thinking gaps  
- Self-corrections: "Tuesday... I mean Wednesday" - keep only the correction
- Verbal thinking: "Let me think...", "How do I say this..."
- Throat clearing, coughs, sniffs
- Nervous filler laughter
- When the speaker looks confused or lost
- Moments where they're clearly making a mistake

KEEP EVERYTHING ELSE. Good content stays.

Use your judgment - if it looks or sounds like a mistake, don't include it.

OUTPUT FORMAT (JSON only, no markdown):
{
  "keep_segments": [
    {"start": 0.5, "end": 15.2, "reason": "Good introduction"},
    {"start": 18.0, "end": 45.5, "reason": "Main content"}
  ]
}

Return FEW, LARGE segments. Only create gaps where mistakes occur.
Start and end times in SECONDS with decimal precision."""


class GeminiVideoService:
    """
    Multimodal video analysis using Gemini - sends compressed video directly.

    Can see visual cues (confused expressions, looking away) AND hear
    audio issues (um, uh, hesitations).
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.0-flash"):
        api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")

        self.client = genai.Client(api_key=api_key)
        self.model = model

    def analyze_video(self, video_path: Path) -> EditDecisionList:
        """
        Analyze video and return EDL with segments to keep.
        """
        video_path = Path(video_path)

        # Compress video for upload
        compressed_path = self._compress_video(video_path)

        try:
            print("      Uploading video to Gemini...")

            # Upload the video file
            video_file = self.client.files.upload(file=compressed_path)

            # Wait for processing
            import time

            while video_file.state.name == "PROCESSING":
                print("      Waiting for video processing...")
                time.sleep(5)
                video_file = self.client.files.get(name=video_file.name)

            if video_file.state.name == "FAILED":
                raise RuntimeError("Gemini video processing failed")

            # Get duration for the EDL
            duration = self._get_duration(video_path)

            print("      Analyzing with Gemini (this may take a moment)...")

            # Add duration constraint to prompt
            prompt_with_duration = (
                GEMINI_VIDEO_PROMPT
                + f"""

CRITICAL: This video is {duration:.1f} seconds long. 
All timestamps MUST be between 0 and {duration:.1f}.
Do NOT use any timestamp greater than {duration:.1f}."""
            )

            # Generate with safety off
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Part.from_uri(
                        file_uri=video_file.uri, mime_type=video_file.mime_type
                    ),
                    prompt_with_duration,
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

            # Parse the response
            result = json.loads(response.text)

            keep_segments = [
                KeepSegment(
                    start=seg["start"], end=seg["end"], reason=seg.get("reason", "")
                )
                for seg in result.get("keep_segments", [])
            ]

            return EditDecisionList(
                keep_segments=keep_segments, original_duration=duration
            )

        finally:
            # Clean up compressed file
            if compressed_path != video_path:
                compressed_path.unlink(missing_ok=True)

    def _compress_video(self, video_path: Path) -> Path:
        """Compress video for faster upload while preserving quality."""
        print("      Compressing video for upload...")

        # Create temp file
        tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
        tmp.close()
        compressed_path = Path(tmp.name)

        # Compress: lower resolution, reasonable bitrate
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vf",
            "scale=1280:-2",  # 720p-ish, maintain aspect
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "28",  # Good compression
            "-c:a",
            "aac",
            "-b:a",
            "96k",
            str(compressed_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg compression failed: {result.stderr}")

        original_size = video_path.stat().st_size / 1024 / 1024
        compressed_size = compressed_path.stat().st_size / 1024 / 1024
        print(f"      Compressed: {original_size:.0f}MB → {compressed_size:.1f}MB")

        return compressed_path

    def _get_duration(self, video_path: Path) -> float:
        """Get video duration using ffprobe."""
        cmd = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(video_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            return 0.0

        data = json.loads(result.stdout)
        return float(data.get("format", {}).get("duration", 0))
