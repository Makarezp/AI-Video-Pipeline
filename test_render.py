#!/usr/bin/env python3
"""
Test script for the rendering engine.

Usage:
    python test_render.py /path/to/video.mp4 /path/to/edl.json
"""

import sys
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from gigo.core.rendering import FFmpegRenderingService
from gigo.core.models import EditDecisionList, KeepSegment


def main():
    if len(sys.argv) < 3:
        print("Usage: python test_render.py /path/to/video.mp4 /path/to/edl.json")
        sys.exit(1)

    video_path = Path(sys.argv[1])
    edl_path = Path(sys.argv[2])

    if not video_path.exists():
        print(f"Error: Video not found: {video_path}")
        sys.exit(1)

    if not edl_path.exists():
        print(f"Error: EDL not found: {edl_path}")
        sys.exit(1)

    # Load EDL from JSON
    print(f"\n🎬 Loading EDL from: {edl_path.name}")
    with open(edl_path) as f:
        edl_data = json.load(f)

    edl = EditDecisionList(
        keep_segments=[
            KeepSegment(start=s["start"], end=s["end"], reason=s.get("reason", ""))
            for s in edl_data["keep_segments"]
        ],
        original_duration=edl_data["original_duration"],
    )

    print(f"   Segments: {len(edl.keep_segments)}")
    print(f"   Expected duration: {edl.final_duration:.1f}s")

    # Render
    print(f"\n🎥 Rendering video...")
    renderer = FFmpegRenderingService(zoom_scale=1.15)
    output_path = renderer.render(video_path, edl)

    print(f"\n✅ Done! Output: {output_path}")


if __name__ == "__main__":
    main()
