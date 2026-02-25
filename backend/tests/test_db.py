import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from backend.src import db


class DbReadOnlyConnectionTestCase(unittest.TestCase):
    def test_get_db_connection_opens_read_only_uri(self):
        with tempfile.NamedTemporaryFile(suffix=".sqlite") as tmp_db:
            captured = {}

            class DummyConn:
                row_factory = None

            def fake_connect(path, uri=False):
                captured["path"] = path
                captured["uri"] = uri
                return DummyConn()

            with patch("backend.src.db.TMP_DB", tmp_db.name), patch("backend.src.db.sqlite3.connect", side_effect=fake_connect):
                conn = db.get_db_connection()

            self.assertTrue(captured["uri"])
            self.assertIn("mode=ro", captured["path"])
            self.assertIsNotNone(conn)

    def test_execute_with_busy_retry_uses_expected_backoff(self):
        attempts = {"count": 0}

        def flaky():
            attempts["count"] += 1
            if attempts["count"] < 4:
                raise sqlite3.OperationalError("SQLITE_BUSY: database is locked")
            return "ok"

        sleep_calls = []
        with patch("backend.src.db.time.sleep", side_effect=lambda n: sleep_calls.append(n)):
            result = db.execute_with_busy_retry(flaky)

        self.assertEqual(result, "ok")
        self.assertEqual(sleep_calls, [0.01, 0.05, 0.2])

    def test_validate_source_db_integrity_raises_on_failed_check(self):
        class DummyConn:
            def execute(self, _sql):
                class _Row:
                    @staticmethod
                    def fetchone():
                        return ("not ok",)

                return _Row()

            def close(self):
                return None

        with patch("backend.src.db.get_db_connection", return_value=DummyConn()), patch(
            "backend.src.db.execute_with_busy_retry", side_effect=lambda callback: callback()
        ):
            with self.assertRaises(RuntimeError):
                db.validate_source_db_integrity()


if __name__ == "__main__":
    unittest.main()
