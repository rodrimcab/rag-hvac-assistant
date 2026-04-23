from app.core.config import Settings
from app.schemas.document import ManualDocumentInfo


class DocumentService:
    """Read-only discovery of PDF manuals stored on disk."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def list_manual_pdfs(self) -> list[ManualDocumentInfo]:
        path = self._settings.manuals_path
        if not path.is_dir():
            return []
        return [
            ManualDocumentInfo(
                file_name=p.name,
                size_bytes=p.stat().st_size,
                absolute_path=str(p.resolve()),
            )
            for p in sorted(path.glob("*.pdf"))
        ]
