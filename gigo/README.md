<!--
🤖 AGENT INSTRUCTION: DOCUMENTATION MAINTENANCE
1. CONTEXT CHECK: Before editing, ask yourself: "Did my recent code changes affect Architecture, Setup, or Public API?"
   - NO: Do not touch this file.
   - YES: Update ONLY the specific sections that changed.
2. INCREMENTAL EDITING: 
   - NEVER regenerate this entire file.
   - Use `replace_file_content` or `multi_replace_file_content` to make surgical edits.
   - Preserve existing style, technical depth, and structure.
3. SOURCE OF TRUTH: This README reflects the LIVE state of the project. Keep it sync'd with code.
-->
# 🎬 AI Vid Editor (GIGO) Video Engine

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

### Layer Definitions

- **`gigo/adapters/`**: Infrastructure Layer. Contains concrete implementations of external services.
- **`gigo/services/`**: Application Logic. Pure business logic that coordinates data flow (Transcription, Analysis, Timeline Rendering).
- **`gigo/core/`**: Domain Layer. Contains shared models (`models.py`) and interfaces (`protocols.py`). The `Orchestrator` here is a thin coordinator.
- **`gigo/storage/`**: Persistence Layer. File-based repository for Projects.

### The Pipeline
1. **Project Library** → Persistent file-based storage of sessions
2. **Whisper** → Word-level timestamps from audio
3. **Calibration** → Apps can provide user instructions to guide editing
4. **Punctuation Restoration** → LLM-based punctuation via Gemini Flash
5. **Smart Chunking** → Semantic splits via Gemini Flash
6. **Parallel Analysis** → Concurrent Gemini 3 analysis
5. **Mobile Editor** → Persistent timeline state & background rendering

## 📝 Logging & Observability

GIGO uses a **Protocol-based Logging** system to ensure testability and flexibility.

- **`LoggerProtocol`** (`gigo.core.protocols`): The interface that all services depend on.
- **`ConsoleLogger`** (`gigo.adapters.logging`): The concrete implementation using Python's standard `logging`.

### Usage Pattern
Services should **never** import `logging` directly. Instead, accept a `Logger` in `__init__`:

```python
from gigo.core.protocols import Logger

class MyService:
    def __init__(self, logger: Logger):
        self._logger = logger

    def do_work(self):
        self._logger.info("Starting work...")
```

## 📡 API Endpoints

- `GET /prompt-blocks` - Get available prompt building blocks for analysis configuration
- `POST /projects` - Upload video & create project (generates thumbnails)
- `POST /projects/{id}/analyze` - Start analysis with structured prompt blocks
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
*Raw Footage in, Viral Content out.*
