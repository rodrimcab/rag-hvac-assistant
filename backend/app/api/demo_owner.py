import re
from typing import Annotated

from fastapi import Header

_OWNER_MAX_LEN = 64
_OWNER_RE = re.compile(r"^[a-zA-Z0-9._-]+$")


def normalize_demo_owner_id(raw: str | None) -> str:
    s = (raw or "").strip()
    if not s:
        return "default"
    if len(s) > _OWNER_MAX_LEN:
        s = s[:_OWNER_MAX_LEN]
    if not _OWNER_RE.fullmatch(s):
        return "default"
    return s


def get_demo_owner_id(
    x_demo_user: Annotated[str | None, Header(alias="X-Demo-User")] = None,
) -> str:
    """Identifies the demo account for chat persistence (no real auth)."""
    return normalize_demo_owner_id(x_demo_user)
