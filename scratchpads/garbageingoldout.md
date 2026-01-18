Here is the deep, high-level blueprint of the system we are building. Think of this as the Technical Specification you would show to a co-founder.

## The Product Definition

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
2. **Upload**: Video is streamed to the **FastAPI Backend**.
3. **Internal Pipeline**:
   - **Adapters**: Extract audio (FFmpeg), Transcribe (Whisper), Analyze (Gemini).
   - **Services**: Coordinate parallel chunk analysis to handle long videos without timeout.
4. **Synthesis**:
   - Whisper → Word Timestamps.
   - Gemini + Preview Video + Transcript → Initial Edit Decisions.
5. **Human-in-the-Loop Review**:
   - The app displays an **Interactive Timeline**.
   - **Green Zones**: Segments to keep.
   - **Red Zones**: Segments the AI suggests removing (with visible reasons like "Stutter" or "Silent Gap").
   - **User Override**: The user can "Flip" any segment between keep/remove with a single tap.
6. **Rendering**:
   - Service applies temporal buffers (50ms lead-in, 150ms decay).
   - FFmpeg slices the source and concatenates into a final masterpiece.
7. **Delivery**:
   - Rendered video is saved to the backend.
   - User downloads/shares directly to their **Phone Gallery (GIGO Album)**.

---

## 3. The "Secret Sauce"

Most apps edit based on "silence." We edit based on **Intent** and **Context**.

- **The Semantic Cleanup**: If a creator says "The product... actually... the final result is gold," the engine realizes "The final result is gold" is the intended thought and deletes the hesitation.
- **The Visual Cleanup**: If the creator looks at their notes, Gemini sees the eye movement and cuts that segment.
- **Interactive EDL**: Our data structure represents every millisecond of the video. The user isn't "editing" video; they are "approving" AI decisions.

---

## 4. Technical Strategy

- **Clean Architecture Hierarchy**:
  - `gigo/adapters/`: Infrastructure (FFmpeg, Whisper, Gemini).
  - `gigo/services/`: Application Logic (Transcription, Analysis, Timeline Rendering).
  - `gigo/core/`: Domain models & Orchestration.
  - `mobile/`: React Native (Expo SDK 52) frontend.
- **Dependency Injection**: A factory pattern wires the system, allowing any component (e.g., the analyzer) to be swapped without touching the core logic.
- **Parallelism**: Large videos are semantically chunked and analyzed in parallel, slashing total processing time.

---
*Garbage in, viral gold out.*