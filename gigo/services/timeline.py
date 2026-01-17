"""
Timeline Service

Domain service for timeline operations and conversions.
"""

from gigo.core.models import EditDecisionList, InteractiveEDL, TimelineSegment


class TimelineService:
    """
    Handles timeline conversions.

    Converts between EditDecisionList and InteractiveEDL formats.
    """

    def get_interactive_timeline(self, edl: EditDecisionList) -> InteractiveEDL:
        """
        Convert keep-only EDL to gapless interactive timeline.

        If interactive_segments are present (from proper Gemini analysis),
        use those. Otherwise, fill gaps between keep_segments.

        Args:
            edl: EditDecisionList with keep segments

        Returns:
            InteractiveEDL covering the entire video duration
        """
        # Best case: We have the full interactive timeline from analysis
        if edl.interactive_segments:
            return InteractiveEDL(
                segments=edl.interactive_segments,
                original_duration=edl.original_duration,
            )

        # Fallback: Reconstruct timeline by filling gaps
        segments: list[TimelineSegment] = []
        current_time = 0.0

        sorted_keeps = sorted(edl.keep_segments, key=lambda s: s.start)

        for keep in sorted_keeps:
            # Add remove segment for gap before this keep
            if keep.start > current_time + 0.001:
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

        # Add final remove segment if there's remaining time
        if current_time < edl.original_duration - 0.001:
            segments.append(
                TimelineSegment(
                    start=current_time,
                    end=edl.original_duration,
                    action="remove",
                    reason="End of video",
                    original_action="remove",
                )
            )

        return InteractiveEDL(
            segments=segments,
            original_duration=edl.original_duration,
        )
