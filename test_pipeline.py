#!/usr/bin/env python3
"""
Test script for the GarbageInGoldOut pipeline.

Usage:
    python test_pipeline.py /path/to/your/video.mp4
"""

import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Load .env file for OPENAI_API_KEY
load_dotenv()

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from gigo import process_video


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_pipeline.py /path/to/video.mp4")
        print("\nMake sure you have OPENAI_API_KEY set in .env file")
        sys.exit(1)

    video_path = Path(sys.argv[1])

    if not video_path.exists():
        print(f"Error: File not found: {video_path}")
        sys.exit(1)

    print(f"\n🎬 Processing: {video_path.name}")
    print("=" * 50)

    try:
        result = process_video(video_path)

        print("\n" + result.summary())

        # Save EDL to JSON for inspection
        edl_path = video_path.with_suffix(".edl.json")
        edl_data = {
            "original_duration": result.edl.original_duration,
            "final_duration": result.edl.final_duration,
            "compression_ratio": result.edl.compression_ratio,
            "keep_segments": [
                {"start": s.start, "end": s.end, "reason": s.reason}
                for s in result.edl.keep_segments
            ],
        }

        with open(edl_path, "w") as f:
            json.dump(edl_data, f, indent=2)

        print(f"\n📄 EDL saved to: {edl_path}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise


if __name__ == "__main__":
    main()
