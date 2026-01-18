import shutil
import logging
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
from typing import Literal, List, Optional

from gigo.core.models import ProjectMetadata, EditDecisionList
from gigo.adapters.ffmpeg import FFmpegVideoProcessor

logger = logging.getLogger("gigo.storage")


class FileSystemProjectRepository:
    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.base_path.mkdir(parents=True, exist_ok=True)
        # Ensure base path is absolute
        self.base_path = self.base_path.resolve()
        logger.info(f"Initialized project storage at {self.base_path}")

    def create_project_from_file(self, source_path: Path) -> ProjectMetadata:
        """Create a new project from an existing video file."""
        project_id = str(uuid4())
        project_dir = self.base_path / project_id
        project_dir.mkdir(exist_ok=True)

        # Copy source video to project dir (preserve original extension)
        dest_video_path = project_dir / f"source{source_path.suffix}"
        shutil.copy2(source_path, dest_video_path)

        # Extract video metadata
        ffmpeg = FFmpegVideoProcessor()
        duration = ffmpeg.get_duration(dest_video_path)
        logger.info(f"Video duration: {duration:.2f}s")

        # Generate thumbnails synchronously
        thumbnails_dir = project_dir / "thumbnails"
        thumbnail_count = ffmpeg.extract_thumbnails(dest_video_path, thumbnails_dir)
        logger.info(f"Generated {thumbnail_count} thumbnails for project {project_id}")

        # Initialize metadata
        metadata = ProjectMetadata(
            id=project_id,
            name=source_path.stem,
            status="created",
            created_at=datetime.now(timezone.utc).isoformat(),
            source_video_path=str(dest_video_path),
            thumbnail_path=str(thumbnails_dir),
            thumbnail_count=thumbnail_count,
            duration=duration,
        )
        self._save_metadata(project_dir, metadata)

        return metadata

    def save_project(self, project: ProjectMetadata) -> None:
        """Save project metadata."""
        project_dir = self.base_path / project.id
        if not project_dir.exists():
            raise FileNotFoundError(f"Project {project.id} not found")
        self._save_metadata(project_dir, project)

    def get_project(self, project_id: str) -> Optional[ProjectMetadata]:
        """Get project metadata by ID."""
        project_dir = self.base_path / project_id
        if not project_dir.exists():
            return None
        return self._load_metadata(project_dir)

    def list_projects(self) -> List[ProjectMetadata]:
        """List all projects sorted by creation date (newest first)."""
        projects = []
        if not self.base_path.exists():
            return []

        for project_dir in self.base_path.iterdir():
            if project_dir.is_dir() and (project_dir / "project.json").exists():
                try:
                    projects.append(self._load_metadata(project_dir))
                except Exception as e:
                    logger.error(f"Failed to load project {project_dir.name}: {e}")

        projects.sort(key=lambda x: x.created_at, reverse=True)
        return projects

    def save_edl(self, project_id: str, edl: EditDecisionList) -> None:
        """Save EditDecisionList to project storage."""
        project_dir = self.base_path / project_id
        if not project_dir.exists():
            raise FileNotFoundError(f"Project {project_id} not found")

        with open(project_dir / "edl.json", "w") as f:
            f.write(edl.model_dump_json(indent=2))

    def get_edl(self, project_id: str) -> Optional[EditDecisionList]:
        """Load EditDecisionList from project storage."""
        project_dir = self.base_path / project_id
        edl_path = project_dir / "edl.json"

        if not edl_path.exists():
            return None

        with open(edl_path, "r") as f:
            return EditDecisionList.model_validate_json(f.read())

    def update_status(
        self,
        project_id: str,
        status: Literal["created", "analyzing", "ready", "failed"],
    ) -> None:
        """Update project status."""
        project_dir = self.base_path / project_id
        if not project_dir.exists():
            return

        try:
            meta = self._load_metadata(project_dir)
            meta.status = status
            self._save_metadata(project_dir, meta)
        except Exception as e:
            logger.error(f"Failed to update status for {project_id}: {e}")

    def delete_project(self, project_id: str) -> None:
        """Delete project and all its files."""
        project_dir = self.base_path / project_id
        if project_dir.exists():
            shutil.rmtree(project_dir)

    def _save_metadata(self, project_dir: Path, meta: ProjectMetadata):
        with open(project_dir / "project.json", "w") as f:
            f.write(meta.model_dump_json(indent=2))

    def _load_metadata(self, project_dir: Path) -> ProjectMetadata:
        with open(project_dir / "project.json", "r") as f:
            return ProjectMetadata.model_validate_json(f.read())
