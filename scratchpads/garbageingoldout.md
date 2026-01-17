Here is the deep, high-level blueprint of the system we are building. Think of this as the Technical Specification you would show to a co-founder.

## The Product Definition

We are building a **"Multimodal Video Distillery"** for mobile creators.

- **Input**: A raw, unscripted video file (up to 20 mins) where the user rambles, stutters, and repeats themselves.
- **The Black Box**: A multimodal hybrid processing engine.
- **Output**: A tight, high-energy video with no mistakes, perfect pacing, and dynamic visual zooms.

---

## 1. The "X-Ray" Architecture (The Pivot)

We have pivoted from a simple text-only editor to a **Multimodal Hybrid Engine**. The system uses three distinct intelligences.

### Layer 1: The Ears (Transcription Agent)
- **Goal**: Turn binary audio data into structured word-level anchors.
- **Technology**: OpenAI Whisper (Verbose JSON).
- **Why**: Whisper gives us **Frame-Accurate Anchors**. We don't rely on the LLM to guess "when" a word was said. We use Whisper's timestamps as the absolute source of truth for the "bones" of the video.

### Layer 2: The Brain (Multimodal Editorial Agent)
- **Goal**: Replicate the judgment of a world-class human editor.
- **Technology**: **Gemini 3 Flash Preview**.
- **The Hybrid Logic**: This is our secret sauce. We feed Gemini 3 the **Compressed Video** + the **Whisper Transcript**.
  - **Vision**: Gemini "watches" for visual cues (stray glances, confused expressions, bad lighting).
  - **Audio**: Gemini "listens" for tonal hesitations and filler sounds.
  - **Decision**: Gemini selects which Whisper-anchored segments to keep, combining visual context with verbal meaning.

### Layer 2.5: The Precision Layer (Safety & Padding)
- **Timestamp Hallucination Control**: We force Gemini to stay within the bounds of the Whisper anchors.
- **Temporal Padding**: To prevent "clipped" words, we automatically add:
  - **50ms Lead-in**: Catches the initial attack of the first word.
  - **150ms Decay**: Preserves the natural fade-out of the last word.
- **Overlap Merging**: Intelligent merging logic ensures that padded clips flow into each other seamlessly without technical glitches.

### Layer 3: The Hands (Rendering Engine)
- **Goal**: Execute surgical cuts with production-grade stability.
- **Technology**: **FFmpeg Direct (Surgical Slicing)**.
- **The Viral Zoom**: Hides jump cuts by punching in (Toggle Zoom: 100% → 115%). This makes cuts feel like intentional camera switches rather than errors.

---

## 2. The Data Flow (Surgical Efficiency + Review)

1. **Upload**: User sends raw video.
2. **Extraction**: Extract audio for Whisper.
3. **Compression**: Create a lightweight "Preview Video" (CRF 28) for the Gemini 3 vision model.
4. **Synthesis**:
   - Whisper → Word Timestamps.
   - Gemini 3 + Preview Video + Transcript → Initial Edit Decisions.
5. **The Review Phase (NEW | Human-in-the-Loop)**:
   - The app displays an **Interactive Timeline**.
   - **Green Zones**: Segments to keep.
   - **Red Zones**: Segments the AI suggests removing (with visible reasons like "Stutter" or "Silent Gap").
   - **User Override**: The user can "Flip" any segment between keep/remove.
6. **Padding & Merging**: Apply temporal buffers (50ms/150ms) to the *final* user-approved selection.
7. **Rendering**: FFmpeg slices the high-quality source and concatenates.

---

## 3. The "Secret Sauce" (Meaning-Based Editing)

Most apps edit based on "silence." We edit based on **Intent** and **User Feedback**.

- **The Semantic Cleanup**: If a creator says "The product... actually... the final result is gold," the engine realizes "The final result is gold" is the intended thought and deletes the hesitation.
- **The Visual Cleanup**: If the creator looks at their notes, Gemini 3 sees the eye movement and cuts that segment.
- **The Intelligence Hook**: Every time a user overrides a "Remove" decision, we log it. This allows the system to learn your individual speaking style and become a "Personal Editor" over time.

---

## 4. Technical Strategy

- **Interactive EDL**: A gapless data structure representing every millisecond of the original video as either "Keep" or "Remove".
- **Gemini 3**: Chosen for its massive context window and native multimodal native understanding.
- **FFmpeg**: Surgical precision at scale.
- **JSON Structured Output**: Ensures we always have valid segments for the UI to draw.

---
*Garbage in, viral gold out.*