import os
import sqlite3
import tempfile
import unittest

from backend.src.mirror_repository import MirrorRepository


class MirrorRepositoryTestCase(unittest.TestCase):
    def setUp(self):
        fd, path = tempfile.mkstemp(suffix=".sqlite")
        os.close(fd)
        self.db_path = path
        self.repo = MirrorRepository(path)

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_atomic_revision_mirror_and_audit(self):
        result = self.repo.upsert_message_revision(
            guid="m-1",
            revision_timestamp=100,
            text="hello",
            attributed_body=b"raw",
            metadata={"source": "test"},
            source_message_row_id=1,
        )
        self.assertEqual(result["guid"], "m-1")

        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        revision_count = cur.execute("SELECT COUNT(*) FROM message_revisions").fetchone()[0]
        mirror_count = cur.execute("SELECT COUNT(*) FROM message_mirror").fetchone()[0]
        audit_count = cur.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0]
        conn.close()

        self.assertEqual(revision_count, 1)
        self.assertEqual(mirror_count, 1)
        self.assertEqual(audit_count, 1)

    def test_idempotency_replayed_wal_frames(self):
        kwargs = dict(
            guid="m-2",
            revision_timestamp=200,
            text="same text",
            attributed_body=b"raw",
            metadata={"x": 1},
            source_message_row_id=2,
        )
        self.repo.upsert_message_revision(**kwargs)
        self.repo.upsert_message_revision(**kwargs)

        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        revision_count = cur.execute("SELECT COUNT(*) FROM message_revisions WHERE guid = 'm-2'").fetchone()[0]
        audit_count = cur.execute("SELECT COUNT(*) FROM audit_log WHERE guid = 'm-2'").fetchone()[0]
        conn.close()

        self.assertEqual(revision_count, 1)
        self.assertEqual(audit_count, 1)


if __name__ == "__main__":
    unittest.main()
