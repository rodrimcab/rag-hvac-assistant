"""UTC ISO-8601 strings for JSON APIs (unambiguous for browsers)."""

from datetime import datetime, timezone


def datetime_to_utc_iso_z(dt: datetime) -> str:
    """Serialize a datetime as UTC with ``Z`` suffix (RFC 3339 instant)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    u = dt.astimezone(timezone.utc)
    return u.isoformat().replace("+00:00", "Z")
