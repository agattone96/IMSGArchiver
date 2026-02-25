import os
import tempfile
import unittest
from unittest.mock import patch

from backend.src.mirror_service import MirrorService


class _FakeCursor:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class _FakeConn:
    def __init__(self, rows):
        self.rows = rows

    def execute(self, *_args, **_kwargs):
        return _FakeCursor(self.rows)

    def close(self):
        return None


class MirrorServiceTestCase(unittest.TestCase):
    def setUp(self):
        fd, path = tempfile.mkstemp(suffix=".sqlite")
        os.close(fd)
        self.db_path = path
        self.service = MirrorService(path)

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_enable_disable_and_timeline(self):
        self.assertTrue(self.service.enable_mirror()["enabled"])
        self.service.ingest_message_revision(
            guid="g-1",
            revision_timestamp=1,
            text="hello",
            attributed_body=b"",
            metadata={"k": "v"},
            source_message_row_id=1,
        )
        timeline = self.service.get_message_timeline("g-1")
        self.assertEqual(len(timeline), 1)
        self.assertFalse(self.service.disable_mirror()["enabled"])

    def test_trigger_fallback_sync_ingests_rows(self):
        self.service.enable_mirror()
        rows = [
            {
                "row_id": 100,
                "chat_guid": "chat-1",
                "date": 123,
                "text": "hello",
                "attributedBody": b"body",
                "is_from_me": 1,
                "handle_id": 10,
            }
        ]
        with patch("backend.src.mirror_service.db.get_db_connection", return_value=_FakeConn(rows)):
            result = self.service.trigger_fallback_sync(last_synced_timestamp=0)

        self.assertTrue(result["synced"])
        self.assertEqual(result["synced_count"], 1)
        self.assertEqual(len(self.service.get_message_timeline("chat-1:100")), 1)

    def test_trigger_fallback_sync_requires_enabled_service(self):
        with self.assertRaises(RuntimeError):
            self.service.trigger_fallback_sync(last_synced_timestamp=0)


if __name__ == "__main__":
    unittest.main()
