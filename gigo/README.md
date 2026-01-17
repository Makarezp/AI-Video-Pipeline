# 🎬 GarbageInGoldOut (GIGO) Video Engine

A "Multimodal Video Distillery" that transforms rambling, unscripted footage into tight, high-energy content.

## ✨ The Gold Standard: Hybrid Engine
The GIGO engine uses a **Hybrid Multimodal approach** to achieve surgical precision:

1.  **Whisper (Audio)**: Generates frame-accurate word anchors.
2.  **Gemini 3 Flash Preview (Vision + Intelligence)**: "Watches" the video to identify visual errors (eye contact breaks, bad lighting) and "listens" for semantic mistakes (hesitations, false starts).
3.  **FFmpeg (Rendering)**: Slices and reconstructs the video with high-performance stability.

## 🚀 Key Features
- **Temporal Padding**: 50ms lead-in and 150ms decay on segments to prevent clipped words.
- **Multimodal Analysis**: Cuts based on both what is **said** and what is **seen**.
- **Gemini 3 Powered**: Native understanding of video context for high-quality editorial decisions.

## 🛠️ Setup

```bash
pip install -r gigo/requirements.txt
```

### Environment
Create a `.env` file in the root:
```env
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
```

## 🎥 Usage

### High-Level Pipeline
```python
from gigo.core import process_video

# Analyzes with Whisper + Gemini 3
result = process_video("raw_video.mp4")
print(result.summary())
```

### Direct Hybrid Service
```python
from gigo.core.hybrid import HybridVideoService

service = HybridVideoService()
edl = service.analyze_video("raw_video.mp4") # Returns EditDecisionList
```

## 🧪 Testing
Check out `test_hybrid.py` for a full demonstration of the analysis and `test_render.py` for generating the final video file.

---
*Garbage in, viral gold out.*

