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

## 2. The Data Flow (Surgical Efficiency)

1. **Upload**: User sends raw video.
2. **Extraction**: Extract audio for Whisper.
3. **Compression**: Create a lightweight "Preview Video" (CRF 28) for the Gemini 3 vision model to process quickly.
4. **Synthesis**:
   - Whisper → Word Timestamps.
   - Gemini 3 + Preview Video + Transcript → Keep Decisions.
5. **Padding & Merging**: Apply temporal buffers and resolve segment overlaps.
6. **Rendering**: FFmpeg slices the high-quality source and concatenates with crossfades.

---

## 3. The "Secret Sauce" (Meaning-Based Editing)

Most apps edit based on "silence." We edit based on **Intent**.

- **The Semantic Cleanup**: If a creator says "The product... actually... the final result is gold," the engine realizes "The final result is gold" is the intended thought and deletes the hesitation.
- **The Visual Cleanup**: If the creator looks at their notes in the middle of a sentence, Gemini 3 sees the eye movement and cuts that segment, even if the audio was silent.

---

## 4. Technical Strategy

- **Gemini 3**: Chosen for its massive context window and native multimodal native understanding.
- **FFmpeg**: Chosen over high-level libraries (like MoviePy) for speed and surgical precision in a production environment.
- **JSON Structured Output**: Using Gemini 3's native JSON mode to ensure the "Brain" always speaks a language the "Hands" (FFmpeg) understand.

---
*Garbage in, viral gold out.*