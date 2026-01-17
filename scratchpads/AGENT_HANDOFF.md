# 🤖 AGENT HANDOFF: Project GIGO (Garbage In, Gold Out)

Welcome, Agent. You are taking over a high-precision video editing engine. Here is your situational awareness report.

## 🎯 The Mission
Transform rambling, unscripted "talking head" videos into tight, viral content by combining **Whisper timestamps** (perfect anchors) with **Gemini 3 Vision** (human-level judgment).

---

## 🛠️ Current Architecture: The "Gold Standard"
We have pivoted to a **Hybrid Multimodal Engine**:

1. **Whisper**: Extracts exact word timestamps from audio.
2. **Gemini 3 Flash Preview**: "Watches" the video + "reads" the transcript to decide what to keep.
3. **FFmpeg**: Slices the video with surgical precision.
4. **Temporal Padding**: Every cut has **+50ms lead-in** and **+150ms decay** to prevent audio clipping.
5. **Human-in-the-Loop UI**: Full-featured web editor with upload, analysis, review, render, and playback.

---

## 📍 Key Files

| File | Purpose |
|------|---------|
| [hybrid.py](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/gigo/core/hybrid.py) | Core Whisper + Gemini analysis engine |
| [api.py](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/gigo/api.py) | FastAPI endpoints: `/upload`, `/analyze`, `/render`, `/timeline` |
| [ui/](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/ui/) | Vanilla JS web app |
| [logs/](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/logs/) | Debug logs from Gemini responses |

---

## ✅ What's Done

### Core Engine
- [x] Gemini 3 integration with `gemini-3-flash-preview`
- [x] Whisper word-level timestamps
- [x] Temporal padding (+50ms/-150ms) and overlap merging
- [x] **Refined Prompt**: "Prefer Keeping" philosophy + 2s silence threshold
- [x] **Robust JSON Parsing**: Handles "Extra data" errors from Gemini
- [x] Debug logging to `logs/` directory

### API Layer
- [x] `POST /upload` - Accept video files
- [x] `POST /analyze/{filename}` - Run full Whisper + Gemini pipeline
- [x] `GET /timeline/{edl}` - Load pre-existing EDL as interactive timeline (with specific remove reasons)
- [x] `POST /render` - Render edited video from user overrides
- [x] `GET /video/{filename}` - Stream video files to browser

### Web UI
- [x] Drag-and-drop video upload
- [x] Analysis progress indicator
- [x] Interactive timeline with keep/remove segment visualization
- [x] **Rich Feedback**: Hover segments to see specific AI reasons (e.g., "long pause", "stumble")
- [x] Segment toggle (click to override AI decisions)
- [x] Playhead indicator showing current video position
- [x] Render button with output video player
- [x] Download rendered video

---

## 🚀 Your Next Objective
The full upload → analyze → edit → render → view flow is working! Consider:

1. **Click-to-seek**: Click on timeline to jump video to that position
2. **Segment splitting**: Allow user to split a segment into two
3. **Undo/redo**: Track edit history
4. **Batch processing**: Queue multiple videos

---

## 🏃 Quick Start
```bash
cd "/Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My Drive/Projects/GarbageInGoldOut"
source .venv/bin/activate
uvicorn gigo.api:app --reload --port 8000  # API server
cd ui && python3 -m http.server 5173       # UI server
# Open http://localhost:5173
```

**Environment**: Requires `OPENAI_API_KEY` and `GEMINI_API_KEY` in `.env`

**Ready when you are.**
