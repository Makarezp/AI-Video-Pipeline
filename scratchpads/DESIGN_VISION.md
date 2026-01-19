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
-   **Dark Mode Only**: The app is a dark room.
-   **Ghost vs. Solid**:
    -   **Secondary Actions** are "Ghost" (text only, no bg). They don't steal focus.
    -   **Primary Actions** use color sparingly.
-   **Semantic Colors**:
    -   **Gold/Yellow**: AI Highlight/Keep. (Verified quality).
    -   **Red/Grey**: Exclude/Cut. (Noise).

## 3. Component Evolution (Lessons Learned)

### The Timeline
*   **Physicality**: Segments are not just colored rects. They have `2px` gaps and `6px` radius. They feel like physical clips you can move.
*   **Interaction**: We prefer "Switching state" (Include/Exclude) over "Destruction" (Delete). The editing is non-destructive.

### The Timer
*   **Evolution**: `Plain Text` -> `Pill/Badge` -> `Plain Text (Refined)`.
*   **Lesson**: We tried to make the timer look "modern" with a glass-morphism pill. It failed. It was too "loud". We reverted to **Classic Minimalist**: pure text, centered, monospaced. It respects the pro-tool lineage (Premiere/FCP).

### Context & Reasoning
*   **Icons > Emojis**: Emojis feel amateur in a tool. We use clean vector icons (`Ionicons`).
    -   ✨ for Keep.
    -   ✂️ for Exclude.
*   **Show, Don't Tell**: Don't title a section "Why AI thinks this". Just show the reasoning text with a relevant icon.

## 4. Interaction Principles
*   **Direct Manipulation**: If it looks touchable, it must be touchable.
*   **Stability**: UI elements (like text boxes) have `minHeight` to prevent layout jumps when content changes.
*   **Haptics**: (To be implemented) Mechanical feedback for mechanical actions (snapping, cutting).

---
*Last Updated: January 2026*
