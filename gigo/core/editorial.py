"""
Editorial Service - LLM-based Video Editor

Analyzes transcripts and produces Edit Decision Lists (EDL) by identifying
the "best takes" and removing false starts, repetitions, and filler content.
"""

from typing import Optional
from openai import OpenAI

from .models import Transcript, EditDecisionList, KeepSegment


EDITORIAL_SYSTEM_PROMPT = """You are an expert video editor. Your job is to analyze a transcript and identify which parts to KEEP in a tight, polished final video.

The user recorded themselves speaking but made mistakes: false starts, repeated sentences, filler words, thinking pauses. Your job is to find the BEST version of each thought.

RULES:
1. When the speaker says something multiple times, keep ONLY the best/final version
2. Remove false starts like "The best way... no wait... The number one way..." - keep only "The number one way..."
3. Remove long pauses and "um", "uh", "like" filler words
4. Keep the content coherent - don't cut mid-sentence
5. Aim for a compression ratio of 40-60% (remove roughly half the content)

OUTPUT FORMAT:
Return a JSON object with "keep_segments" array. Each segment has:
- "start": start time in seconds
- "end": end time in seconds  
- "reason": brief explanation of why this segment is kept

IMPORTANT: Your timecodes must match the word timestamps provided. Don't invent times."""


class OpenAIEditorialService:
    """
    Editorial service using OpenAI's GPT models with structured output.

    To swap implementations, create a new class that matches the
    EditorialService protocol and inject it into the pipeline.
    """

    def __init__(self, client: Optional[OpenAI] = None, model: str = "gpt-4o-mini"):
        self.client = client or OpenAI()
        self.model = model

    def analyze(self, transcript: Transcript) -> EditDecisionList:
        """
        Analyze a transcript and produce an Edit Decision List.

        Args:
            transcript: The word-level transcript to analyze

        Returns:
            EditDecisionList with segments to keep
        """
        # Format transcript with timestamps for the LLM
        formatted_transcript = self._format_transcript(transcript)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": EDITORIAL_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Here is the transcript with word-level timestamps:\n\n{formatted_transcript}\n\nAnalyze this and return the segments to KEEP.",
                },
            ],
            response_format={"type": "json_object"},
        )

        # Parse the response
        import json

        result = json.loads(response.choices[0].message.content)

        keep_segments = [
            KeepSegment(
                start=seg["start"], end=seg["end"], reason=seg.get("reason", "")
            )
            for seg in result.get("keep_segments", [])
        ]

        return EditDecisionList(
            keep_segments=keep_segments, original_duration=transcript.duration
        )

    def _format_transcript(self, transcript: Transcript) -> str:
        """Format transcript with timestamps for LLM consumption."""
        lines = []
        current_line = []
        current_start = None

        for segment in transcript.segments:
            if current_start is None:
                current_start = segment.start

            current_line.append(segment.word)

            # Group words into ~5 word chunks for readability
            if len(current_line) >= 5:
                line_text = " ".join(current_line)
                lines.append(f"[{current_start:.2f}s - {segment.end:.2f}s] {line_text}")
                current_line = []
                current_start = None

        # Don't forget the last chunk
        if current_line:
            line_text = " ".join(current_line)
            last_end = transcript.segments[-1].end if transcript.segments else 0
            lines.append(f"[{current_start:.2f}s - {last_end:.2f}s] {line_text}")

        return "\n".join(lines)
