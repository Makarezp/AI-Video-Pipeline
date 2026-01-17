"""
Rendering Service - FFmpeg-based Video Editor

Executes Edit Decision Lists by cutting video segments, applying zoom effects,
and adding audio crossfades to produce a polished final video.
"""

import subprocess
import tempfile
import json
from pathlib import Path
from typing import Optional

from .models import EditDecisionList, KeepSegment


class FFmpegRenderingService:
    """
    Rendering service using FFmpeg for video processing.

    To swap implementations, create a new class that matches the
    RenderingService protocol and inject it into the pipeline.
    """

    def __init__(self, zoom_scale: float = 1.15, crossfade_duration: float = 0.03):
        """
        Args:
            zoom_scale: Scale factor for zoomed segments (default 1.15 = 115%)
            crossfade_duration: Audio crossfade duration in seconds (default 30ms)
        """
        self.zoom_scale = zoom_scale
        self.crossfade_duration = crossfade_duration

    def render(
        self,
        video_path: Path,
        edl: EditDecisionList,
        output_path: Optional[Path] = None,
    ) -> Path:
        """
        Render final video from EDL.

        Args:
            video_path: Path to source video
            edl: Edit Decision List with segments to keep
            output_path: Path for output video (default: video_path.stem + "_edited.mp4")

        Returns:
            Path to rendered video
        """
        video_path = Path(video_path)

        if output_path is None:
            output_path = video_path.parent / f"{video_path.stem}_edited.mp4"
        output_path = Path(output_path)

        if not edl.keep_segments:
            raise ValueError("EDL has no segments to render")

        print(f"[Render] Processing {len(edl.keep_segments)} segments...")

        # Get video dimensions for zoom calculations
        width, height = self._get_video_dimensions(video_path)
        print(f"[Render] Video dimensions: {width}x{height}")

        # Build FFmpeg filter complex
        filter_complex, segment_labels = self._build_filter_complex(
            edl.keep_segments, width, height
        )

        # Write filter to temp file (avoids command line length limits)
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write(filter_complex)
            filter_file = Path(f.name)

        try:
            # Build and run FFmpeg command
            cmd = self._build_ffmpeg_command(
                video_path, output_path, filter_file, segment_labels
            )

            print("[Render] Running FFmpeg...")
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg failed: {result.stderr[-1500:]}")

            # Verify output
            if not output_path.exists():
                raise RuntimeError("FFmpeg completed but output file not found")

            output_size = output_path.stat().st_size / 1024 / 1024
            print(f"[Render] Complete: {output_path.name} ({output_size:.1f}MB)")

            return output_path
        finally:
            filter_file.unlink(missing_ok=True)

    def _get_video_dimensions(self, video_path: Path) -> tuple:
        """Get video width and height using ffprobe."""
        cmd = [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "json",
            str(video_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"ffprobe failed: {result.stderr}")

        data = json.loads(result.stdout)
        stream = data["streams"][0]
        return stream["width"], stream["height"]

    def _build_filter_complex(self, segments: list, width: int, height: int) -> tuple:
        """Build FFmpeg filter_complex string for all segments."""
        video_filters = []
        audio_filters = []
        video_labels = []
        audio_labels = []

        for i, segment in enumerate(segments):
            # Apply zoom on odd-indexed segments (0-indexed, so 1, 3, 5...)
            apply_zoom = i % 2 == 1

            # Video filter for this segment
            v_label = f"v{i}"
            a_label = f"a{i}"

            if apply_zoom:
                # Scale up then crop back to original size (creates zoom effect)
                zoom_w = int(width * self.zoom_scale)
                zoom_h = int(height * self.zoom_scale)
                crop_x = (zoom_w - width) // 2
                crop_y = (zoom_h - height) // 2

                video_filters.append(
                    f"[0:v]trim=start={segment.start}:end={segment.end},"
                    f"setpts=PTS-STARTPTS,"
                    f"scale={zoom_w}:{zoom_h},"
                    f"crop={width}:{height}:{crop_x}:{crop_y}[{v_label}]"
                )
            else:
                # No zoom - just trim
                video_filters.append(
                    f"[0:v]trim=start={segment.start}:end={segment.end},"
                    f"setpts=PTS-STARTPTS[{v_label}]"
                )

            # Audio filter for this segment
            audio_filters.append(
                f"[0:a]atrim=start={segment.start}:end={segment.end},"
                f"asetpts=PTS-STARTPTS[{a_label}]"
            )

            video_labels.append(f"[{v_label}]")
            audio_labels.append(f"[{a_label}]")

        # Concatenate all segments - interleave video and audio per segment
        n = len(segments)
        # concat expects: [v0][a0][v1][a1]... (interleaved per segment)
        concat_input = "".join(f"{v}{a}" for v, a in zip(video_labels, audio_labels))
        concat_filter = f"{concat_input}concat=n={n}:v=1:a=1[outv][outa]"

        all_filters = video_filters + audio_filters + [concat_filter]
        filter_complex = ";".join(all_filters)

        return filter_complex, ["[outv]", "[outa]"]

    def _build_ffmpeg_command(
        self,
        video_path: Path,
        output_path: Path,
        filter_file: Path,
        output_labels: list,
    ) -> list:
        """Build complete FFmpeg command."""
        return [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-filter_complex_script",
            str(filter_file),
            "-map",
            output_labels[0],  # Mapping [outv] restored
            "-map",
            output_labels[1],  # Mapping [outa]
            "-c:v",
            "h264_videotoolbox",  # Apple Silicon Hardware Encoder
            "-q:v",
            "60",  # Quality scale 1-100 (60 is roughly equivalent to CRF 23)
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            str(output_path),
        ]
