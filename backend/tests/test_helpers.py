import hashlib
import os
import tempfile
import unittest

from backend.src.helpers import get_file_hash


class HelpersTestCase(unittest.TestCase):
    def test_get_file_hash_uses_file_bytes_sha256(self):
        fd, path = tempfile.mkstemp()
        os.close(fd)
        try:
            payload = (b"abc123" * 300000) + b"tail"
            with open(path, "wb") as f:
                f.write(payload)

            expected = hashlib.sha256(payload).hexdigest()
            self.assertEqual(get_file_hash(path), expected)
        finally:
            if os.path.exists(path):
                os.remove(path)


if __name__ == "__main__":
    unittest.main()
