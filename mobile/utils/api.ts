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

    // React Native FormData accepts this format for file uploads
    formData.append('file', {
        uri,
        type: 'video/mp4',
        name: filename,
    } as any);

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

/**
 * Get download URL for a rendered video
 */
export function getDownloadUrl(outputPath: string): string {
    return `${API_BASE}/video/${encodeURIComponent(outputPath)}`;
}


// ===========================================
// PROJECT API
// ===========================================

export interface ProjectMetadata {
    id: string;
    name: string;
    status: 'created' | 'analyzing' | 'ready' | 'failed';
    created_at: string;
    duration: number;
    thumbnail_path: string;
    source_video_path: string;
}

export async function listProjects(): Promise<ProjectMetadata[]> {
    const response = await fetch(`${API_BASE}/projects`);
    if (!response.ok) {
        throw new Error(`Failed to list projects: ${response.status}`);
    }
    return response.json();
}

export async function createProject(uri: string, filename: string): Promise<ProjectMetadata> {
    const formData = new FormData();
    // React Native FormData accepts this format for file uploads
    formData.append('file', {
        uri,
        type: 'video/mp4',
        name: filename,
    } as any);

    const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        body: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to create project: ${response.status}`);
    }
    return response.json();
}

export async function getProject(projectId: string): Promise<ProjectMetadata> {
    const response = await fetch(`${API_BASE}/projects/${projectId}`);
    if (!response.ok) throw new Error(`Fetch project failed: ${response.status}`);
    return response.json();
}

export async function getProjectTimeline(projectId: string): Promise<Timeline | null> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/edl`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Fetch EDL failed: ${response.status}`);
    return response.json();
}

export async function updateProjectTimeline(projectId: string, timeline: Timeline): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/edl`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeline),
    });
    if (!response.ok) throw new Error(`Auto-save failed: ${response.status}`);
}

export async function startAnalysis(projectId: string, instructions?: string): Promise<void> {
    const url = `${API_BASE}/projects/${projectId}/analyze${instructions ? `?instructions=${encodeURIComponent(instructions)}` : ''}`;
    const response = await fetch(url, {
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`Failed to start analysis: ${response.status}`);
    }
}
