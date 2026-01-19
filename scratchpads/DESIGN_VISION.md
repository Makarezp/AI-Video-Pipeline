# GIGO Design Vision: "Invisible Precision"

> **Core Philosophy**: The interface is a lens, not a painting. It should recede, leaving only the content and the control.

This document serves as the "running memory" of our design evolution. It captures not just *how* things look, but *why* they look that way.

## 1. The "Feel"
We are building a **Professional Tool**, not a Social Toy.
-   **Vibe**: Cinematic, Technical, Raw, Precise.
-   **Anti-Patterns**: "Trendy" UI, gratuitous rounding, "bubbly" buttons, emojis in UI control elements.
-   **The User**: Is an editor/creator. They need clarity, not decoration.

## 2. Visual Language

### Typography
-   **Data is Monospace**: Any numbers, timecodes, or technical data must use a Monospaced font (`Menlo` on iOS). It implies precision and stability.
-   **UI is System**: Labels and actions use the System font.
-   **No Truncation**: We do not truncate context. If AI explains something, we show the full explanation. We respect the intelligence of the user.

### Color & Contrast
-   **Dark Mode Only**: The app is a dark room. Backgrounds are deep grays/blacks (`#18181B`).
-   **Ghost vs. Solid**: Secondary Actions are "Ghost" (text only) or "Icon Only". They don't steal focus.
-   **Semantic Colors**:
    -   **Gold/Yellow (✨)**: Magic/Keep (AI Highlight).
    -   **TextSecondary (Grey)**: Inactive/Excluded.
    -   **White**: Active/Included.

### Iconography
-   **Vector Only**: **NO EMOJIS** in the UI. Emojis feel amateur.
-   **Set**: Use `Ionicons` (Sharp/Fill variants preferred for active states).
-   **Consistency**:
    -   Use `flash` for branding (⚡).
    -   Use `eye` / `eye-off` for visibility.
    -   Use `play` / `pause` for playback.

## 3. Interaction Principles

### The "Visibility" Metaphor
We switched from a "Keep/Remove" binary to a **"Visible/Invisible"** metaphor, inspired by NLEs (Non-Linear Editors like Premiere/FCP).
-   **Action**: Toggle the **Eye Icon** (👁️).
-   **Visible (Included)**: Eye Open. Text is **White**.
-   **Hidden (Excluded)**: Eye Closed. Text is **Subtle Grey** (`colors.textSecondary`).
-   *Why?* It removes the cognitive load of "Is this button showing status or action?".

### Edge-to-Edge Immersion
Major functional surfaces flush with the screen edges to maximize usable space.
-   **Timeline**: Full width. No margins.
-   **Transcript**: Full width. No margins.
-   **Why?**: On mobile, horizontal space is premium. Margins on the timeline reduce precision.

### Direct Manipulation
-   **Physicality**: Segments have `2px` gaps and `6px` radius. They feel like physical clips.
-   **Snapping**: (Planned) Haptic feedback for scrubbing.

## 4. Component Evolution (Lessons Learned)

### The Timer
*   **Evolution**: `Plain Text` -> `Pill/Badge` -> `Plain Text (Refined)`.
*   **Lesson**: We tried to make the timer look "modern" with a glass-morphism pill. It failed. It was too "loud". We reverted to **Classic Minimalist**: pure text, centered, monospaced.

### The Project List
*   **Evolution**: Emojis -> Vector Icons.
*   **Lesson**: Replacing temporary emojis with `Ionicons` instantly elevated the "Perceived Quality" of the app.

---
*Last Updated: January 19, 2026*
