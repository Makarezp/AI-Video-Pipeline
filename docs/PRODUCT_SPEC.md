<!--
 AGENT INSTRUCTION: DOCUMENTATION MAINTENANCE
1. CONTEXT CHECK: Before editing, ask yourself: "Did my recent code changes affect Architecture, Setup, or Public API?"
   - NO: Do not touch this file.
   - YES: Update ONLY the specific sections that changed.
2. INCREMENTAL EDITING: 
   - NEVER regenerate this entire file.
   - Use `replace_file_content` or `multi_replace_file_content` to make surgical edits.
   - Preserve existing style, technical depth, and structure.
3. SOURCE OF TRUTH: This README reflects the LIVE state of the project. Keep it sync'd with code.
-->
# AI Vid Editor Product Specification

Here is the deep, high-level blueprint of the system we are building. Think of this as the Technical Specification you would show to a co-founder.

    We are building a **"Multimodal Video Distillery"** for mobile creators.

- **Input**: A raw, unscripted video file (up to 20 mins) where the user rambles, stutters, and repeats themselves.
- **The Black Box**: A multimodal hybrid processing engine.
- **Output**: A tight, high-energy video with no mistakes, perfect pacing, and dynamic visual zooms.

---

## 1. The "X-Ray" Architecture

We use a **Clean Architecture** design to ensure the engine is modular, testable, and ready for scale. The system uses three distinct intelligences.

### Layer 1: The Ears (Transcription Agent)
- **Goal**: Turn binary audio data into structured word-level anchors.
- **Technology**: **OpenAI Whisper (Verbose JSON)**.
- **Why**: Whisper gives us **Frame-Accurate Anchors**. We don't rely on the LLM to guess "when" a word was said. We use Whisper's timestamps as the absolute source of truth for the "bones" of the video.

### Layer 2: The Brain (Multimodal Editorial Agent)
- **Goal**: Replicate the judgment of a world-class human editor.
- **Technology**: **Google Gemini 1.5 Flash**.
- **The Hybrid Logic**: This is our secret sauce. We feed Gemini the **Compressed Video** + the **Whisper Transcript**.
  - **Vision**: Gemini "watches" for visual cues (stray glances, confused expressions, bad lighting).
  - **Audio**: Gemini "listens" for tonal hesitations and filler sounds.
  - **Decision**: Gemini selects which Whisper-anchored segments to keep, combining visual context with verbal meaning.

### Layer 3: The Hands (Rendering Engine)
- **Goal**: Execute surgical cuts with production-grade stability.
- **Technology**: **FFmpeg Direct (Surgical Slicing)**.
- **Hardware Acceleration**: Uses `h264_videotoolbox` on macOS for near-instant rendering.
- **The Viral Zoom**: Hides jump cuts by punching in (Toggle Zoom: 100% → 115%). This makes cuts feel like intentional camera switches rather than errors.

---

## 2. The Data Flow (Mobile-First Workflow)

1. **Capture/Pick**: User selects a video in the **Expo Mobile App**.
2. **Upload & Project Creation**: Video is uploaded to the **FastAPI Backend**, creating a persistent **Project** in local storage.
3. **Background Analysis**:
   - Analysis runs **asynchronously** (user returns to Dashboard immediately).
   - **Adapters**: Extract audio (FFmpeg), Transcribe (Whisper), Analyze (Gemini).
   - **Services**: Coordinate parallel chunk analysis to handle long videos without timeout.
4. **Project Library (Dashboard)**:
   - Mobile app lists all projects with their **status** (Analyzing / Ready / Failed).
   - User can tap into any project to resume editing.
5. **Interactive Timeline Editor**:
   - **Green Zones**: Segments to keep.
   - **Red Zones**: Segments the AI suggests removing (with visible reasons like "Stutter" or "Silent Gap").
   - **User Override**: The user can "Flip" any segment between keep/remove with a single tap.
   - **Auto-Save**: Every change is synced to the backend in real-time.
6. **Rendering**:
   - Service applies temporal buffers (50ms lead-in, 150ms decay).
   - FFmpeg uses **hardware-accelerated encoding** (`h264_videotoolbox` on macOS).
7. **Delivery**:
   - Rendered video is saved to the backend.
   - User saves directly to their **Phone Gallery (GIGO Album)**.

---

## 3. Project Persistence Layer

The system now supports **persistent sessions** via a file-based repository:

- **Storage Location**: `gigo/storage/projects/{uuid}/`
- **Files per Project**:
  - `source.mp4` — The original uploaded video.
  - `project.json` — Metadata (name, status, timestamps).
  - `edl.json` — The Edit Decision List (keeps/removes).
- **API Endpoints**:
  - `POST /projects` — Create (upload + background analysis).
  - `GET /projects` — List all.
  - `GET /projects/{id}` — Status check.
  - `PATCH /projects/{id}/edl` — Auto-save timeline updates.

This allows users to **close the app**, come back tomorrow, and **resume editing** exactly where they left off.

---

## 4. The "Secret Sauce"

Most apps edit based on "silence." We edit based on **Intent** and **Context**.

- **The Semantic Cleanup**: If a creator says "The product... actually... the final result is gold," the engine realizes "The final result is gold" is the intended thought and deletes the hesitation.
- **The Visual Cleanup**: If the creator looks at their notes, Gemini sees the eye movement and cuts that segment.
- **Interactive EDL**: Our data structure represents every millisecond of the video. The user isn't "editing" video; they are "approving" AI decisions.

---

## 5. Engineering Standards

**Agents working on this project must adhere to strict code quality standards.**
We are not just building features; we are building a maintainable, modular system.

### Core Principles

1.  **Clean Architecture**:
    -   Respect the dependency rule. `Core` (Models) knows nothing about `Services`. `Services` know nothing about `Adapters`.
    -   **Adapters are Plugins**: You should be able to swap `GeminiAdapter` for `GPT4Adapter` without touching a single line of business logic in `services/`.

2.  **S.O.L.I.D. & SRP (Single Responsibility Principle)**:
    -   **No God Objects**: If a class ends in `Manager` and has >200 lines, it is suspicious. Break it down.
    -   **Small, Focused Modules**: Each file should do *one* thing well.
        -   *Bad*: `video_processor.py` (does downloading, analyzing, and rendering).
        -   *Good*: `downloader.py`, `analyzer.py`, `renderer.py`.

3.  **Modularity**:
    -   **Imports Matter**: Functional code should be importable without side effects.
    -   **Dependency Injection**: Do not instantiate external services (like DBs or AI clients) inside logic classes. Pass them in via `__init__` or Protocol interfaces.

---

*Raw Footage in, Viral Content out.*