/**
 * GIGO UI - Main Application
 *
 * Manages video selection, timeline rendering, and interaction with the API.
 */

const API_BASE = "http://localhost:8000";

// State
let state = {
    videoPath: null,
    edlFile: null,
    timeline: null,
    originalTimeline: null, // For reset functionality
    hoveredSegmentIndex: null,
};

// DOM Elements
const videoSelector = document.getElementById("videoSelector");
const videoList = document.getElementById("videoList");
const editor = document.getElementById("editor");
const videoPlayer = document.getElementById("videoPlayer");
const timelineEl = document.getElementById("timeline");
const segmentInfo = document.getElementById("segmentInfo");
const currentTimeEl = document.getElementById("currentTime");
const totalTimeEl = document.getElementById("totalTime");
const resetBtn = document.getElementById("resetBtn");
const renderBtn = document.getElementById("renderBtn");
const statusEl = document.getElementById("status");

// ============================================
// Initialization
// ============================================
async function init() {
    try {
        await loadVideos();
        setupEventListeners();
    } catch (error) {
        showStatus(`Failed to connect to API: ${error.message}`, "error");
    }
}

function setupEventListeners() {
    resetBtn.addEventListener("click", resetTimeline);
    renderBtn.addEventListener("click", renderVideo);

    videoPlayer.addEventListener("timeupdate", () => {
        currentTimeEl.textContent = formatTime(videoPlayer.currentTime);
    });

    videoPlayer.addEventListener("loadedmetadata", () => {
        totalTimeEl.textContent = formatTime(videoPlayer.duration);
    });
}

// ============================================
// API Calls
// ============================================
async function loadVideos() {
    const response = await fetch(`${API_BASE}/videos`);
    if (!response.ok) throw new Error("Failed to load videos");

    const data = await response.json();
    renderVideoList(data.videos);
}

async function loadTimeline(edlFile) {
    const response = await fetch(`${API_BASE}/timeline/${edlFile}`);
    if (!response.ok) throw new Error("Failed to load timeline");

    const data = await response.json();
    return data;
}

async function submitRender(videoPath, timeline) {
    const response = await fetch(`${API_BASE}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            video_path: videoPath,
            timeline: timeline,
        }),
    });

    return await response.json();
}

// ============================================
// Rendering
// ============================================
function renderVideoList(videos) {
    if (videos.length === 0) {
        videoList.innerHTML =
            '<p class="loading">No videos found. Run test_hybrid.py first.</p>';
        return;
    }

    // Filter to only show videos with EDL files
    const videosWithEdl = videos.filter((v) => v.edl_files.length > 0);

    if (videosWithEdl.length === 0) {
        videoList.innerHTML =
            '<p class="loading">No EDL files found. Run test_hybrid.py first.</p>';
        return;
    }

    videoList.innerHTML = videosWithEdl
        .map(
            (video) => `
        <div class="video-card" data-video="${video.path}" data-edl="${video.edl_files[0]}">
            <div>
                <div class="video-card-name">${video.name}</div>
                <div class="video-card-edl">${video.edl_files.length} EDL file(s): ${video.edl_files.join(", ")}</div>
            </div>
            <div class="video-card-action">Select →</div>
        </div>
    `
        )
        .join("");

    // Add click handlers
    document.querySelectorAll(".video-card").forEach((card) => {
        card.addEventListener("click", () => selectVideo(card.dataset.video, card.dataset.edl));
    });
}

function renderTimeline() {
    if (!state.timeline) return;

    const { segments, original_duration } = state.timeline;

    timelineEl.innerHTML = segments
        .map((seg, i) => {
            const widthPercent = ((seg.end - seg.start) / original_duration) * 100;
            const isOverridden = seg.action !== seg.original_action;

            return `
            <div class="timeline-segment ${seg.action} ${isOverridden ? "overridden" : ""}"
                 style="width: ${widthPercent}%"
                 data-index="${i}"
                 title="${seg.reason}">
            </div>
        `;
        })
        .join("");

    // Add segment event listeners
    document.querySelectorAll(".timeline-segment").forEach((segEl) => {
        const index = parseInt(segEl.dataset.index);

        segEl.addEventListener("mouseenter", () => showSegmentInfo(index));
        segEl.addEventListener("mouseleave", () => hideSegmentInfo());
        segEl.addEventListener("click", () => toggleSegment(index));
    });
}

function showSegmentInfo(index) {
    const seg = state.timeline.segments[index];
    state.hoveredSegmentIndex = index;

    const actionLabel = seg.action === "keep" ? "Keep" : "Remove";
    const toggleLabel = seg.action === "keep" ? "Remove instead" : "Keep instead";

    segmentInfo.innerHTML = `
        <div class="segment-info-content">
            <span class="segment-action-badge ${seg.action}">${actionLabel}</span>
            <div class="segment-details">
                <span class="segment-time">${formatTime(seg.start)} → ${formatTime(seg.end)} (${(seg.end - seg.start).toFixed(1)}s)</span>
                <span class="segment-reason">${seg.reason || "No reason provided"}</span>
            </div>
            <button class="segment-toggle-btn" onclick="toggleSegment(${index})">${toggleLabel}</button>
        </div>
    `;
}

function hideSegmentInfo() {
    state.hoveredSegmentIndex = null;
    segmentInfo.innerHTML =
        '<p class="segment-info-placeholder">Hover over a segment to see details</p>';
}

// ============================================
// Actions
// ============================================
async function selectVideo(videoPath, edlFile) {
    try {
        showStatus("Loading timeline...", "info");

        const data = await loadTimeline(edlFile);

        state.videoPath = data.video_path || videoPath;
        state.edlFile = edlFile;
        state.timeline = data.timeline;
        state.originalTimeline = JSON.parse(JSON.stringify(data.timeline));

        // Update UI
        videoSelector.style.display = "none";
        editor.style.display = "flex";

        // Load video through the API streaming endpoint
        // Extract just the filename from the full path
        const videoFilename = state.videoPath.split('/').pop();
        videoPlayer.src = `${API_BASE}/video/${videoFilename}`;

        // Render timeline
        renderTimeline();

        showStatus("Timeline loaded!", "success");
        setTimeout(() => hideStatus(), 2000);
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
    }
}

// Make toggleSegment globally accessible for onclick handler
window.toggleSegment = function (index) {
    const seg = state.timeline.segments[index];
    seg.action = seg.action === "keep" ? "remove" : "keep";

    renderTimeline();

    // Re-show info if segment was hovered
    if (state.hoveredSegmentIndex === index) {
        showSegmentInfo(index);
    }
};

function resetTimeline() {
    state.timeline = JSON.parse(JSON.stringify(state.originalTimeline));
    renderTimeline();
    showStatus("Timeline reset to AI suggestions", "success");
    setTimeout(() => hideStatus(), 2000);
}

async function renderVideo() {
    try {
        renderBtn.disabled = true;
        renderBtn.innerHTML = '<span class="btn-icon">⏳</span> Rendering...';
        showStatus("Starting render...", "info");

        const result = await submitRender(state.videoPath, state.timeline);

        if (result.success) {
            showStatus(`✅ Rendered! Output: ${result.output_path}`, "success");
        } else {
            showStatus(`❌ Render failed: ${result.error}`, "error");
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
    } finally {
        renderBtn.disabled = false;
        renderBtn.innerHTML = '<span class="btn-icon">🎬</span> Render Video';
    }
}

// ============================================
// Utilities
// ============================================
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function showStatus(message, type = "info") {
    statusEl.textContent = message;
    statusEl.className = `status visible ${type}`;
}

function hideStatus() {
    statusEl.className = "status";
}

// ============================================
// Start
// ============================================
init();
