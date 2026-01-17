"""
GIGO API - FastAPI endpoints for Human-in-the-Loop editing.

Endpoints:
- GET /timeline/{edl_file} - Load existing EDL as interactive timeline
- GET /video/{filename} - Stream video file to browser
- POST /render - Render video from modified timeline
"""

import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from gigo.core.models import EditDecisionList, InteractiveEDL, KeepSegment
from gigo.core.rendering import FFmpegRenderingService
from gigo.core.hybrid import HybridVideoService

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
