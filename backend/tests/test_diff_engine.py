import unittest

from backend.src.diff_engine import compute_fingerprint, detect_edit


class DiffEngineTestCase(unittest.TestCase):
    def test_compute_fingerprint_sha256_lower_hex(self):
        fp = compute_fingerprint("Hello", b"abc", {"a": 1})
        self.assertEqual(len(fp), 64)
        self.assertTrue(fp.islower())
        self.assertRegex(fp, r"^[0-9a-f]{64}$")

    def test_detect_edit(self):
        first = compute_fingerprint("hello", b"", {})
        second = compute_fingerprint("hello edited", b"", {})
        self.assertFalse(detect_edit(None, first))
        self.assertTrue(detect_edit(first, second))


if __name__ == "__main__":
    unittest.main()
