import sys
import unittest
from unittest.mock import Mock, patch

try:
    import requests  # noqa: F401
except ModuleNotFoundError:
    sys.modules["requests"] = Mock()

import wine_main


class WineMainTest(unittest.TestCase):
    @patch.object(wine_main, "required", side_effect=lambda name: f"test-{name}")
    @patch.object(wine_main.SlackNotifier, "from_env")
    @patch.object(wine_main, "WineIngestApi")
    def test_schedule_enqueue_failure_does_not_block_claim(self, api_type, notifier_factory, _required):
        api = api_type.return_value
        api.config.return_value = {"automationEnabled": True, "slackAlertEnabled": False}
        api.enqueue_scheduled.side_effect = RuntimeError("hourly capacity exhausted")
        api.claim.return_value = None
        notifier_factory.return_value = Mock(enabled=False)

        with patch.object(sys, "argv", ["wine_main.py", "--enqueue-scheduled"]):
            result = wine_main.main()

        self.assertEqual(0, result)
        api.claim.assert_called_once()

    @patch.object(wine_main, "required", side_effect=lambda name: f"test-{name}")
    @patch.object(wine_main.SlackNotifier, "from_env")
    @patch.object(wine_main, "WineIngestApi")
    def test_config_failure_does_not_block_claim(self, api_type, notifier_factory, _required):
        api = api_type.return_value
        api.config.side_effect = RuntimeError("temporary config failure")
        api.claim.return_value = None
        notifier_factory.return_value = Mock(enabled=False)

        with patch.object(sys, "argv", ["wine_main.py"]):
            result = wine_main.main()

        self.assertEqual(0, result)
        api.claim.assert_called_once()

    @patch.object(wine_main, "required", side_effect=lambda name: f"test-{name}")
    @patch.object(wine_main.SlackNotifier, "from_env")
    @patch.object(wine_main, "FixtureWineProvider")
    @patch.object(wine_main, "WineIngestApi")
    def test_korean_name_from_provider_is_removed_before_import(
        self, api_type, fixture_type, notifier_factory, _required,
    ):
        api = api_type.return_value
        api.config.return_value = {"automationEnabled": False, "slackAlertEnabled": False}
        api.claim.return_value = {"runKey": "run-1", "runType": "FIXTURE", "requestedLimit": 1}
        api.import_wine.return_value = {"status": "CREATED"}
        fixture_type.return_value.collect.return_value = [{
            "provider": "VIVINO", "nameEn": "Example Wine", "nameKo": "자동 국문명",
            "koreanNameEvidenceUrls": ["fixture:evidence"], "vintageYear": 2020,
        }]
        notifier_factory.return_value = Mock(enabled=False)

        with patch.object(sys, "argv", ["wine_main.py"]):
            result = wine_main.main()

        self.assertEqual(0, result)
        payload = api.import_wine.call_args.args[1]
        self.assertNotIn("nameKo", payload)
        self.assertNotIn("koreanNameEvidenceUrls", payload)
        api.finish.assert_called_once_with("run-1")

    def test_failure_payload_never_sends_blank_required_fields(self):
        payload = wine_main.failure_payload({}, "", "")

        self.assertEqual("VIVINO", payload["provider"])
        self.assertEqual("UNKNOWN_ERROR", payload["reasonCode"])
        self.assertTrue(payload["reasonMessage"])
        self.assertIsNone(payload["wineNameEn"])
        self.assertIsNone(payload["vintageLabel"])

    def test_failure_payload_caps_fields_at_api_column_limits(self):
        payload = wine_main.failure_payload(
            {"nameEn": "가" * 400, "sourceUrl": "https://www.vivino.com/" + "a" * 2000},
            "CODE_" + "X" * 200, "사유 " * 2000,
        )

        self.assertEqual(200, len(payload["wineNameEn"]))
        self.assertEqual(1000, len(payload["sourceUrl"]))
        self.assertEqual(60, len(payload["reasonCode"]))
        self.assertEqual(2000, len(payload["reasonMessage"]))

    @patch.object(wine_main, "required", side_effect=lambda name: f"test-{name}")
    @patch.object(wine_main.SlackNotifier, "from_env")
    @patch.object(wine_main, "FixtureWineProvider")
    @patch.object(wine_main, "WineIngestApi")
    def test_provider_item_failure_is_recorded_without_aborting_the_run(
        self, api_type, fixture_type, notifier_factory, _required,
    ):
        api = api_type.return_value
        api.config.return_value = {"automationEnabled": False, "slackAlertEnabled": False}
        api.claim.return_value = {"runKey": "run-1", "runType": "FIXTURE", "requestedLimit": 2}
        api.import_wine.return_value = {"status": "CREATED"}
        fixture_type.return_value.collect.return_value = [
            {"provider": "VIVINO", "sourceUrl": "https://www.vivino.com/x/w/1",
             "nameEn": "Broken Wine", "_providerErrorCode": "VIVINO_ACCESS_BLOCKED",
             "_providerError": "차단 감지"},
            {"provider": "VIVINO", "nameEn": "Good Wine", "vintageYear": 2020},
        ]
        notifier_factory.return_value = Mock(enabled=False)

        with patch.object(sys, "argv", ["wine_main.py"]):
            result = wine_main.main()

        self.assertEqual(0, result)
        self.assertEqual("VIVINO_ACCESS_BLOCKED", api.failure.call_args.args[1]["reasonCode"])
        self.assertEqual("Good Wine", api.import_wine.call_args.args[1]["nameEn"])
        api.finish.assert_called_once_with("run-1")
        fixture_type.return_value.close.assert_called_once_with()

    @patch.object(wine_main, "VivinoWebCrawlerProvider")
    @patch.object(wine_main, "required", side_effect=lambda name: f"test-{name}")
    @patch.object(wine_main.SlackNotifier, "from_env")
    @patch.object(wine_main, "WineIngestApi")
    def test_live_uses_web_crawler_without_api_token(
        self, api_type, notifier_factory, required_value, web_provider_type,
    ):
        api = api_type.return_value
        api.config.return_value = {"automationEnabled": False, "slackAlertEnabled": False}
        api.claim.return_value = {"runKey": "run-live", "runType": "MANUAL", "requestedLimit": 1}
        web_provider_type.return_value.collect.return_value = []
        notifier_factory.return_value = Mock(enabled=False)

        with patch.object(sys, "argv", ["wine_main.py"]):
            result = wine_main.main()

        self.assertEqual(0, result)
        self.assertEqual(
            ["CASKBYCASK_API_URL", "CASKBYCASK_INTERNAL_KEY"],
            [call.args[0] for call in required_value.call_args_list],
        )
        web_provider_type.call_args.kwargs["on_progress"]()
        api.heartbeat.assert_called_with("run-live")
        api.finish.assert_called_once_with("run-live")


if __name__ == "__main__":
    unittest.main()
