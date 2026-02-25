import hashlib
import json
from typing import Any, Dict, Optional


def _normalize_component(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.hex()
    if isinstance(value, (dict, list, tuple)):
        return json.dumps(value, sort_keys=True, separators=(",", ":"))
    return str(value)


def compute_fingerprint(text: Optional[str], attributed_body: Any, metadata: Optional[Dict[str, Any]]) -> str:
    """SHA-256 over text + attributedBody + metadata, returned as lowercase hex."""
    payload = "|".join(
        [
            _normalize_component(text),
            _normalize_component(attributed_body),
            _normalize_component(metadata or {}),
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest().lower()


def detect_edit(previous_fingerprint: Optional[str], next_fingerprint: str) -> bool:
    if not previous_fingerprint:
        return False
    return previous_fingerprint.lower() != next_fingerprint.lower()
