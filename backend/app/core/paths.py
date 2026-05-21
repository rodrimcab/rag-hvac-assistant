from pathlib import Path

BASE_DATA_DIR = Path("data")

CHROMA_DIR = BASE_DATA_DIR / "chroma_db"
MANUALS_DIR = BASE_DATA_DIR / "manuals"
IMAGES_DIR = BASE_DATA_DIR / "images"

SQLITE_PATH = BASE_DATA_DIR / "conversations.db"


def ensure_data_dirs() -> None:
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    MANUALS_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
