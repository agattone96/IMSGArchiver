import unittest
from unittest.mock import patch

from backend.src.app import (
    enable_mirror,
    disable_mirror,
    trigger_fallback_sync,
    get_message_timeline,
    FallbackSyncRequest,
)


class AppMirrorEndpointsTestCase(unittest.TestCase):
    def test_mirror_handlers(self):
        with patch("backend.src.app.mirror_service.enable_mirror", return_value={"enabled": True}), patch(
            "backend.src.app.mirror_service.disable_mirror", return_value={"enabled": False}
        ), patch(
            "backend.src.app.mirror_service.trigger_fallback_sync", return_value={"synced": True}
        ), patch(
            "backend.src.app.mirror_service.get_message_timeline", return_value=[{"id": 1}]
        ):
            self.assertTrue(enable_mirror()["enabled"])
            self.assertFalse(disable_mirror()["enabled"])
            self.assertTrue(trigger_fallback_sync(FallbackSyncRequest(last_synced_timestamp=1))["synced"])
            self.assertEqual(get_message_timeline("g-1"), [{"id": 1}])


if __name__ == "__main__":
    unittest.main()
