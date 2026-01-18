# 🤖 AGENT HANDOFF: Project GIGO (Garbage In, Gold Out)

Welcome, Agent. You are taking over a high-precision video editing engine with a native mobile client.

---

## 🎯 The Mission
Transform rambling, unscripted "talking head" videos into tight, viral content by combining **Whisper timestamps** with **Gemini 3 Vision**.

---

## 🛠️ Architecture Overview

### Backend: Clean Architecture (`gigo/`)
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
│   ├── models.py          # Pydantic data models
│   └── rendering.py       # FFmpeg rendering service
├── prompts/               # Externalized AI prompts
├── config.py              # Centralized configuration
├── factory.py             # Dependency injection wiring
└── api.py                 # FastAPI endpoints
```

### Mobile Client: Expo React Native (`mobile/`)
```
mobile/
├── app/                   # Expo Router screens
│   ├── _layout.tsx        # Root layout & theme (dark mode)
│   ├── index.tsx          # Home: video picker/record
│   └── editor.tsx         # Timeline editor + save to gallery
├── components/
│   └── Timeline.tsx       # Custom interactive timeline
├── utils/
│   └── api.ts             # Backend API integration
└── app.json               # Expo config with permissions
```

---

## 📍 Key Entry Points

| File | Purpose |
|------|---------|
| [factory.py](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/gigo/factory.py) | Creates fully-wired orchestrator |
| [orchestrator.py](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/gigo/core/orchestrator.py) | Main pipeline coordinator |
| [api.py](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/gigo/api.py) | FastAPI endpoints |
| [mobile/](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/mobile/) | Expo React Native app |
| [ui/](file:///Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My%20Drive/Projects/GarbageInGoldOut/ui/) | Legacy Vanilla JS web app |

---

## 🤖 Agent Verification Capabilities

The agent has configured access to the **iOS Simulator MCP Server**. This allows autonomous verification of mobile app features:
- **UI Inspection**: reading accessibility trees (`ui_describe_all`).
- **Interaction**: simulating taps, swipes, and text input.
- **Visual Verification**: capturing screenshots for validaton.

**Configuration**: `~/.gemini/antigravity/mcp_config.json` (configured with `idb` path).

---

## ✅ What's Done

### Clean Architecture Refactoring
- [x] **Adapters**: FFmpeg, Whisper, Gemini extracted (675 lines)
- [x] **Services**: Transcription, Analysis, Timeline (305 lines)
- [x] **Orchestrator**: Thin coordinator (80 lines vs 810 original)
- [x] **DI Factory**: Wires all dependencies

### Core Features
- [x] Smart Chunking (semantic splits)
- [x] Parallel Analysis (async)
- [x] **User Instructions**: Calibration step allowing custom prompts/guidance for AI
- [x] Hardware-Accelerated Rendering (`h264_videotoolbox`)
- [x] **Gemini Stability**: Safety settings (`BLOCK_NONE`) & robust MIME detection

### Project Persistence (Local DB)
- [x] **Local Repository**: File-based storage in `gigo/storage/projects/`
- [x] **API Endpoints**: CRUD for projects, background analysis, auto-save (`PUT/PATCH`)
- [x] **Project Metadata**: `project.json` stores status, path, duration

### Mobile App (Expo SDK 52)
- [x] **Dashboard**: Persistent list of projects with status (Analyzing/Ready)
- [x] **Upload**: Background uploads + Immediate redirect to Editor
- [x] **Editor**: 
    - Loads persistent projects by ID
    - **Calibration Flow**: Review video and inputs instructions before analysis
    - **Non-blocking Analysis**: View raw video while AI processes in background
    - Auto-saves edits to backend
    - Polls for analysis completion (Stop-on-Ready optimization)
    - Full-screen video playback of source media
- [x] **Timeline Component**: 60fps Reanimated interactions with **thumbnail filmstrip**
- [x] **Save to Gallery**: Download rendered video to device Photos

---

## 🚀 Future Objectives
1. **Unit Tests**: Mock adapters for fast testing
2. **Multi-File Rendering**: Parallel segment rendering
3. **Mobile Polish**: Animations, haptic feedback, export/share options
4. **Production Deployment**: Configure API for cloud hosting

---

## 📝 Documentation Policy

After each significant change, update these files to reflect the **current product state**:

| Document | Focus |
|----------|-------|
| `gigo/README.md` | Pipeline steps, API endpoints, architecture diagram |
| `mobile/README.md` | User-facing features, screen descriptions, tech stack |
| `scratchpads/garbageingoldout.md` | High-level product philosophy and data flow |
| `scratchpads/AGENT_HANDOFF.md` | Developer onboarding, entry points, what's done |

### What to Document
- **Key architectural decisions** (e.g., "Why file-based storage vs. database?").
- **Non-obvious behaviors** (e.g., "Polling stops when status is 'ready'").
- **Integration points** (e.g., "Mobile app expects `/projects` endpoint").
- **Known gotchas** (e.g., "Restart uvicorn after adding new endpoints").

### What NOT to Document
- Exhaustive changelogs (use git history for that).
- Line-by-line code explanations.
- Temporary debugging notes.

**Goal**: A new agent should understand the product's *current* capabilities in under 5 minutes.

## 🏃 Quick Start

### Backend API
```bash
cd "/Users/acc/Library/CloudStorage/GoogleDrive-makarezp1@gmail.com/My Drive/Projects/GarbageInGoldOut"
source .venv/bin/activate
uvicorn gigo.api:app --host 0.0.0.0 --port 8000
```

### Mobile App
```bash
cd mobile
npm install
npx expo start --ios
```

### Legacy Web UI
```bash
cd ui && python3 -m http.server 5173
```

**Environment**: Requires `OPENAI_API_KEY` and `GEMINI_API_KEY` in `.env`.

**Ready when you are.**
