import os
import time
from dataclasses import dataclass
from typing import Generator, Optional


@dataclass
class WalEvent:
    kind: str
    wal_path: str
    size: int
    previous_size: int


class WalMonitor:
    """Polls a SQLite WAL file and detects appends and checkpoint truncations."""

    def __init__(self, wal_path: str, poll_interval: float = 0.5):
        self.wal_path = wal_path
        self.poll_interval = poll_interval
        self._previous_size = 0

    def _current_size(self) -> int:
        if not os.path.exists(self.wal_path):
            return 0
        return os.path.getsize(self.wal_path)

    def poll_once(self) -> Optional[WalEvent]:
        size = self._current_size()
        prev = self._previous_size
        self._previous_size = size
        if size > prev:
            return WalEvent("frames_appended", self.wal_path, size, prev)
        if prev > 0 and size < prev:
            return WalEvent("checkpoint_truncated", self.wal_path, size, prev)
        return None

    def read_new_bytes(self, previous_size: int, current_size: int) -> bytes:
        """Read newly appended WAL bytes between previous_size and current_size."""
        if current_size <= previous_size:
            return b""
        if not os.path.exists(self.wal_path):
            return b""
        with open(self.wal_path, "rb") as wal_file:
            wal_file.seek(previous_size)
            return wal_file.read(current_size - previous_size)

    def watch(self) -> Generator[WalEvent, None, None]:
        while True:
            event = self.poll_once()
            if event is not None:
                yield event
            time.sleep(self.poll_interval)
