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

import logging

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from gigo.config import default_config
from gigo.core.models import (
    EditDecisionList,
    InteractiveEDL,
    KeepSegment,
    ProjectMetadata,
    Transcript,
)
from gigo.core.rendering import FFmpegRenderingService
from gigo.core.storage import FileSystemProjectRepository
from gigo.factory import create_orchestrator
from gigo.services.timeline import TimelineService

# Load environment variables
load_dotenv()

logger = logging.getLogger("gigo.api")

app = FastAPI(
    title="GIGO API",
    description="Human-in-the-Loop Video Editing API",
    version="0.1.0",
)

# Initialize persistence layer
repository = FileSystemProjectRepository(default_config.projects_dir)

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


def run_project_analysis(project_id: str):
    """
    Background task to run Orchestrator analysis for a project.
    Updates project status and saves result to storage.
    """
    try:
        project = repository.get_project(project_id)
        if not project:
            return

        logger.info(f"Starting background analysis for project {project_id}")

        # Initialize orchestrator
        orchestrator = create_orchestrator()

        # Run analysis
        source_path = Path(project.source_video_path)
        edl, transcript = orchestrator.process(source_path, project.user_instructions)

        # Save EDL
        repository.save_edl(project.id, edl)

        # Save Transcript
        transcript_path = (
            Path(project.source_video_path).parent / f"{project_id}.transcript.json"
        )
        with open(transcript_path, "w") as f:
            f.write(transcript.model_dump_json())

        # Update status
        repository.update_status(project.id, "ready")
        logger.info(f"Analysis complete for project {project_id}")

    except Exception as e:
        logger.error(f"Analysis failed for project {project_id}: {e}")
        repository.update_status(project_id, "failed")


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
        # Initialize the orchestrator (requires API keys in environment)
        orchestrator = create_orchestrator()

        print(f"[Analyze] Starting analysis of {filename}...")

        # Run full analysis (Whisper + Gemini)
        edl, transcript = orchestrator.process(video_path)

        # Save EDL to JSON file
        edl_filename = f"{video_path.stem}.hybrid.edl.json"
        edl_path = PROJECT_ROOT / edl_filename

        with open(edl_path, "w") as f:
            json.dump(edl.model_dump(), f, indent=2)

        print(f"[Analyze] Saved EDL to {edl_filename}")

        # Save Transcript
        transcript_filename = f"{video_path.stem}.transcript.json"
        transcript_path = PROJECT_ROOT / transcript_filename
        with open(transcript_path, "w") as f:
            f.write(transcript.model_dump_json())

        # Convert to interactive timeline
        interactive_edl = orchestrator.get_interactive_timeline(edl)

        return {
            "success": True,
            "timeline": interactive_edl.model_dump(),
            "video_path": str(video_path),
            "edl_file": edl_filename,
            "transcript_file": transcript_filename,
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

        # Convert to interactive timeline using TimelineService
        timeline_service = TimelineService()
        interactive_edl = timeline_service.get_interactive_timeline(edl)

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


# =============================================================================
# PROJECT ENDPOINTS
# =============================================================================


@app.post("/projects", response_model=ProjectMetadata)
async def create_project(
    background_tasks: BackgroundTasks, file: UploadFile = File(...)
):
    """
    Create a new project from uploaded video.
    Starts analysis in background.
    """
    # Save to temp
    temp_path = PROJECT_ROOT / f"temp_{file.filename}"
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")

        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Create project
        project = repository.create_project_from_file(temp_path)

        # Clean up temp
        temp_path.unlink()

        return project

    except Exception as e:
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/projects/{project_id}/analyze")
async def start_project_analysis(
    project_id: str,
    background_tasks: BackgroundTasks,
    instructions: Optional[str] = None,
):
    """
    Trigger analysis for an existing project.
    Optionally accepts user instructions to guide the AI.
    """
    project = repository.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.status == "analyzing":
        raise HTTPException(status_code=400, detail="Analysis already in progress")

    # Update project with instructions if provided
    if instructions:
        project.user_instructions = instructions
        repository.save_project(project)

    # Set status to analyzing immediately to prevent double-clicks
    repository.update_status(project_id, "analyzing")

    # Trigger background task
    background_tasks.add_task(run_project_analysis, project_id)

    return {"success": True, "status": "analyzing"}


@app.get("/projects", response_model=list[ProjectMetadata])
def list_projects():
    """List all persistent projects."""
    return repository.list_projects()


@app.get("/projects/{project_id}", response_model=ProjectMetadata)
def get_project(project_id: str):
    """Get project metadata."""
    project = repository.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.get("/projects/{project_id}/edl", response_model=InteractiveEDL)
def get_project_edl(project_id: str):
    """Get interactive timeline for a project."""
    edl = repository.get_edl(project_id)
    if not edl:
        raise HTTPException(status_code=404, detail="EDL not found (analysis pending?)")

    # Convert to interactive
    service = TimelineService()
    return service.get_interactive_timeline(edl)


@app.patch("/projects/{project_id}/edl")
def update_project_edl(project_id: str, timeline: InteractiveEDL):
    """Auto-save timeline edits from the mobile app."""
    # Convert back to EditDecisionList (keeps only)
    edl = timeline.to_edit_decision_list()
    try:
        repository.save_edl(project_id, edl)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/projects/{project_id}/thumbnails/{filename}")
def get_project_thumbnail(project_id: str, filename: str):
    """
    Serve thumbnail images for a project.

    Returns JPEG with aggressive caching (thumbnails are immutable).
    """
    project = repository.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    thumbnail_path = Path(project.thumbnail_path) / filename
    if not thumbnail_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return FileResponse(
        thumbnail_path,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)


@app.get("/projects/{project_id}/transcript", response_model=Transcript)
def get_project_transcript(project_id: str):
    """Get transcript for a project."""
    project = repository.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Look for transcript file (legacy naming or new conventions)
    # Check 1: In project dir with project_id
    transcript_path = (
        Path(project.source_video_path).parent / f"{project_id}.transcript.json"
    )

    if not transcript_path.exists():
        # Fallback for manually analyzed files: next to source with .transcript.json
        source_path = Path(project.source_video_path)
        transcript_path = source_path.parent / f"{source_path.stem}.transcript.json"

    if not transcript_path.exists():
        raise HTTPException(status_code=404, detail="Transcript not found")

    try:
        with open(transcript_path) as f:
            return Transcript.model_validate_json(f.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load transcript: {e}")
