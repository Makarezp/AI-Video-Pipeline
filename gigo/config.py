"""
GIGO Configuration

Centralized configuration for all GIGO services.
"""

from dataclasses import dataclass, field
from pathlib import Path


# Prompts directory
PROMPTS_DIR = Path(__file__).parent / "prompts"


def _load_prompt(name: str) -> str:
    """Load a prompt from the prompts directory."""
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if prompt_file.exists():
        return prompt_file.read_text()
    raise FileNotFoundError(f"Prompt file not found: {prompt_file}")


@dataclass
class GeminiConfig:
    """Configuration for Gemini API."""

    analysis_model: str = "gemini-3-flash-preview"
    chunking_model: str = "gemini-2.0-flash-exp"

    @property
    def analysis_prompt(self) -> str:
        return _load_prompt("analysis")

    @property
    def chunking_prompt(self) -> str:
        return _load_prompt("chunking")


@dataclass
class FFmpegConfig:
    """Configuration for FFmpeg processing."""

    compression_preset: str = "ultrafast"
    compression_crf: int = 30
    compression_target_width: int = 640
    compression_skip_threshold_mb: int = 50
    audio_bitrate: str = "128k"
    audio_sample_rate: int = 16000
    render_zoom_scale: float = 1.15
    use_hardware_encoder: bool = True


@dataclass
class AnalysisConfig:
    """Configuration for video analysis."""

    # Padding applied to segments
    start_padding: float = 0.05  # 50ms before
    end_padding: float = 0.15  # 150ms after

    # Chunking thresholds
    long_video_threshold: float = 180.0  # 3 minutes
    target_chunk_duration: int = 150  # 2.5 minutes


@dataclass
class GIGOConfig:
    """Root configuration for all GIGO services."""

    gemini: GeminiConfig = field(default_factory=GeminiConfig)
    ffmpeg: FFmpegConfig = field(default_factory=FFmpegConfig)
    analysis: AnalysisConfig = field(default_factory=AnalysisConfig)

    # Logging
    log_dir: Path = field(default_factory=lambda: Path(__file__).parent.parent / "logs")

    # Storage
    projects_dir: Path = field(
        default_factory=lambda: Path(__file__).parent / "storage" / "projects"
    )

    def __post_init__(self):
        self.log_dir.mkdir(exist_ok=True)
        self.projects_dir.mkdir(parents=True, exist_ok=True)


# Default configuration instance
default_config = GIGOConfig()
