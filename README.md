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
# AI Vid Editor

**Welcome to the AI Vid Editor Project.**

This repository contains a **Multimodal Video Distillery** that transforms typically "bad" footage (rambling, unscripted) into "gold" (tight, viral content) using AI Agents.

---

## 🧭 Context Router: Where to Start?

**STOP.** Do not load every file. Identify your **Role** and load only the **Required Context**.

### 📱 Role: Mobile Developer (React Native / Expo)
You are working on the iOS/Android app.
1.  **Read**: [mobile/README.md](mobile/README.md) (Setup, Tech Stack, Features)
2.  **Read**: [mobile/DESIGN_SYSTEM.md](mobile/DESIGN_SYSTEM.md) (UI Philosophy, Colors, UX)
3.  **Check**: [docs/PROJECT_MEMORY.md](docs/PROJECT_MEMORY.md) (Active tasks, bugs, work in progress)
4.  **Ignore**: `gigo/` (unless editing API calls).

### ⚙️ Role: Backend Engineer (Python / FastAPI)
You are working on the Video Processing Engine, FFmpeg, or AI Pipelines.
1.  **Read**: [gigo/README.md](gigo/README.md) (Architecture, API, Setup)
2.  **Check**: [docs/PROJECT_MEMORY.md](docs/PROJECT_MEMORY.md) (Active tasks, bugs, work in progress)
3.  **Ignore**: `mobile/` (unless changing API contracts).

### 🏗️ Role: Architect / Full Stack / Product
You are changing the system flow, data models, or understanding the "Why".
1.  **Read**: [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) (The Blueprint, Data Flow, Vision)
2.  **Read**: Both `mobile/README.md` and `gigo/README.md`.
3.  **Check**: [docs/PROJECT_MEMORY.md](docs/PROJECT_MEMORY.md).

---

## 📂 Quick Links

| File | Purpose |
|------|---------|
| **[docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)** | **The "Bible".** Full technical specification and product definition. |
| **[docs/PROJECT_MEMORY.md](docs/PROJECT_MEMORY.md)** | **Agent Memory.** Current status, recent changes, and active context. |
| **[mobile/DESIGN_SYSTEM.md](mobile/DESIGN_SYSTEM.md)** | **Visual Language.** "Invisible Precision" philosophy. |
| [gigo/README.md](gigo/README.md) | Backend Documentation. |
| [mobile/README.md](mobile/README.md) | Mobile Documentation. |

---

*Garbage in, viral gold out.*
