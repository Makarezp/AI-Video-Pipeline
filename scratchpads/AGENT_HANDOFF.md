# 🤖 AGENT HANDOFF: Project GIGO (Garbage In, Gold Out)

Welcome, Agent. You are taking over a high-precision video editing engine. Here is your situational awareness report.

## 🎯 The Mission
Transform rambling, unscripted "talking head" videos into tight, viral content by combining **Whisper timestamps** (perfect anchors) with **Gemini 3 Vision** (human-level judgment).

---

## 🛠️ Current Architecture: The "Gold Standard"
We have pivoted to a **Hybrid Multimodal Engine**. 
1. **Whisper**: Extracts exact word timestamps.
2. **Gemini 3 Flash Preview**: "Watches" the video and "reads" the transcript to decide what to keep.
3. **FFmpeg**: Slices the video with surgical precision.
4. **Temporal Padding**: Every cut has a **+50ms lead-in** and **+150ms decay** to prevent audio clipping.
5. **Human-in-the-Loop UI**: Web-based timeline editor for reviewing and overriding AI decisions.

---

## 📍 Where to Navigate First
To understand the logic and state of the project, read these files in order:

1.  **[Strategy Blueprint](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/scratchpads/garbageingoldout.md)**: The "North Star" of the product.
2.  **[Mobile Feedback Proposal](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/scratchpads/mobile_feedback_proposal.md)**: The HITL architecture design.
3.  **[Core Engine (hybrid.py)](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/gigo/core/hybrid.py)**: Whisper + Gemini 3 logic + `get_interactive_timeline()`.
4.  **[API Layer (api.py)](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/gigo/api.py)**: FastAPI endpoints for timeline and rendering.
5.  **[UI (ui/)](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/ui/)**: Vanilla JS web app for interactive editing.

---

## ✅ What's Done
- [x] **Gemini 3 Integration**: Service is live and using `gemini-3-flash-preview`.
- [x] **Word Clipping Fix**: Temporal padding and overlap merging are implemented.
- [x] **Core Cleanup**: All legacy/single-modality services deleted. Engine consolidated.
- [x] **Verification**: Verified with `IMG_1836_1min.MOV` (94.5% content retention).
- [x] **InteractiveEDL Model**: `TimelineSegment` and `InteractiveEDL` in `models.py`.
- [x] **get_interactive_timeline()**: Converts keep-only EDL → gapless timeline with keep/remove segments.
- [x] **FastAPI Server**: `/videos`, `/video/{filename}`, `/timeline/{edl}`, `/render` endpoints.
- [x] **PoC Web UI**: Timeline visualization with segment toggle (keep ↔ remove).

---

## 🚀 Your Next Objective
The HITL PoC is functional! Next steps to consider:

1. **Browser Testing**: Video playback in browser requires `.mp4` (MOV files may not play in all browsers). Consider transcoding test videos.
2. **Error Handling**: Add better error states in the UI.
3. **Segment Scrubbing**: Click timeline to seek video to that segment.


### To Run the PoC
```bash
cd /Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My\ Drive/Projects/GarbageInGoldOut
source .venv/bin/activate
uvicorn gigo.api:app --reload --port 8000  # API server
python3 -m http.server 5173 --directory ui  # UI server
# Open http://localhost:5173
```

**Ready when you are.**
