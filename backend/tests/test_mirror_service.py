import os
import tempfile
import unittest

from backend.src.mirror_service import MirrorService


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


if __name__ == "__main__":
    unittest.main()
