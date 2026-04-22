from functools import lru_cache

from app.core.config import Settings


@lru_cache
def get_settings() -> Settings:
    """Return a cached `Settings` instance (suitable for dependency injection later)."""
    return Settings()
