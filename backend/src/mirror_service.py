import os
from typing import Any, Dict, List, Optional

from .mirror_repository import MirrorRepository
from .wal_monitor import WalMonitor


class MirrorService:
    def __init__(self, mirror_db_path: str, wal_path: Optional[str] = None):
        self.mirror_db_path = mirror_db_path
        self.repository = MirrorRepository(mirror_db_path)
        self.wal_path = wal_path
        self.monitor = WalMonitor(wal_path) if wal_path else None
        self.enabled = False

    def enable_mirror(self) -> Dict[str, Any]:
        self.enabled = True
        return {"enabled": self.enabled, "mirror_db_path": self.mirror_db_path}

    def disable_mirror(self) -> Dict[str, Any]:
        self.enabled = False
        return {"enabled": self.enabled, "mirror_db_path": self.mirror_db_path}

    def trigger_fallback_sync(self, last_synced_timestamp: int) -> Dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("Mirror service is disabled")

        truncation_detected = False
        if self.monitor:
            event = self.monitor.poll_once()
            truncation_detected = bool(event and event.kind == "checkpoint_truncated")

        return {
            "synced": True,
            "last_synced_timestamp": last_synced_timestamp,
            "checkpoint_truncation_detected": truncation_detected,
            "mirror_db_exists": os.path.exists(self.mirror_db_path),
        }

    def ingest_message_revision(
        self,
        guid: str,
        revision_timestamp: int,
        text: Optional[str],
        attributed_body: Any,
        metadata: Optional[Dict[str, Any]],
        source_message_row_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("Mirror service is disabled")
        return self.repository.upsert_message_revision(
            guid=guid,
            revision_timestamp=revision_timestamp,
            text=text,
            attributed_body=attributed_body,
            metadata=metadata,
            source_message_row_id=source_message_row_id,
        )

    def get_message_timeline(self, guid: str) -> List[Dict[str, Any]]:
        return self.repository.get_message_timeline(guid)
