# Project Handoff: GarbageInGoldOut (GIGO)

## 🎯 Objective
Automate the cleanup of "talking head" videos to create high-energy, viral-ready content. 
**Goal**: Garbage (rambling, stutters, mistakes) In → Gold (tight, high-pacing edit) Out.

## 🏗️ Current Architecture (The Hybrid Pivot)
We moved away from pure LLM-text editing to a **Multimodal Hybrid Engine** which is our "Gold Standard."

1. **Whisper (Ears)**: Generates frame-accurate word-level timestamps (anchors).
2. **Gemini 3 Flash Preview (Vision/Brain)**: "Watches" the compressed video while reading the transcript. It identifies which Whisper-anchored segments to keep based on both verbal content and visual cues (expressions, eye contact).
3. **FFmpeg (Hands)**: Performs surgical slicing and concatenation of the original high-quality file based on the Edit Decision List (EDL).

## 🚀 Key Features Implemented
- **Temporal Padding**: Added 50ms lead-in and 150ms decay to every segment to prevent "word clipping."
- **Overlap Merging**: Automatically merges segments that overlap due to padding for smooth transitions.
- **Gemini 3 Integration**: Upgraded from Gemini 2.0 to Gemini 3 Flash Preview for better reasoning and multimodal native support.
- **JSON Parsing Stability**: Robust parsing to handle Gemini 3's varying output formats (list vs. dict).

## 📁 Critical Files
- `gigo/core/hybrid.py`: The heart of the system. Logic for Whisper -> Gemini 3 -> Padding -> EDL.
- `gigo/core/rendering.py`: FFmpeg-based rendering engine.
- `scratchpads/garbageingoldout.md`: High-level strategic blueprint.
- `test_hybrid.py`: Main test script for the hybrid engine. Use this to process new videos.
- `test_render.py`: Renders a video given an EDL JSON file.

## 📈 Status & Next Steps
- **Phase 1 & 2**: COMPLETED (Transcribing, Editorial Logic, Surgical Rendering).
- **Phase 2.5**: COMPLETED (Multimodal Hybrid Upgrade & Padding).
- **Phase 3 (NEXT)**: **Viral Zoom**. 
  - Goal: Implement face tracking and dynamic scale-up (e.g., 100% -> 115% zoom) on alternate clips to hide jump cuts and maintain viewer attention.

## 💡 Notes for the Next Agent
- **Models**: Use `gemini-3-flash-preview` for video analysis.
- **Environment**: Ensure `OPENAI_API_KEY` and `GEMINI_API_KEY` are set in `.env`.
- **Testing**: Use `IMG_1921_5min.MOV` for fast verification of fixes.
