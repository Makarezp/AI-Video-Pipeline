# 🎬 GarbageInGoldOut (GIGO) Video Engine

A "Multimodal Video Distillery" that transforms rambling, unscripted footage into tight, high-energy content.

## ✨ Architecture

GIGO uses a **Clean Architecture** with separated concerns:

```
gigo/
├── adapters/          # Infrastructure (FFmpeg, Whisper, Gemini)
├── services/          # Domain logic (Transcription, Analysis, Timeline)
├── core/              # Models, Protocols, Orchestrator
├── storage/           # File-based Project Repository
├── prompts/           # Externalized AI prompts
├── config.py          # Centralized configuration
└── factory.py         # Dependency injection
```

### The Pipeline
1. **Project Library** → Persistent file-based storage of sessions
2. **Whisper** → Word-level timestamps from audio
3. **Calibration** → Apps can provide user instructions to guide editing
4. **Punctuation Restoration** → LLM-based punctuation via Gemini Flash
5. **Smart Chunking** → Semantic splits via Gemini Flash
6. **Parallel Analysis** → Concurrent Gemini 3 analysis
5. **Mobile Editor** → Persistent timeline state & background rendering

## 📡 API Endpoints

- `POST /projects` - Upload video & create project (generates thumbnails)
- `POST /projects/{id}/analyze` - Start analysis with optional user instructions
- `GET /projects` - List all projects
- `GET /projects/{id}` - Get project status & metadata (includes `thumbnail_count`)
- `GET /projects/{id}/edl` - Get interactive timeline
- `PATCH /projects/{id}/edl` - Auto-save timeline changes
- `GET /projects/{id}/thumbnails/{filename}` - Serve thumbnail images (1 FPS filmstrip)
- `GET /video/{path}` - Stream source video
- `POST /render` - Render final video from timeline

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
- `test_hybrid.py` - Full analysis pipeline demo (uses Orchestrator)
- `test_render.py` - Final video rendering

---
*Garbage in, viral gold out.*
