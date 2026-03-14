import unittest
import os
import tempfile
import hashlib
from unittest.mock import patch, mock_open
from backend.src.engine import verify_binary, check_db_access

class TestEngineFunctions(unittest.TestCase):
    def test_verify_binary_missing_path(self):
        self.assertFalse(verify_binary(None, "somehash"))
        self.assertFalse(verify_binary("/non/existent/path", "somehash"))

    def test_verify_binary_correct_hash(self):
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(b"test data")
            tmp_path = tmp.name
        try:
            expected_hash = hashlib.sha256(b"test data").hexdigest()
            self.assertTrue(verify_binary(tmp_path, expected_hash))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_verify_binary_incorrect_hash(self):
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(b"test data")
            tmp_path = tmp.name
        try:
            self.assertFalse(verify_binary(tmp_path, "wronghash"))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_check_db_access_not_found(self):
        with patch('os.path.exists', return_value=False):
            success, message = check_db_access("/fake/db.db")
            self.assertFalse(success)
            self.assertIn("Database not found", message)

    def test_check_db_access_granted(self):
        with patch('os.path.exists', return_value=True):
            with patch('builtins.open', mock_open(read_data=b'\x00'*16)):
                success, message = check_db_access("/fake/db.db")
                self.assertTrue(success)
                self.assertEqual(message, "Access granted")

    def test_check_db_access_permission_denied(self):
        with patch('os.path.exists', return_value=True):
            with patch('builtins.open', side_effect=PermissionError):
                success, message = check_db_access("/fake/db.db")
                self.assertFalse(success)
                self.assertEqual(message, "Permission denied. Please grant Full Disk Access.")

    def test_check_db_access_generic_exception(self):
        with patch('os.path.exists', return_value=True):
            with patch('builtins.open', side_effect=Exception("Unexpected error")):
                success, message = check_db_access("/fake/db.db")
                self.assertFalse(success)
                self.assertIn("Error accessing database: Unexpected error", message)

if __name__ == "__main__":
    unittest.main()
