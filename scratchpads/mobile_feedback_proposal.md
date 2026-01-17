# Proposal: Human-in-the-Loop (HITL) Feedback System

This proposal outlines the architectural changes needed to support a mobile UI where users can review and override the AI's editing decisions.

## 1. The "Dual-Sided" EDL (Data Model)
Currently, our `EditDecisionList` only explicitly tracks what to **KEEP**. To support a UI with colored "danger zones," we need to explicitly return what was **REMOVED**.

### Change #1: Update `EditDecisionList` model
```python
class Segment(BaseModel):
    start: float
    end: float
    reason: str
    action: str # "keep" or "remove"

class InteractiveEDL(BaseModel):
    segments: list[Segment] # Continuous list covering 100% of duration
    original_duration: float
```
- **Goal**: Ensure the UI has a gapless timeline where every millisecond is either "Green" (Keep) or "Red/Grey" (Remove).

## 2. The Feedback Loop (Workflow)

1.  **Stage A (Analyze)**: App uploads video -> Server returns `InteractiveEDL`.
2.  **Stage B (Review)**: 
    - App renders a seeker bar with colored overlays.
    - User clicks a "Removed" segment -> Sees Gemini's reason: *"You stuttered here."*
    - User clicks "Keep anyway" -> Segment action flips to "keep".
3.  **Stage C (Reify)**: App sends the **Modified EDL** back to the server.
4.  **Stage D (Render)**: Server runs FFmpeg on the user-approved segments.

## 3. Required Implementation Changes

### Backend (Python Core)
- **New Method**: `HybridVideoService.get_interactive_timeline()`
  - This method will calculate the "gaps" between `keep_segments` and label them as `removed_segments` with their own reasons.
- **Service Decoupling**: Ensure the `RenderingService` can accept a raw list of timestamps sent from the mobile app, rather than always generating them from scratch.

### API (FastAPI Layer)
- `POST /analyze`: Returns the JSON timeline.
- `POST /render`: Takes a JSON timeline and the video ID, then produces the final MP4.

### UI (Mobile)
- **Seeker Overlays**: Custom Canvas/SVG layer on top of the `<Video />` component.
- **Segment State**: Local state management (Zustand/Redux) to track user overrides.

## 4. Benefit: Better AI
By collecting "User Overrode X" data, we can eventually **fine-tune** the Gemini prompts. If users consistently "Keep" segments that Gemini thought were "Filler," we can adjust the system prompt to be less aggressive.

---
*Next Step: Should we implement the `InteractiveEDL` generation in `hybrid.py`?*
