#!/usr/bin/env python3
"""
Test script for the hybrid Whisper + Gemini video analysis.

Usage:
    python test_hybrid.py /path/to/video.mp4
"""

import sys
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, str(Path(__file__).parent))

from gigo.core.hybrid import HybridVideoService


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_hybrid.py /path/to/video.mp4")
        sys.exit(1)

    video_path = Path(sys.argv[1])

    if not video_path.exists():
        print(f"Error: File not found: {video_path}")
        sys.exit(1)

    print(f"\n🎬 Hybrid Analysis: {video_path.name}")
    print("=" * 50)

    try:
        service = HybridVideoService()
        edl = service.analyze_video(video_path)

        print(f"\n✅ Analysis complete!")
        print(f"   Original: {edl.original_duration:.1f}s")
        print(f"   Final: {edl.final_duration:.1f}s")
        print(f"   Kept: {edl.compression_ratio:.1%}")
        print(f"   Segments: {len(edl.keep_segments)}")

        # Save EDL
        edl_path = video_path.with_suffix(".hybrid.edl.json")
        edl_data = {
            "original_duration": edl.original_duration,
            "final_duration": edl.final_duration,
            "compression_ratio": edl.compression_ratio,
            "keep_segments": [
                {"start": s.start, "end": s.end, "reason": s.reason}
                for s in edl.keep_segments
            ],
        }

        with open(edl_path, "w") as f:
            json.dump(edl_data, f, indent=2)

        print(f"\n📄 EDL saved to: {edl_path}")

        print("\n=== Segments to keep ===")
        for seg in edl.keep_segments[:15]:
            print(f"  [{seg.start:.1f}s - {seg.end:.1f}s] {seg.reason}")
        if len(edl.keep_segments) > 15:
            print(f"  ... and {len(edl.keep_segments) - 15} more")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise


if __name__ == "__main__":
    main()
