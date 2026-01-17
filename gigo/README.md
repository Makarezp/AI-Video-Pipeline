# 🎬 GarbageInGoldOut (GIGO) Video Engine

A "Multimodal Video Distillery" that transforms rambling, unscripted footage into tight, high-energy content.

## ✨ Architecture

GIGO uses a **Clean Architecture** with separated concerns:

```
gigo/
├── adapters/          # Infrastructure (FFmpeg, Whisper, Gemini)
├── services/          # Domain logic (Transcription, Analysis, Timeline)
├── core/              # Models, Protocols, Orchestrator
├── prompts/           # Externalized AI prompts
├── config.py          # Centralized configuration
└── factory.py         # Dependency injection
```

### The Pipeline
1. **Whisper** → Word-level timestamps from audio
2. **Smart Chunking** → Semantic splits via Gemini Flash
3. **Parallel Analysis** → Concurrent Gemini 3 analysis
4. **Hardware Rendering** → Apple Silicon encoder (`h264_videotoolbox`)

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

### Recommended: Factory Pattern
```python
from gigo.factory import create_orchestrator

orchestrator = create_orchestrator()
edl = orchestrator.process("raw_video.mp4")
timeline = orchestrator.get_interactive_timeline(edl)
```

### Legacy API (still works)
```python
from gigo.core.hybrid import HybridVideoService

service = HybridVideoService()
edl = service.analyze_video("raw_video.mp4")
```

## 🏃 Quick Start

```bash
# Start API server
source .venv/bin/activate
uvicorn gigo.api:app --reload --port 8000

# Start UI server (in another terminal)
cd ui && python3 -m http.server 5173
```

Then open http://localhost:5173

## 🧪 Testing
- `test_hybrid.py` - Full analysis demo
- `test_render.py` - Final video rendering

---
*Garbage in, viral gold out.*
