import os
import tempfile
import unittest
from unittest.mock import patch

from backend.src.engine import process_attachment_task


class EngineAttachmentTestCase(unittest.TestCase):
    def test_process_attachment_task_deduplicates_by_file_hash(self):
        with tempfile.TemporaryDirectory() as td:
            contact_dir = os.path.join(td, "contact")
            os.makedirs(contact_dir, exist_ok=True)
            src = os.path.join(td, "dup.bin")
            with open(src, "wb") as f:
                f.write(b"same-payload")

            metadata = {}
            _, first_path, _ = process_attachment_task(
                row_id=1,
                raw_path=src,
                mime="application/octet-stream",
                ts_iso="2025-01-01 12:00:00",
                contact_dir=contact_dir,
                metadata=metadata,
            )
            _, second_path, _ = process_attachment_task(
                row_id=2,
                raw_path=src,
                mime="application/octet-stream",
                ts_iso="2025-01-01 12:00:01",
                contact_dir=contact_dir,
                metadata=metadata,
            )

            self.assertEqual(first_path, second_path)
            self.assertTrue(os.path.exists(os.path.join(contact_dir, first_path)))

    def test_process_attachment_task_scopes_dedup_index_per_contact(self):
        with tempfile.TemporaryDirectory() as td:
            contact_a = os.path.join(td, "contact_a")
            contact_b = os.path.join(td, "contact_b")
            os.makedirs(contact_a, exist_ok=True)
            os.makedirs(contact_b, exist_ok=True)
            src = os.path.join(td, "same.bin")
            with open(src, "wb") as f:
                f.write(b"same-payload")

            metadata = {}
            _, a_first, _ = process_attachment_task(
                row_id=1,
                raw_path=src,
                mime="application/octet-stream",
                ts_iso="2025-01-01 12:00:00",
                contact_dir=contact_a,
                metadata=metadata,
            )
            _, b_first, _ = process_attachment_task(
                row_id=2,
                raw_path=src,
                mime="application/octet-stream",
                ts_iso="2025-01-01 12:10:00",
                contact_dir=contact_b,
                metadata=metadata,
            )

            self.assertNotEqual(a_first, b_first)

            _, a_second, _ = process_attachment_task(
                row_id=3,
                raw_path=src,
                mime="application/octet-stream",
                ts_iso="2025-01-01 12:20:00",
                contact_dir=contact_a,
                metadata=metadata,
            )
            _, b_second, _ = process_attachment_task(
                row_id=4,
                raw_path=src,
                mime="application/octet-stream",
                ts_iso="2025-01-01 12:30:00",
                contact_dir=contact_b,
                metadata=metadata,
            )

            self.assertEqual(a_first, a_second)
            self.assertEqual(b_first, b_second)

    def test_dedupe_return_reads_latest_cached_ocr_text(self):
        with tempfile.TemporaryDirectory() as td:
            contact_dir = os.path.join(td, "contact")
            os.makedirs(contact_dir, exist_ok=True)
            src = os.path.join(td, "same.bin")
            with open(src, "wb") as f:
                f.write(b"same-payload")

            mirrored_rel = os.path.join("Media", "Files", "existing.bin")
            mirrored_abs = os.path.join(contact_dir, mirrored_rel)
            os.makedirs(os.path.dirname(mirrored_abs), exist_ok=True)
            with open(mirrored_abs, "wb") as f:
                f.write(b"same-payload")

            file_hash = "hash-1"
            metadata = {
                "cache": {},
                "attachments": {
                    "by_hash": {file_hash: mirrored_rel},
                    "by_hash_by_contact": {contact_dir: {file_hash: mirrored_rel}},
                },
            }

            real_exists = os.path.exists

            def exists_side_effect(path):
                if path == src:
                    return True
                if path == mirrored_abs:
                    metadata["cache"][file_hash] = "\n[OCR: fresh text]"
                    return True
                return real_exists(path)

            with patch("backend.src.engine.get_file_hash", return_value=file_hash), patch(
                "backend.src.engine.os.path.exists", side_effect=exists_side_effect
            ):
                _, rel, extra = process_attachment_task(
                    row_id=1,
                    raw_path=src,
                    mime="application/octet-stream",
                    ts_iso="2025-01-01 12:00:00",
                    contact_dir=contact_dir,
                    metadata=metadata,
                )

            self.assertEqual(rel, mirrored_rel)
            self.assertEqual(extra, "\n[OCR: fresh text]")


if __name__ == "__main__":
    unittest.main()
