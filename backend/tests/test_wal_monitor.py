import os
import tempfile
import unittest

from backend.src.wal_monitor import WalMonitor


class WalMonitorTestCase(unittest.TestCase):
    def test_detects_append_and_truncate_and_reads_bytes(self):
        with tempfile.TemporaryDirectory() as td:
            wal_path = os.path.join(td, "chat.db-wal")
            monitor = WalMonitor(wal_path)

            self.assertIsNone(monitor.poll_once())

            with open(wal_path, "wb") as f:
                f.write(b"abcdef")
            event = monitor.poll_once()
            self.assertEqual(event.kind, "frames_appended")
            new_bytes = monitor.read_new_bytes(event.previous_size, event.size)
            self.assertEqual(new_bytes, b"abcdef")

            with open(wal_path, "wb") as f:
                f.write(b"ab")
            truncate_event = monitor.poll_once()
            self.assertEqual(truncate_event.kind, "checkpoint_truncated")


if __name__ == "__main__":
    unittest.main()
