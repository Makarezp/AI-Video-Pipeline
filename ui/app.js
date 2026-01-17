/**
 * GIGO UI - Main Application
 *
 * Full flow: Upload → Analyze → Review → Render → View
 */

const API_BASE = "http://localhost:8000";

// State
let state = {
    videoPath: null,
    edlFile: null,
    timeline: null,
    originalTimeline: null,
    hoveredSegmentIndex: null,
    outputPath: null,
};

// DOM Elements
const uploadSection = document.getElementById("uploadSection");
const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const uploadProgress = document.getElementById("uploadProgress");
const progressFill = document.getElementById("progressFill");
const uploadStatus = document.getElementById("uploadStatus");

const videoSelector = document.getElementById("videoSelector");
const videoList = document.getElementById("videoList");

const editor = document.getElementById("editor");
const videoPlayer = document.getElementById("videoPlayer");
const timelineEl = document.getElementById("timeline");
const playhead = document.getElementById("playhead");
const segmentInfo = document.getElementById("segmentInfo");
const currentTimeEl = document.getElementById("currentTime");
const totalTimeEl = document.getElementById("totalTime");
const backBtn = document.getElementById("backBtn");
const resetBtn = document.getElementById("resetBtn");
const renderBtn = document.getElementById("renderBtn");

const outputSection = document.getElementById("outputSection");
const outputPlayer = document.getElementById("outputPlayer");
const editAgainBtn = document.getElementById("editAgainBtn");
const downloadBtn = document.getElementById("downloadBtn");

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
    // Upload handlers
    uploadZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleFileSelect);
    uploadZone.addEventListener("dragover", handleDragOver);
    uploadZone.addEventListener("dragleave", handleDragLeave);
    uploadZone.addEventListener("drop", handleDrop);

    // Editor handlers
    backBtn.addEventListener("click", goBack);
    resetBtn.addEventListener("click", resetTimeline);
    renderBtn.addEventListener("click", renderVideo);

    // Output handlers
    editAgainBtn.addEventListener("click", goBackToEditor);

    // Video player
    videoPlayer.addEventListener("timeupdate", () => {
        currentTimeEl.textContent = formatTime(videoPlayer.currentTime);
        updatePlayhead();
    });
    videoPlayer.addEventListener("loadedmetadata", () => {
        totalTimeEl.textContent = formatTime(videoPlayer.duration);
    });
}

function updatePlayhead() {
    if (!state.timeline || !videoPlayer.duration) return;

    const progress = videoPlayer.currentTime / state.timeline.original_duration;
    const percentage = Math.min(progress * 100, 100);
    playhead.style.left = `${percentage}%`;
}

// ============================================
// Upload Handlers
// ============================================
function handleDragOver(e) {
    e.preventDefault();
    uploadZone.classList.add("dragover");
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
}

function handleDrop(e) {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

async function handleFile(file) {
    // Validate file type
    const validTypes = [".mp4", ".mov", ".webm"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!validTypes.includes(ext)) {
        showStatus(`Invalid file type. Allowed: ${validTypes.join(", ")}`, "error");
        return;
    }

    try {
        // Show progress
        uploadZone.style.display = "none";
        uploadProgress.style.display = "block";
        uploadStatus.textContent = `Uploading ${file.name}...`;
        progressFill.style.width = "0%";

        // Upload file
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch(`${API_BASE}/upload`, {
            method: "POST",
            body: formData,
        });

        if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            throw new Error(error.detail || "Upload failed");
        }

        const uploadData = await uploadResponse.json();
        progressFill.style.width = "50%";
        uploadStatus.textContent = `Analyzing with AI... (this may take 1-2 minutes)`;
        progressFill.classList.add("indeterminate");

        // Analyze video
        const analyzeResponse = await fetch(
            `${API_BASE}/analyze/${uploadData.filename}`,
            { method: "POST" }
        );

        if (!analyzeResponse.ok) {
            const error = await analyzeResponse.json();
            throw new Error(error.detail || "Analysis failed");
        }

        const analyzeData = await analyzeResponse.json();
        progressFill.classList.remove("indeterminate");
        progressFill.style.width = "100%";

        // Show editor with timeline
        state.videoPath = analyzeData.video_path;
        state.edlFile = analyzeData.edl_file;
        state.timeline = analyzeData.timeline;
        state.originalTimeline = JSON.parse(JSON.stringify(analyzeData.timeline));

        showEditor();
        showStatus(
            `Analysis complete! ${analyzeData.stats.segments_kept} segments kept (${Math.round(analyzeData.stats.compression_ratio * 100)}% retention)`,
            "success"
        );
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
        uploadZone.style.display = "block";
        uploadProgress.style.display = "none";
    }
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
    // Filter to only show videos with EDL files
    const videosWithEdl = videos.filter((v) => v.edl_files.length > 0);

    if (videosWithEdl.length === 0) {
        videoList.innerHTML =
            '<p class="loading">No analyzed videos yet. Upload one above!</p>';
        return;
    }

    videoList.innerHTML = videosWithEdl
        .map(
            (video) => `
        <div class="video-card" data-video="${video.path}" data-edl="${video.edl_files[0]}">
            <div>
                <div class="video-card-name">${video.name}</div>
                <div class="video-card-edl">${video.edl_files.length} EDL file(s)</div>
            </div>
            <div class="video-card-action">Open →</div>
        </div>
    `
        )
        .join("");

    document.querySelectorAll(".video-card").forEach((card) => {
        card.addEventListener("click", () =>
            selectVideo(card.dataset.video, card.dataset.edl)
        );
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
// Navigation
// ============================================
function showEditor() {
    uploadSection.style.display = "none";
    videoSelector.style.display = "none";
    editor.style.display = "flex";
    outputSection.style.display = "none";

    const videoFilename = state.videoPath.split("/").pop();
    videoPlayer.src = `${API_BASE}/video/${videoFilename}`;
    renderTimeline();
}

function goBack() {
    editor.style.display = "none";
    outputSection.style.display = "none";
    uploadSection.style.display = "block";
    videoSelector.style.display = "block";
    uploadZone.style.display = "block";
    uploadProgress.style.display = "none";
    loadVideos();
}

function goBackToEditor() {
    outputSection.style.display = "none";
    editor.style.display = "flex";
}

function showOutput(outputPath) {
    state.outputPath = outputPath;
    editor.style.display = "none";
    outputSection.style.display = "flex";

    const outputFilename = outputPath.split("/").pop();
    const videoUrl = `${API_BASE}/video/${outputFilename}`;
    outputPlayer.src = videoUrl;
    downloadBtn.href = videoUrl;
    downloadBtn.download = outputFilename;
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

        showEditor();
        showStatus("Timeline loaded!", "success");
        setTimeout(() => hideStatus(), 2000);
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
    }
}

window.toggleSegment = function (index) {
    const seg = state.timeline.segments[index];
    seg.action = seg.action === "keep" ? "remove" : "keep";

    renderTimeline();

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
            showStatus(`✅ Rendered successfully!`, "success");
            showOutput(result.output_path);
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
