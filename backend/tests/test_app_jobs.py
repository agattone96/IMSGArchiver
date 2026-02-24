import unittest
from unittest.mock import patch

from backend.src.app import create_archive_job, get_archive_job, ArchiveRequest


class AppJobEndpointsTestCase(unittest.TestCase):
    def test_create_and_get_job_handlers(self):
        fake_job = {
            "id": "job-1",
            "type": "archive_chat",
            "chat_guid": "chat-1",
            "format": "csv",
            "incremental": True,
            "status": "queued",
            "progress": 0,
            "processed": 0,
            "total": 0,
            "result": None,
            "error": None,
            "cancel_requested": False,
            "created_at": "now",
            "updated_at": "now",
            "started_at": None,
            "completed_at": None,
        }
        req = ArchiveRequest(chat_guid="chat-1", format="csv", incremental=True)
        with patch("backend.src.app.job_store.enqueue_archive_job", return_value=fake_job), patch(
            "backend.src.app.job_store.get_job", return_value=fake_job
        ):
            created = create_archive_job(req)
            loaded = get_archive_job("job-1")

        self.assertEqual(created["id"], "job-1")
        self.assertEqual(loaded["chat_guid"], "chat-1")


if __name__ == "__main__":
    unittest.main()
