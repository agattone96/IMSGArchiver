import unittest
from unittest.mock import patch

from backend.src.jobs import ArchiveJobStore


class JobsTestCase(unittest.TestCase):
    def test_enqueue_persists_and_returns_job(self):
        store = ArchiveJobStore()
        metadata = {}

        with patch("backend.src.jobs.db.load_metadata", side_effect=lambda: metadata), patch(
            "backend.src.jobs.db.save_metadata", side_effect=lambda data: metadata.update(data)
        ), patch.object(store, "_run_archive_job"):
            job = store.enqueue_archive_job("chat-1", "csv", True)

        # basic identity / persistence checks
        self.assertEqual(job["chat_guid"], "chat-1")
        persisted_job = metadata["jobs"][job["id"]]
        self.assertEqual(persisted_job["status"], "queued")

        # default initialization contract
        self.assertEqual(job["progress"], 0)
        self.assertEqual(job["processed"], 0)
        self.assertEqual(job["total"], 0)
        self.assertFalse(job["cancel_requested"])
        self.assertIsNone(job["result"])
        self.assertIsNone(job["error"])

        # timestamps should be set and aligned at creation
        self.assertIsNotNone(job["created_at"])
        self.assertIsNotNone(job["updated_at"])
        self.assertEqual(job["created_at"], job["updated_at"])

    def test_cancel_queued_job_moves_to_canceled(self):
        store = ArchiveJobStore()
        metadata = {
            "jobs": {
                "job-1": {
                    "id": "job-1",
                    "status": "queued",
                    "cancel_requested": False,
                }
            }
        }

        with patch("backend.src.jobs.db.load_metadata", side_effect=lambda: metadata), patch(
            "backend.src.jobs.db.save_metadata", side_effect=lambda data: metadata.update(data)
        ):
            updated = store.request_cancel("job-1")

        self.assertEqual(updated["status"], "canceled")
        self.assertTrue(updated["cancel_requested"])


if __name__ == "__main__":
    unittest.main()
