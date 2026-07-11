from __future__ import annotations

import unittest
import sys
import types
import base64
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

# The bundled verification runtime intentionally contains no project packages.
# Stub requests so all HTTP behaviour remains mocked and deterministic.
requests = types.ModuleType("requests")
requests.post = Mock()
sys.modules.setdefault("requests", requests)
google = types.ModuleType("google")
genai = types.ModuleType("google.genai")
genai_types = types.ModuleType("google.genai.types")
genai.Client = Mock()
genai_types.GenerateContentConfig = lambda **kwargs: kwargs
genai_types.Part = types.SimpleNamespace(
    from_bytes=lambda **kwargs: {"data": kwargs["data"], "mime_type": kwargs["mime_type"]}
)
google.genai = genai
genai.types = genai_types
sys.modules.setdefault("google", google)
sys.modules.setdefault("google.genai", genai)
sys.modules.setdefault("google.genai.types", genai_types)

from models import PostDetail, RawPost
from analyzer.gemini_analyzer import GeminiAnalyzer
from news_models import DraftArticle, SearchSource, UsageAccumulator, canonicalize_url, local_datetime_string
from news_gemini import GeminiNewsWriter
from news_tavily import TavilyNewsSearch
from news_targets import target_from_config


class TavilyNewsSearchTest(unittest.TestCase):
    @patch("news_tavily.requests.post")
    def test_search_filters_invalid_urls_and_normalizes_domain(self, post: Mock) -> None:
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {
            "results": [
                {
                    "title": "New release",
                    "url": "https://www.example.com/news/1",
                    "raw_content": "Release evidence",
                    "score": 0.92,
                    "published_date": "2026-07-10",
                },
                {"title": "Invalid", "url": "javascript:alert(1)", "content": "ignored"},
            ]
        }
        post.return_value = response

        search = TavilyNewsSearch("test-key", timeout=5, max_results=50)
        results = search.search("whisky release")

        self.assertEqual(1, search.credits_used)
        self.assertEqual(20, search.max_results)
        self.assertEqual(1, len(results))
        self.assertEqual("example.com", results[0].domain)
        self.assertEqual("Release evidence", results[0].content)
        request_payload = post.call_args.kwargs["json"]
        self.assertEqual("basic", request_payload["search_depth"])
        self.assertEqual("day", request_payload["time_range"])


class NewsModelTest(unittest.TestCase):
    def test_canonical_url_removes_tracking_and_sorts_query(self) -> None:
        canonical = canonicalize_url(
            "https://www.Example.com:443/news/1/?utm_source=x&b=2&a=1#section"
        )

        self.assertEqual("https://example.com/news/1?a=1&b=2", canonical)

    def test_provider_timestamp_is_converted_for_backend_local_datetime(self) -> None:
        value = local_datetime_string("2026-07-10T09:30:00+09:00")

        self.assertEqual("2026-07-10T09:30:00", value)

    def test_source_payload_keeps_a_short_evidence_summary(self) -> None:
        source = SearchSource(
            title="title",
            url="https://example.com/a",
            domain="example.com",
            content="x" * 2500,
            source_type="OFFICIAL",
        )

        payload = source.evidence_payload()

        self.assertEqual("OFFICIAL", payload["sourceType"])
        self.assertEqual(2000, len(payload["evidenceSummary"]))
        self.assertEqual(64, len(payload["contentHash"]))
        self.assertIsNotNone(payload["retrievedAt"])

    def test_usage_accumulator_never_adds_negative_usage(self) -> None:
        usage = UsageAccumulator()

        usage.add_text("gpt-test", -1, 7)
        usage.add_image(-2.5)

        self.assertEqual(0, usage.input_tokens)
        self.assertEqual(7, usage.output_tokens)
        self.assertEqual(1, usage.image_count)
        self.assertEqual(0.0, usage.estimated_cost_usd)
        self.assertEqual({"input": 0, "output": 7}, usage.by_model["gpt-test"])

    def test_tip_draft_requires_its_topic_link_in_payload_model(self) -> None:
        draft = DraftArticle(
            article_type="TIP_INFO",
            category="WHISKY",
            title="셰리 캐스크란?",
            content_html="<p>설명</p>",
            dedupe_key="topic:sherry-cask",
            semantic_fingerprint="sherry-cask-basics",
            confidence=0.95,
            source_indexes=[0],
            image_prompt="educational cask illustration",
            topic_id=3,
        )

        self.assertEqual(3, draft.topic_id)
        self.assertEqual("TIP_INFO", draft.article_type)


class CommunityTargetTest(unittest.TestCase):
    def test_dcinside_short_target(self) -> None:
        target = target_from_config({
            "crawlerType": "DCINSIDE",
            "crawlerTargetKey": "board_id",
            "crawlerTargetValue": "whiskey",
            "sourceName": "DC 위스키",
        })

        self.assertEqual("whiskey", target["board_id"])
        self.assertTrue(target["minor"])
        self.assertEqual(1, target["list_pages"])

    def test_naver_json_target_preserves_admin_configuration(self) -> None:
        target = target_from_config({
            "crawlerType": "NAVER_CAFE",
            "crawlerTargetValue": '{"club_id":"123","menu_id":7,"list_pages":2}',
            "sourceName": "네이버 카페",
        })

        self.assertEqual("123", target["club_id"])
        self.assertEqual(7, target["menu_id"])
        self.assertEqual(2, target["list_pages"])
        self.assertEqual("네이버 카페", target["name"])


class GeminiDealAnalyzerTest(unittest.TestCase):
    def test_text_and_data_url_image_use_native_gemini_multimodal_api(self) -> None:
        response = types.SimpleNamespace(text=json.dumps({
            "is_deal": True,
            "drink_name": "테스트 위스키",
            "drink_category": "WHISKY",
            "original_price": 100000,
            "deal_price": 80000,
            "discount_rate": 0.2,
            "currency": "KRW",
            "seller": "테스트몰",
            "confidence_score": 9,
            "summary_ko": "테스트 할인",
        }, ensure_ascii=False))
        generate = Mock(return_value=response)
        analyzer = GeminiAnalyzer.__new__(GeminiAnalyzer)
        analyzer.model = "gemini-3.1-flash-lite"
        analyzer.notifier = None
        analyzer.request_interval_sec = 0
        analyzer._last_request_started_at = 0
        analyzer.client = types.SimpleNamespace(models=types.SimpleNamespace(generate_content=generate))
        detail = PostDetail(
            RawPost("dcinside", "whisky", "위스키", "1", "테스트 할인", "https://example.com/1"),
            "정상가 100,000원, 할인가 80,000원",
        )
        encoded = base64.b64encode(b"image-bytes").decode()

        result = analyzer.analyze(detail, [f"data:image/jpeg;base64,{encoded}"])

        self.assertIsNotNone(result)
        self.assertEqual("테스트 위스키", result.drink_name)
        call = generate.call_args.kwargs
        self.assertEqual("gemini-3.1-flash-lite", call["model"])
        self.assertEqual(b"image-bytes", call["contents"][1]["data"])
        self.assertEqual("application/json", call["config"]["response_mime_type"])


class GeminiNewsWriterTest(unittest.TestCase):
    def test_json_response_and_thinking_tokens_are_counted(self) -> None:
        response = types.SimpleNamespace(
            text='{"ok": true}',
            usage_metadata=types.SimpleNamespace(
                prompt_token_count=11,
                candidates_token_count=7,
                thoughts_token_count=5,
            ),
        )
        generate = Mock(return_value=response)
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.client = types.SimpleNamespace(models=types.SimpleNamespace(generate_content=generate))
        writer.usage = UsageAccumulator()

        schema = {"type": "object", "properties": {"ok": {"type": "boolean"}}, "required": ["ok"]}
        result = writer._request_json("gemini-test-lite", "system", {"value": "테스트"}, schema)

        self.assertTrue(result["ok"])
        self.assertEqual(11, writer.usage.input_tokens)
        self.assertEqual(12, writer.usage.output_tokens)
        config = generate.call_args.kwargs["config"]
        self.assertEqual("application/json", config["response_mime_type"])
        self.assertEqual(schema, config["response_json_schema"])

    def test_malformed_json_is_retried_once(self) -> None:
        responses = [
            types.SimpleNamespace(text='{"title":"미완성"', usage_metadata=None),
            types.SimpleNamespace(text='{"title":"완성"}', usage_metadata=None),
        ]
        generate = Mock(side_effect=responses)
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.client = types.SimpleNamespace(models=types.SimpleNamespace(generate_content=generate))
        writer.usage = UsageAccumulator()

        result = writer._request_json(
            "gemini-test-lite", "system", {"value": "테스트"},
            {"type": "object", "properties": {"title": {"type": "string"}}, "required": ["title"]},
        )

        self.assertEqual("완성", result["title"])
        self.assertEqual(2, generate.call_count)

    def test_final_semantic_duplicate_judgement_is_normalized(self) -> None:
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.classifier_model = "gemini-test-lite"
        writer._request_json = Mock(return_value={
            "duplicate": True,
            "semantic_similarity": 0.93,
            "matched_article_id": "41",
            "reason": "핵심 질문과 결론이 같습니다.",
        })
        draft = DraftArticle(
            "TIP_INFO", "WHISKY", "셰리 캐스크 이해하기", "<h2>핵심</h2><p>설명</p>",
            "tip:new-sherry", "sherry cask basics", 0.95, [0], "educational image", topic_id=9,
        )

        result = writer.judge_tip_duplicate(
            {"title": "셰리 캐스크 안내", "normalizedKey": "new-sherry", "category": "WHISKY"},
            draft,
            [{"articleId": 41, "title": "셰리 캐스크란?", "contentOutline": "정의 | 숙성 영향"}],
        )

        self.assertTrue(result["duplicate"])
        self.assertEqual(0.93, result["semanticSimilarity"])
        self.assertEqual(41, result["matchedArticleId"])

    def test_image_response_is_written_and_usage_is_counted(self) -> None:
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.client = types.SimpleNamespace(interactions=types.SimpleNamespace(create=Mock(return_value=
            types.SimpleNamespace(output_image=types.SimpleNamespace(
                data=base64.b64encode(b"image").decode()))
        )))
        writer.image_model = "gemini-image-test"
        writer.image_estimated_cost_usd = 0.12
        writer.usage = UsageAccumulator()

        with tempfile.TemporaryDirectory() as temp:
            path = writer.generate_image("unbranded cask diagram", Path(temp), "tip:test")
            self.assertEqual(b"image", path.read_bytes())
            self.assertEqual(".jpg", path.suffix)
            response_format = writer.client.interactions.create.call_args.kwargs["response_format"]
            self.assertEqual("image/jpeg", response_format["mime_type"])

        self.assertEqual(1, writer.usage.image_count)
        self.assertEqual(0.12, writer.usage.estimated_cost_usd)


if __name__ == "__main__":
    unittest.main()
