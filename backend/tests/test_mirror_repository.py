import os
import json
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

    def test_attachment_upsert_and_dedup_lookup(self):
        self.repo.upsert_attachment(
            guid="a-1",
            file_hash="hash-1",
            original_path="/src/a.png",
            archive_path="/archive/a.png",
            lifecycle_state="active",
        )
        duplicate = self.repo.find_attachment_by_hash("hash-1")
        self.assertIsNotNone(duplicate)
        self.assertEqual(duplicate["guid"], "a-1")
        self.assertEqual(duplicate["archive_path"], "/archive/a.png")

    def test_attachment_lifecycle_state_changes_audited(self):
        self.repo.upsert_attachment(
            guid="a-2",
            file_hash="hash-2",
            original_path="/src/b.png",
            archive_path="/archive/b.png",
            lifecycle_state="active",
        )

        self.assertTrue(self.repo.mark_attachment_missing_source("a-2"))
        self.assertTrue(self.repo.mark_attachment_orphaned("a-2"))

        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        state = cur.execute(
            "SELECT lifecycle_state FROM attachment_mirror WHERE guid = 'a-2'"
        ).fetchone()[0]
        rows = cur.execute(
            "SELECT event_type, payload_json FROM audit_log WHERE guid = 'a-2' ORDER BY id"
        ).fetchall()
        conn.close()

        self.assertEqual(state, "orphaned")
        self.assertEqual([row[0] for row in rows], [
            "ATTACHMENT_STATE_CHANGE",
            "ATTACHMENT_STATE_CHANGE",
            "ATTACHMENT_STATE_CHANGE",
        ])
        payload = json.loads(rows[-1][1])
        self.assertEqual(payload["from"], "missing_source")
        self.assertEqual(payload["to"], "orphaned")

    def test_migrates_legacy_attachment_mirror_before_index_creation(self):
        fd, legacy_path = tempfile.mkstemp(suffix=".sqlite")
        os.close(fd)
        try:
            conn = sqlite3.connect(legacy_path)
            conn.executescript(
                """
                CREATE TABLE attachment_mirror (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  guid TEXT NOT NULL,
                  message_guid TEXT NOT NULL,
                  transfer_name TEXT,
                  mime_type TEXT,
                  file_size INTEGER,
                  checksum TEXT,
                  created_at TEXT NOT NULL,
                  UNIQUE(guid, message_guid)
                ) STRICT;
                INSERT INTO attachment_mirror (guid, message_guid, transfer_name, checksum, created_at)
                VALUES ('legacy-guid', 'legacy-msg', '/archive/legacy.bin', 'legacy-hash', '2026-01-01T00:00:00Z');
                """
            )
            conn.commit()
            conn.close()

            repo = MirrorRepository(legacy_path)
            migrated = repo.find_attachment_by_hash("legacy-hash")
            self.assertIsNotNone(migrated)
            self.assertEqual(migrated["guid"], "legacy-guid")

            conn = sqlite3.connect(legacy_path)
            columns = [r[1] for r in conn.execute("PRAGMA table_info(attachment_mirror)").fetchall()]
            indexes = [r[1] for r in conn.execute("PRAGMA index_list(attachment_mirror)").fetchall()]
            conn.close()

            self.assertEqual(columns, ["guid", "file_hash", "original_path", "archive_path", "lifecycle_state"])
            self.assertIn("idx_attachment_mirror_file_hash", indexes)
        finally:
            if os.path.exists(legacy_path):
                os.remove(legacy_path)


if __name__ == "__main__":
    unittest.main()
