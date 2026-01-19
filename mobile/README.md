# GIGO Mobile Client

The mobile companion app for **Garbage In, Gold Out**, built with Expo and React Native. This app allows you to upload rambling "talking head" videos, have them analyzed by AI, and tight-track the edits using a custom timeline editor.

## 🚀 Features

- **Project Library**: A persistent dashboard to manage and resume multiple editing sessions.
- **Background AI Pipeline**: 
  - **Upload & Calibrate**: Upload your video and instruct the AI on what to focus on (e.g., "Remove redundancy," "Keep the funny parts").
  - **Deferred Analysis**: Analysis starts only when you say "Start Magic," allowing you to review the raw video first.
- **Auto-Save Editor**: 
  - **Persistent State**: Changes are automatically synced to the backend as you edit.
  - **Thumbnail Filmstrip**: Visual frame-by-frame preview generated at 1 FPS for precise scrubbing.
  - **Visual Feedback**: Green/red border frames for "keep"/"remove" segments.
  - **Interactive**: Tap any segment to toggle its status before rendering.
  - **Integrated Player**: Custom `expo-av` player synced with the scrubber timeline.
- **Bi-Directional Transcript**:
  - **Auto-Scroll**: Transcript automatically scrolls to follow the video playback ("Teleprompter" mode).
  - **Sync-Seek**: Scrubbing the transcript seeks the video to the exact sentence.
- **One-Tap Export**: Render final localized videos on the backend and save directly to your device gallery.

## 🛠 Tech Stack

- **Framework**: [Expo SDK 52](https://expo.dev/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Video**: `expo-av`
- **Media**: `expo-image-picker`
- **Styling**: Standard React Native `StyleSheet` (Dark Theme)

## 📦 Installation

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## 🏃‍♂️ Running the App

### 1. Start the Backend
The mobile app requires the GIGO API to be running.
```bash
# In the project root
uvicorn gigo.api:app --host 0.0.0.0 --port 8000
```

### 2. Start Expo
```bash
cd mobile
npx expo start
```

- Press **`i`** for iOS Simulator.
- Press **`a`** for Android Emulator.
- Scan the QR code with the **Expo Go** app to run on a physical device.

## 📡 Connecting to Backend

### Local Development (Simulator)
By default, `mobile/utils/api.ts` points to `http://localhost:8000`. This works out of the box for the iOS Simulator.

### Physical Device Testing
To test on a physical phone, the app needs to reach your computer's local IP address:
1. Find your local IP (e.g., `192.168.1.15`).
2. Update `API_BASE` in `mobile/utils/api.ts`:
   ```typescript
   const API_BASE = 'http://192.168.1.15:8000';
   ```
3. Ensure your phone and computer are on the same Wi-Fi network.

## 📂 Project Structure

```bash
mobile/
├── app/                  # Expo Router screens
│   ├── _layout.tsx       # Root layout & theme (Dark Mode)
│   ├── index.tsx         # Project Dashboard (Library list)
│   └── editor.tsx        # Project-aware timeline editor
├── components/           # UI Components
│   └── Timeline.tsx      # Custom Interactive Timeline
├── utils/                # Logic & Helpers
│   └── api.ts            # backend API integration
└── assets/               # Icons & Splash screens
```

## 🧪 Testing on Simulator
If you get a `PHPhotosErrorDomain` error when dragging videos to the simulator, convert them to a compatible format first:
```bash
ffmpeg -i input.mp4 -vf "scale=1280:-2" -c:v libx264 -pix_fmt yuv420p output.mp4
```

## 🤖 Automated Agent Verification

The project is configured with an **MCP Server** for the iOS Simulator. This allows the AI agent to:
1. Connect to the running simulator.
2. Inspect the UI hierarchy.
3. Perform touch interactions (swipe, tap).
4. Verify bugs and fixes autonomously (e.g., verifying scroll bounds).

**Prerequisites**:
- `idb-companion` (brew) and `fb-idb` (pip) installed.
- Agent configured with `ios-simulator-mcp`.
