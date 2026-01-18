/**
 * API utilities for GIGO backend
 */

// For local development, use your Mac's IP address
// iOS Simulator: localhost works
// Physical device: use your Mac's local IP (e.g., 192.168.1.x)
// Android emulator: use 10.0.2.2

const API_BASE = __DEV__
    ? 'http://localhost:8000'  // Change to your IP for physical device
    : 'https://api.gigo.app';  // Production URL

export interface TimelineSegment {
    start: number;
    end: number;
    action: 'keep' | 'remove';
    reason: string;
    original_action: string;
}

export interface Timeline {
    segments: TimelineSegment[];
    original_duration: number;
}

export interface AnalyzeResponse {
    success: boolean;
    timeline: Timeline;
    video_path: string;
    edl_file: string;
    stats: {
        original_duration: number;
        final_duration: number;
        compression_ratio: number;
        segments_kept: number;
    };
}

export interface RenderResponse {
    success: boolean;
    output_path?: string;
    error?: string;
}

/**
 * Upload a video file to the server
 */
export async function uploadVideo(uri: string, filename: string): Promise<{ success: boolean; filename: string; path: string }> {
    const formData = new FormData();

    // @ts-ignore - React Native FormData accepts this format
    formData.append('file', {
        uri,
        type: 'video/mp4',
        name: filename,
    });

    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Analyze a video (Whisper + Gemini)
 */
export async function analyzeVideo(filename: string): Promise<AnalyzeResponse> {
    const response = await fetch(`${API_BASE}/analyze/${filename}`, {
        method: 'POST',
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Analysis failed: ${error}`);
    }

    return response.json();
}

/**
 * Get video stream URL
 */
export function getVideoUrl(filename: string): string {
    return `${API_BASE}/video/${encodeURIComponent(filename)}`;
}

/**
 * Render video from timeline
 */
export async function renderVideo(videoPath: string, timeline: Timeline): Promise<RenderResponse> {
    const response = await fetch(`${API_BASE}/render`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            video_path: videoPath,
            timeline,
        }),
    });

    if (!response.ok) {
        throw new Error(`Render failed: ${response.status}`);
    }

    return response.json();
}
