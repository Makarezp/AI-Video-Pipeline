"""
GIGO API - FastAPI endpoints for Human-in-the-Loop editing.

Endpoints:
- POST /upload - Upload a video file
- POST /analyze/{filename} - Run Whisper + Gemini analysis
- GET /timeline/{edl_file} - Load existing EDL as interactive timeline
- GET /video/{filename} - Stream video file to browser
- POST /render - Render video from modified timeline
"""

import json
import shutil
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from gigo.core.models import EditDecisionList, InteractiveEDL, KeepSegment
from gigo.core.rendering import FFmpegRenderingService
from gigo.core.hybrid import HybridVideoService

# Load environment variables
load_dotenv()

app = FastAPI(
    title="GIGO API",
    description="Human-in-the-Loop Video Editing API",
    version="0.1.0",
)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Project root for finding video/EDL files
PROJECT_ROOT = Path(__file__).parent.parent


class RenderRequest(BaseModel):
    """Request body for /render endpoint."""

    video_path: str
    timeline: InteractiveEDL


class RenderResponse(BaseModel):
    """Response from /render endpoint."""

    success: bool
    output_path: Optional[str] = None
    error: Optional[str] = None


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "GIGO API"}


@app.get("/videos")
def list_videos():
    """List available video files and their EDLs."""
    videos = []
    for ext in ["*.MOV", "*.mp4", "*.mov", "*.MP4"]:
        for video_file in PROJECT_ROOT.glob(ext):
            # Find matching EDL files
            edl_files = list(PROJECT_ROOT.glob(f"{video_file.stem}*.edl.json"))
            videos.append(
                {
                    "name": video_file.name,
                    "path": str(video_file),
                    "edl_files": [f.name for f in edl_files],
                }
            )
    return {"videos": videos}


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Upload a video file.

    The file is saved to the project root directory.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Validate file type
    allowed_extensions = [".mov", ".mp4", ".webm"]
    suffix = Path(file.filename).suffix.lower()
    if suffix not in allowed_extensions:
        raise HTTPException(
            status_code=400, detail=f"Invalid file type. Allowed: {allowed_extensions}"
        )

    # Save file to project root
    destination = PROJECT_ROOT / file.filename

    try:
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {
            "success": True,
            "filename": file.filename,
            "path": str(destination),
            "size_mb": destination.stat().st_size / 1024 / 1024,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")


@app.post("/analyze/{filename}")
def analyze_video(filename: str):
    """
    Run Whisper + Gemini analysis on an uploaded video.

    This is a synchronous operation that may take 1-3 minutes.
    Returns an InteractiveEDL for the timeline UI.
    """
    video_path = PROJECT_ROOT / filename

    if not video_path.exists():
        raise HTTPException(status_code=404, detail=f"Video not found: {filename}")

    try:
        # Initialize the hybrid service (requires API keys in environment)
        service = HybridVideoService()

        print(f"[Analyze] Starting analysis of {filename}...")

        # Run full analysis (Whisper + Gemini)
        edl = service.analyze_video(video_path)

        # Save EDL to JSON file
        edl_filename = f"{video_path.stem}.hybrid.edl.json"
        edl_path = PROJECT_ROOT / edl_filename

        with open(edl_path, "w") as f:
            json.dump(edl.model_dump(), f, indent=2)

        print(f"[Analyze] Saved EDL to {edl_filename}")

        # Convert to interactive timeline
        interactive_edl = service.get_interactive_timeline(edl)

        return {
            "success": True,
            "timeline": interactive_edl.model_dump(),
            "video_path": str(video_path),
            "edl_file": edl_filename,
            "stats": {
                "original_duration": edl.original_duration,
                "final_duration": edl.final_duration,
                "compression_ratio": edl.compression_ratio,
                "segments_kept": len(edl.keep_segments),
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@app.get("/video/{filename:path}")
def stream_video(filename: str):
    """
    Stream a video file to the browser.

    This allows the HTML5 video player to load local video files.
    """
    video_path = PROJECT_ROOT / filename

    # Also check if filename is a full path
    if not video_path.exists():
        video_path = Path(filename)

    if not video_path.exists():
        raise HTTPException(status_code=404, detail=f"Video not found: {filename}")

    # Determine MIME type
    suffix = video_path.suffix.lower()
    mime_types = {
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".webm": "video/webm",
    }
    media_type = mime_types.get(suffix, "video/mp4")

    return FileResponse(
        video_path,
        media_type=media_type,
        filename=video_path.name,
    )


@app.get("/timeline/{edl_filename}")
def get_timeline(edl_filename: str):
    """
    Load an existing EDL JSON file and return as InteractiveEDL.

    The edl_filename should be just the filename (e.g., "IMG_1836_1min.hybrid.edl.json").
    """
    edl_path = PROJECT_ROOT / edl_filename

    if not edl_path.exists():
        raise HTTPException(
            status_code=404, detail=f"EDL file not found: {edl_filename}"
        )

    try:
        with open(edl_path) as f:
            edl_data = json.load(f)

        # Parse into EditDecisionList
        edl = EditDecisionList(
            keep_segments=[
                KeepSegment(start=s["start"], end=s["end"], reason=s.get("reason", ""))
                for s in edl_data["keep_segments"]
            ],
            original_duration=edl_data["original_duration"],
        )

        # Convert to interactive timeline
        # Create a minimal hybrid service just for the conversion
        # (We don't need API keys for this operation)
        service = object.__new__(HybridVideoService)
        interactive_edl = service.get_interactive_timeline(edl)

        # Also find the corresponding video file
        video_stem = edl_filename.split(".")[0]  # e.g., "IMG_1836_1min"
        video_candidates = list(PROJECT_ROOT.glob(f"{video_stem}.*"))
        video_candidates = [
            v for v in video_candidates if v.suffix.lower() in [".mov", ".mp4"]
        ]
        video_path = str(video_candidates[0]) if video_candidates else None

        return {
            "timeline": interactive_edl.model_dump(),
            "video_path": video_path,
            "edl_file": edl_filename,
        }

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/render", response_model=RenderResponse)
def render_video(request: RenderRequest):
    """
    Render video from a (potentially modified) InteractiveEDL.

    The frontend sends back the timeline with any user overrides applied.
    """
    video_path = Path(request.video_path)

    if not video_path.exists():
        return RenderResponse(success=False, error=f"Video not found: {video_path}")

    try:
        # Convert InteractiveEDL back to EditDecisionList
        edl = request.timeline.to_edit_decision_list()

        if not edl.keep_segments:
            return RenderResponse(success=False, error="No segments marked as 'keep'")

        # Render
        renderer = FFmpegRenderingService(zoom_scale=1.15)
        output_path = renderer.render(video_path, edl)

        return RenderResponse(success=True, output_path=str(output_path))

    except Exception as e:
        return RenderResponse(success=False, error=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
