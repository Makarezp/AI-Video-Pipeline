# 🤖 AGENT HANDOFF: Project GIGO (Garbage In, Gold Out)

Welcome, Agent. You are taking over a high-precision video editing engine.

---

## 🎯 The Mission
Transform rambling, unscripted "talking head" videos into tight, viral content by combining **Whisper timestamps** with **Gemini 3 Vision**.

---

## 🛠️ Architecture: Clean Architecture V3

```
gigo/
├── adapters/              # Infrastructure Layer
│   ├── ffmpeg.py          # Video processing (extract, compress, split, render)
│   ├── whisper.py         # Transcription via OpenAI
│   └── gemini.py          # Video analysis & chunking via Gemini
├── services/              # Domain Layer
│   ├── transcription.py   # Coordinates audio extraction + transcription
│   ├── analysis.py        # Handles parallel analysis & merging
│   └── timeline.py        # EDL ↔ InteractiveEDL conversion
├── core/
│   ├── orchestrator.py    # Thin coordinator (80 lines)
│   ├── protocols.py       # Interfaces for DI
│   └── models.py          # Pydantic data models
├── prompts/               # Externalized AI prompts
├── config.py              # Centralized configuration
├── factory.py             # Dependency injection wiring
└── api.py                 # FastAPI endpoints
```

---

## 📍 Key Entry Points

| File | Purpose |
|------|---------|
| [factory.py](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/gigo/factory.py) | Creates fully-wired orchestrator |
| [orchestrator.py](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/gigo/core/orchestrator.py) | Main pipeline coordinator |
| [api.py](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/gigo/api.py) | FastAPI endpoints |
| [ui/](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/ui/) | Vanilla JS web app |

---

## ✅ What's Done

### Clean Architecture Refactoring
- [x] **Adapters**: FFmpeg, Whisper, Gemini extracted (675 lines)
- [x] **Services**: Transcription, Analysis, Timeline (305 lines)
- [x] **Orchestrator**: Thin coordinator (80 lines vs 810 original)
- [x] **DI Factory**: Wires all dependencies
- [x] **Externalized Prompts**: `prompts/analysis.txt`, `prompts/chunking.txt`
- [x] **Centralized Config**: All settings in `config.py`

### Core Features
- [x] Smart Chunking (semantic splits)
- [x] Parallel Analysis (async)
- [x] Hardware-Accelerated Rendering (`h264_videotoolbox`)

---

## 🚀 Future Objectives
1. **Unit Tests**: Mock adapters for fast testing
2. **Multi-File Rendering**: Parallel segment rendering
3. **Split/Merge UI**: Manual segment manipulation

---

## 🏃 Quick Start
```bash
cd "/Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My Drive/Projects/GarbageInGoldOut"
source .venv/bin/activate
uvicorn gigo.api:app --reload --port 8000  # API server
cd ui && python3 -m http.server 5173       # UI server
```

**Environment**: Requires `OPENAI_API_KEY` and `GEMINI_API_KEY` in `.env`.

**Ready when you are.**
