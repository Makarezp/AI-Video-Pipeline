"""
FFmpeg Video Processor Adapter

Implements VideoProcessor protocol using FFmpeg CLI.
Consolidates all FFmpeg operations from hybrid.py and rendering.py.
"""

import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from gigo.core.models import KeepSegment
from gigo.core.protocols import Logger


class FFmpegVideoProcessor:
    """
    Video processing adapter using FFmpeg CLI.

    Implements the VideoProcessor protocol for:
    - Audio extraction
    - Video compression
    - Video splitting
    - Segment rendering
    """

    def __init__(
        self,
        logger: Logger,
        compression_preset: str = "ultrafast",
        compression_crf: int = 30,
        audio_bitrate: str = "128k",
        audio_sample_rate: int = 16000,
    ):
        """
        Initialize FFmpeg processor with encoding settings.

        Args:
            compression_preset: libx264 preset for compression speed
            compression_crf: Constant Rate Factor (higher = more compression)
            audio_bitrate: Audio bitrate for extraction
            audio_sample_rate: Audio sample rate in Hz
        """
        self.compression_preset = compression_preset
        self.compression_crf = compression_crf
        self.audio_bitrate = audio_bitrate
        self.audio_sample_rate = audio_sample_rate
        self._logger = logger

    def extract_audio(self, video_path: Path, output_format: str = "mp3") -> Path:
        """
        Extract audio track from video file.

        Args:
            video_path: Path to source video
            output_format: Output audio format (default: mp3)

        Returns:
            Path to extracted audio file (temporary file, caller should cleanup).
        """
        tmp = tempfile.NamedTemporaryFile(suffix=f".{output_format}", delete=False)
        tmp.close()
        audio_path = Path(tmp.name)

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-acodec",
            "libmp3lame" if output_format == "mp3" else "aac",
            "-ab",
            self.audio_bitrate,
            "-ar",
            str(self.audio_sample_rate),
            str(audio_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(
                f"FFmpeg audio extraction failed: {result.stderr[-500:]}"
            )

        return audio_path

    def compress(
        self,
        video_path: Path,
        target_width: int = 640,
        skip_threshold_mb: int = 50,
    ) -> Path:
        """
        Compress video for analysis upload.

        Args:
            video_path: Path to source video
            target_width: Target width in pixels (height auto-calculated)
            skip_threshold_mb: Skip compression if file smaller than this

        Returns:
            Path to compressed video, or original path if skipped.
        """
        video_path = Path(video_path)
        file_size_mb = video_path.stat().st_size / (1024 * 1024)

        if file_size_mb < skip_threshold_mb:
            self._logger.info(
                f"Video is small ({file_size_mb:.1f}MB). Skipping compression."
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
            f"scale={target_width}:-2",
            "-c:v",
            "libx264",
            "-preset",
            self.compression_preset,
            "-crf",
            str(self.compression_crf),
            "-c:a",
            "aac",
            "-b:a",
            "64k",
            str(compressed_path),
        ]

        try:
            subprocess.run(cmd, capture_output=True, check=True)
            original_mb = video_path.stat().st_size / 1024 / 1024
            compressed_mb = compressed_path.stat().st_size / 1024 / 1024
            self._logger.info(
                f"Compressed: {original_mb:.0f}MB → {compressed_mb:.1f}MB"
            )
            return compressed_path
        except subprocess.CalledProcessError as e:
            self._logger.error(f"Compression failed: {e}. Using original.")
            compressed_path.unlink(missing_ok=True)
            return video_path

    def extract_thumbnails(
        self,
        video_path: Path,
        output_dir: Path,
        fps: float = 1.0,
        width: int = 160,
    ) -> int:
        """
        Extract thumbnail images from video at regular intervals.

        Args:
            video_path: Path to source video
            output_dir: Directory to save thumbnails
            fps: Frames per second to extract (default: 1 = one per second)
            width: Width of thumbnails in pixels (height auto-calculated)

        Returns:
            Number of thumbnails generated.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        output_pattern = str(output_dir / "thumb_%04d.jpg")

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vf",
            f"fps={fps},scale={width}:-1",
            "-q:v",
            "2",  # High quality JPEG
            output_pattern,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            self._logger.error(f"Thumbnail extraction failed: {result.stderr[-500:]}")
            return 0

        # Count generated files
        count = len(list(output_dir.glob("thumb_*.jpg")))
        # Count generated files
        count = len(list(output_dir.glob("thumb_*.jpg")))
        self._logger.info(f"Generated {count} thumbnails in {output_dir}")
        return count

    def split(self, video_path: Path, timestamps: list[float]) -> list[Path]:
        """
        Split video at given timestamps using FFmpeg.

        Args:
            video_path: Path to source video
            timestamps: List of split points in seconds

        Returns:
            List of paths to chunk files.
        """
        chunks = []
        start = 0.0

        # Create temp dir for chunks - clean existing first
        temp_dir = video_path.parent / "chunks"
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        temp_dir.mkdir(exist_ok=True)

        # Add None for the last segment (goes to end)
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
                    "aac",
                    "-preset",
                    "ultrafast",
                    str(output_path),
                ]
            )

            try:
                subprocess.run(
                    cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
                )
                chunks.append(output_path)
                if end is not None:
                    start = end
            except subprocess.CalledProcessError as e:
                self._logger.error(f"Failed to split chunk {i}: {e}")

        return chunks

    def get_dimensions(self, video_path: Path) -> tuple[int, int]:
        """
        Get video dimensions using ffprobe.

        Args:
            video_path: Path to video file

        Returns:
            Tuple of (width, height).
        """
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

    def get_duration(self, video_path: Path) -> float:
        """
        Get video duration in seconds using ffprobe.

        Args:
            video_path: Path to video file

        Returns:
            Duration in seconds.
        """
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
            self._logger.error(f"ffprobe duration failed: {result.stderr}")
            return 0.0

        data = json.loads(result.stdout)
        return float(data.get("format", {}).get("duration", 0.0))

    def render_segments(
        self,
        video_path: Path,
        segments: list[KeepSegment],
        output_path: Optional[Path] = None,
        zoom_scale: float = 1.15,
        use_hardware_encoder: bool = True,
    ) -> Path:
        """
        Render final video from segment list.

        Args:
            video_path: Path to source video
            segments: List of KeepSegment to include
            output_path: Path for output video (default: input_edited.mp4)
            zoom_scale: Zoom factor for alternating segments (1.0 = no zoom)
            use_hardware_encoder: Use h264_videotoolbox on macOS

        Returns:
            Path to rendered video.
        """
        video_path = Path(video_path)

        if output_path is None:
            output_path = video_path.parent / f"{video_path.stem}_edited.mp4"
        output_path = Path(output_path)

        if not segments:
            raise ValueError("No segments to render")

        width, height = self.get_dimensions(video_path)
        filter_complex, segment_labels = self._build_filter_complex(
            segments, width, height, zoom_scale
        )

        # Write filter to temp file (avoids command line length limits)
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write(filter_complex)
            filter_file = Path(f.name)

        try:
            cmd = self._build_render_command(
                video_path,
                output_path,
                filter_file,
                segment_labels,
                use_hardware_encoder,
            )

            self._logger.info(f"Rendering {len(segments)} segments...")
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg render failed: {result.stderr[-1500:]}")

            if not output_path.exists():
                raise RuntimeError("FFmpeg completed but output file not found")

            output_size = output_path.stat().st_size / 1024 / 1024
            self._logger.info(
                f"Render complete: {output_path.name} ({output_size:.1f}MB)"
            )

            return output_path
        finally:
            filter_file.unlink(missing_ok=True)

    def _build_filter_complex(
        self,
        segments: list[KeepSegment],
        width: int,
        height: int,
        zoom_scale: float,
    ) -> tuple[str, list[str]]:
        """Build FFmpeg filter_complex string for all segments."""
        video_filters = []
        audio_filters = []
        video_labels = []
        audio_labels = []

        for i, segment in enumerate(segments):
            apply_zoom = i % 2 == 1  # Zoom on odd-indexed segments
            v_label = f"v{i}"
            a_label = f"a{i}"

            if apply_zoom and zoom_scale > 1.0:
                zoom_w = int(width * zoom_scale)
                zoom_h = int(height * zoom_scale)
                crop_x = (zoom_w - width) // 2
                crop_y = (zoom_h - height) // 2

                video_filters.append(
                    f"[0:v]trim=start={segment.start}:end={segment.end},"
                    f"setpts=PTS-STARTPTS,"
                    f"scale={zoom_w}:{zoom_h},"
                    f"crop={width}:{height}:{crop_x}:{crop_y}[{v_label}]"
                )
            else:
                video_filters.append(
                    f"[0:v]trim=start={segment.start}:end={segment.end},"
                    f"setpts=PTS-STARTPTS[{v_label}]"
                )

            audio_filters.append(
                f"[0:a]atrim=start={segment.start}:end={segment.end},"
                f"asetpts=PTS-STARTPTS[{a_label}]"
            )

            video_labels.append(f"[{v_label}]")
            audio_labels.append(f"[{a_label}]")

        # Concatenate all segments
        n = len(segments)
        concat_input = "".join(f"{v}{a}" for v, a in zip(video_labels, audio_labels))
        concat_filter = f"{concat_input}concat=n={n}:v=1:a=1[outv][outa]"

        all_filters = video_filters + audio_filters + [concat_filter]
        filter_complex = ";".join(all_filters)

        return filter_complex, ["[outv]", "[outa]"]

    def _build_render_command(
        self,
        video_path: Path,
        output_path: Path,
        filter_file: Path,
        output_labels: list[str],
        use_hardware_encoder: bool,
    ) -> list[str]:
        """Build FFmpeg command for rendering."""
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-filter_complex_script",
            str(filter_file),
            "-map",
            output_labels[0],
            "-map",
            output_labels[1],
        ]

        if use_hardware_encoder:
            cmd.extend(
                [
                    "-c:v",
                    "h264_videotoolbox",
                    "-q:v",
                    "60",
                ]
            )
        else:
            cmd.extend(
                [
                    "-c:v",
                    "libx264",
                    "-preset",
                    "fast",
                    "-crf",
                    "23",
                ]
            )

        cmd.extend(
            [
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                str(output_path),
            ]
        )

        return cmd
