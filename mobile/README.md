# GIGO Mobile Client

The mobile companion app for **Garbage In, Gold Out**, built with Expo and React Native. This app allows you to upload rambling "talking head" videos, have them analyzed by AI, and tight-track the edits using a custom timeline editor.

## 🚀 Features

- **Project Library**: A persistent dashboard to manage and resume multiple editing sessions.
- **Background AI Pipeline**: 
  - **Upload & Calibrate**: Upload your video and instruct the AI on what to focus on (e.g., "Remove redundancy," "Keep the funny parts").
  - **Deferred Analysis**: Analysis starts only when you say "Start Magic," allowing you to review the raw video first.
- **Auto-Save Editor**: 
  - **Persistent State**: Changes are automatically synced to the backend as you edit.
  - **Visual Feedback**: Green segments for "keep", red for "remove".
  - **Interactive**: Tap any segment to toggle its status before rendering.
  - **Integrated Player**: Custom `expo-av` player synced with the scrubber timeline.
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
Then drag `output.mp4` into the simulator.
