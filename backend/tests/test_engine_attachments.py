import os
import tempfile
import unittest

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


if __name__ == "__main__":
    unittest.main()
