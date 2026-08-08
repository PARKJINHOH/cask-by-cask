from __future__ import annotations

import unittest
import sys
import types
import base64
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

# 번들 검증 런타임에 프로젝트 패키지가 없을 때만 최소 stub을 사용한다.
# 운영/CI처럼 실제 패키지가 설치된 환경에서는 sys.modules를 덮어쓰지 않는다.
try:
    import requests
except ModuleNotFoundError:
    requests = types.ModuleType("requests")
    requests.post = Mock()
    requests.RequestException = type("RequestException", (Exception,), {})
    requests.Timeout = type("Timeout", (requests.RequestException,), {})

    class StubSession:
        def __init__(self):
            self.trust_env = True
            self.adapters = {}

        def mount(self, prefix, adapter):
            self.adapters[prefix] = adapter

        def close(self):
            return None

    class StubHttpAdapter:
        def __init__(self):
            self.poolmanager = types.SimpleNamespace(connection_pool_kw={})

        def send(self, request, **kwargs):
            return None

    requests.Session = StubSession
    requests_adapters = types.ModuleType("requests.adapters")
    requests_adapters.HTTPAdapter = StubHttpAdapter
    requests.adapters = requests_adapters
    sys.modules["requests"] = requests
    sys.modules["requests.adapters"] = requests_adapters

try:
    import bs4  # noqa: F401
except ModuleNotFoundError:
    bs4 = types.ModuleType("bs4")
    bs4.BeautifulSoup = Mock()
    sys.modules["bs4"] = bs4

try:
    import google.genai  # noqa: F401
except ModuleNotFoundError:
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
    sys.modules["google.genai"] = genai
    sys.modules["google.genai.types"] = genai_types

from models import PostDetail, RawPost
from analyzer.gemini_analyzer import GeminiAnalyzer
from news_models import (DraftArticle, SearchSource, UsageAccumulator, canonicalize_url,
                         local_datetime_string, truncate_utf16)
from news_gemini import AI_NEWS_RETRY_MAX_OUTPUT_TOKENS, GeminiNewsWriter
from news_main import _drop_blocked_sources, _process_draft
from alerts.ai_news_error_alert import (
    append_error_detail,
    append_review_detail,
    format_error_alert,
    format_review_alert,
)
from news_prompts import AI_NEWS_MIN_TEXT_LENGTH, AI_NEWS_WRITING_PROMPT
from news_tavily import TavilyNewsSearch
from news_source_config import is_blocked_source, matching_source_config
from news_official import _direct_source, _get_public_url, _targeted_match, collect_registered_sources


def config_value(config, name: str):
    """google-genai 실제 타입과 최소 테스트 stub 양쪽을 같은 방식으로 검사한다."""
    return config[name] if isinstance(config, dict) else getattr(config, name)


def part_bytes(part) -> bytes:
    if isinstance(part, dict):
        return part["data"]
    return part.inline_data.data


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
        results = search.search("whisky release", include_domains=["example.com"])

        self.assertEqual(1, search.credits_used)
        self.assertEqual(20, search.max_results)
        self.assertEqual(1, len(results))
        self.assertEqual("example.com", results[0].domain)
        self.assertEqual("Release evidence", results[0].content)
        request_payload = post.call_args.kwargs["json"]
        self.assertEqual("basic", request_payload["search_depth"])
        self.assertEqual("day", request_payload["time_range"])
        self.assertEqual(["example.com"], request_payload["include_domains"])

    @patch("news_tavily.requests.post")
    def test_search_truncates_query_to_tavily_limit(self, post: Mock) -> None:
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {"results": []}
        post.return_value = response

        search = TavilyNewsSearch("test-key")
        search.search("가" * 500)

        request_query = post.call_args.kwargs["json"]["query"]
        self.assertEqual(TavilyNewsSearch.QUERY_MAX_LENGTH, len(request_query))
        self.assertLess(len(request_query), 400)

    @patch("news_tavily.requests.post")
    def test_search_failure_includes_tavily_response_detail(self, post: Mock) -> None:
        response = Mock()
        response.status_code = 400
        response.text = '{"detail":"Query must be less than 400 characters"}'
        response.raise_for_status.side_effect = requests.RequestException("Bad Request")
        post.return_value = response

        search = TavilyNewsSearch("test-key")

        with self.assertRaisesRegex(RuntimeError, "Query must be less than 400 characters"):
            search.search("whisky release")
        self.assertEqual(0, search.credits_used)


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

    def test_utf16_truncation_matches_java_size_validation(self) -> None:
        value = "😀" * 1100

        truncated = truncate_utf16(value, 2000)

        self.assertEqual(1000, len(truncated))
        self.assertEqual(2000, len(truncated.encode("utf-16-le")) // 2)

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

    def test_generated_hashtags_are_cleaned_and_deduplicated(self) -> None:
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.writer_model = "gemini-test"
        result = writer._draft_from_result(
            "RELEASE_NEWS", "WHISKY", "release:test", None, [0], {
                "title": "테스트 위스키 출시",
                "content_html": f"<p>{'본문' * 700}</p>",
                "confidence": 0.95,
                "semantic_fingerprint": "test whisky release",
                "image_prompt": "editorial whisky illustration",
                "hashtags": ["#위스키", "위스키", " 신제품 ", "싱글 몰트"],
            },
        )

        self.assertEqual(["위스키", "신제품", "싱글몰트"], result.hashtags)
        self.assertEqual("release:test", result.dedupe_key)

    def test_ai_news_error_alert_includes_stage_context_and_exception(self) -> None:
        details: list[dict[str, str]] = []
        append_error_detail(
            details, "출시 소식 후보", RuntimeError("Gemini 응답 형식 오류"),
            eventKey="new-release", category="OTHER",
        )

        body = format_error_alert(
            73, "ai-news-20260725T010000Z",
            {
                "candidateCount": 4,
                "publishedCount": 0,
                "reviewCount": 1,
                "duplicateCount": 0,
                "errorCount": 1,
            },
            details,
        )

        self.assertIn("runId=73", body)
        self.assertIn("출시 소식 후보", body)
        self.assertIn("eventKey=new-release", body)
        self.assertIn("RuntimeError: Gemini 응답 형식 오류", body)

    def test_ai_news_review_alert_includes_length_diagnostics(self) -> None:
        details: list[dict[str, str]] = []
        append_review_detail(
            details,
            "출시 소식 후보",
            "1차=812자(finishReason=STOP), 2차=934자(finishReason=STOP); 근거=1건/1,420자",
            eventKey="short-release",
            articleId=91,
        )

        body = format_review_alert(
            74,
            "ai-news-20260727T031702Z",
            {
                "candidateCount": 1,
                "publishedCount": 0,
                "reviewCount": 1,
                "duplicateCount": 0,
                "errorCount": 0,
            },
            details,
        )

        self.assertIn("분량 미달 검토 원고", body)
        self.assertIn("eventKey=short-release", body)
        self.assertIn("2차=934자", body)


class NewsSourceConfigTest(unittest.TestCase):
    @patch("news_official.time.sleep")
    @patch("news_official.get_public_response")
    @patch("news_official.new_public_session")
    def test_direct_request_retries_a_transient_connection_failure(
        self, session_factory: Mock, get_public: Mock, sleep: Mock,
    ) -> None:
        session = session_factory.return_value
        response = Mock()
        response.headers = {"Content-Type": "text/html; charset=utf-8"}
        response.iter_content.return_value = [b"<html>ok</html>"]
        response.encoding = "utf-8"
        get_public.side_effect = [
            requests.RequestException("connect timeout"),
            (response, "https://example.com/news"),
        ]

        final_url, content_type, body = _get_public_url("https://example.com/news", 15)

        self.assertEqual("https://example.com/news", final_url)
        self.assertIn("text/html", content_type)
        self.assertEqual("<html>ok</html>", body)
        self.assertEqual(2, get_public.call_count)
        self.assertEqual(15, get_public.call_args.kwargs["timeout"])
        self.assertIs(session, get_public.call_args.args[0])
        sleep.assert_called_once_with(1)
        response.close.assert_called_once()
        session.close.assert_called_once()

    @patch("news_official.BeautifulSoup")
    @patch("news_official._get_public_url")
    def test_direct_source_limits_redirects_to_configured_domain(
        self, get_public: Mock, soup_factory: Mock,
    ) -> None:
        get_public.return_value = (
            "https://www.example.com/news",
            "text/html; charset=utf-8",
            "<html><title>Official news</title><body>공식 뉴스 본문이 충분히 있습니다.</body></html>",
        )
        soup = soup_factory.return_value
        soup.return_value = []
        soup.title.get_text.return_value = "Official news"
        soup.get_text.return_value = "공식 뉴스 본문이 충분히 있습니다. 제품 출시와 관련된 세부 정보입니다."

        source = _direct_source({
            "sourceUrl": "https://example.com/news",
            "sourceName": "Example",
            "domain": "example.com",
            "sourceType": "OFFICIAL",
        }, 15)

        self.assertEqual("example.com", source.domain)
        get_public.assert_called_once_with(
            "https://example.com/news",
            15,
            allowed_hosts={"example.com"},
        )

    def test_account_rule_wins_over_domain_rule_only_for_matching_path(self) -> None:
        configs = [
            {"domain": "instagram.com", "pathPrefix": "", "sourceType": "UNAPPROVED"},
            {"domain": "instagram.com", "pathPrefix": "/metabevkorea", "sourceType": "OFFICIAL"},
        ]

        official = matching_source_config(
            "https://www.instagram.com/metabevkorea/news", "instagram.com", configs
        )
        other = matching_source_config(
            "https://www.instagram.com/another_account", "instagram.com", configs
        )

        self.assertEqual("OFFICIAL", official["sourceType"])
        self.assertEqual("UNAPPROVED", other["sourceType"])

    def test_similar_account_name_does_not_match_prefix(self) -> None:
        configs = [
            {"domain": "instagram.com", "pathPrefix": "/metabevkorea", "sourceType": "OFFICIAL"},
        ]

        matched = matching_source_config(
            "https://instagram.com/metabevkorea_fake", "instagram.com", configs
        )

        self.assertIsNone(matched)

    def test_blocked_domain_scope_covers_every_path(self) -> None:
        blocked = [{"domain": "spam-news.example", "pathPrefix": ""}]

        self.assertTrue(is_blocked_source(
            "https://spam-news.example/2026/whisky", "spam-news.example", blocked))
        self.assertTrue(is_blocked_source(
            "https://www.spam-news.example/", "spam-news.example", blocked))
        self.assertFalse(is_blocked_source(
            "https://other.example/whisky", "other.example", blocked))

    def test_blocked_path_scope_leaves_sibling_paths_usable(self) -> None:
        blocked = [{"domain": "instagram.com", "pathPrefix": "/spam_account"}]

        self.assertTrue(is_blocked_source(
            "https://instagram.com/spam_account/p/123", "instagram.com", blocked))
        # 접두사가 이름의 일부로만 겹치는 계정은 차단 대상이 아니다.
        self.assertFalse(is_blocked_source(
            "https://instagram.com/spam_account_fan", "instagram.com", blocked))
        self.assertFalse(is_blocked_source(
            "https://instagram.com/metabevkorea", "instagram.com", blocked))

    def test_drop_blocked_sources_removes_only_blocked_candidates(self) -> None:
        sources = [
            SearchSource(title="차단", url="https://spam-news.example/a",
                         domain="spam-news.example", content=""),
            SearchSource(title="정상", url="https://whiskymag.example/b",
                         domain="whiskymag.example", content=""),
        ]

        kept = _drop_blocked_sources(
            sources, {"blockedSources": [{"domain": "spam-news.example", "pathPrefix": ""}]}, Mock())

        self.assertEqual(["whiskymag.example"], [s.domain for s in kept])

    def test_drop_blocked_sources_is_a_noop_without_a_block_list(self) -> None:
        sources = [SearchSource(title="정상", url="https://whiskymag.example/b",
                                domain="whiskymag.example", content="")]

        self.assertEqual(sources, _drop_blocked_sources(sources, {}, Mock()))

    def test_social_post_can_be_assigned_to_registered_account_by_handle_evidence(self) -> None:
        configs = [{
            "id": 1,
            "domain": "instagram.com",
            "pathPrefix": "/metabevkorea",
            "sourceType": "OFFICIAL",
        }]
        source = SearchSource(
            title="MetaBevKorea 신제품 소식",
            url="https://instagram.com/p/example-post",
            domain="instagram.com",
            content="메타베브코리아 공식 계정 @metabevkorea 게시물",
        )

        matched = _targeted_match(source, configs)

        self.assertEqual(1, matched["id"])

    @patch("news_official._direct_source")
    def test_instagram_uses_search_without_direct_request(self, direct_source: Mock) -> None:
        config = {"sources": [{
            "id": 1,
            "sourceName": "메타베브코리아",
            "sourceUrl": "https://www.instagram.com/metabevkorea",
            "domain": "instagram.com",
            "pathPrefix": "/metabevkorea",
            "sourceType": "OFFICIAL",
            "enabled": True,
        }]}
        search = Mock()
        search.search.return_value = []
        api = Mock()

        sources = collect_registered_sources(config, search, api, Mock(), timeout=15)

        self.assertEqual([], sources)
        direct_source.assert_not_called()
        search.search.assert_called_once()
        query = search.search.call_args.args[0]
        self.assertIn("메타베브코리아", query)
        self.assertIn("metabevkorea", query)
        api.record_source_crawl_result.assert_called_once_with(1, "SUCCESS")

    @patch("news_official._direct_source")
    def test_successful_empty_fallback_clears_transient_direct_failure(self, direct_source: Mock) -> None:
        config = {"sources": [{
            "id": 2,
            "sourceName": "Whisky Advocate News",
            "sourceUrl": "https://whiskyadvocate.com/Tag/news",
            "domain": "whiskyadvocate.com",
            "pathPrefix": "/Tag/news",
            "sourceType": "TRUSTED_MEDIA",
            "enabled": True,
        }]}
        direct_source.side_effect = TimeoutError("connect timeout")
        search = Mock()
        search.search.return_value = []
        api = Mock()

        sources = collect_registered_sources(config, search, api, Mock(), timeout=15)

        self.assertEqual([], sources)
        api.record_source_crawl_result.assert_called_once_with(2, "SUCCESS")

    @patch("news_official._direct_source")
    def test_failed_fallback_keeps_direct_failure(self, direct_source: Mock) -> None:
        config = {"sources": [{
            "id": 2,
            "sourceName": "Whisky Advocate News",
            "sourceUrl": "https://whiskyadvocate.com/Tag/news",
            "domain": "whiskyadvocate.com",
            "pathPrefix": "/Tag/news",
            "sourceType": "TRUSTED_MEDIA",
            "enabled": True,
        }]}
        direct_source.side_effect = TimeoutError("connect timeout")
        search = Mock()
        search.search.side_effect = RuntimeError("Tavily unavailable")
        api = Mock()

        collect_registered_sources(config, search, api, Mock(), timeout=15)

        api.record_source_crawl_result.assert_called_once_with(2, "ERROR", "connect timeout")


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
        self.assertEqual(b"image-bytes", part_bytes(call["contents"][1]))
        self.assertEqual("application/json", config_value(call["config"], "response_mime_type"))


class GeminiNewsWriterTest(unittest.TestCase):
    def test_writer_prompt_contains_editable_seo_and_length_rules(self) -> None:
        self.assertIn("검색 엔진 최적화 (SEO)", AI_NEWS_WRITING_PROMPT)
        self.assertIn(f"{AI_NEWS_MIN_TEXT_LENGTH:,}자 이상", AI_NEWS_WRITING_PROMPT)

    def test_writer_prompt_protects_official_names_and_press_release_tone(self) -> None:
        self.assertIn("Anti-Hallucination for Proper Nouns", AI_NEWS_WRITING_PROMPT)
        self.assertIn("Official Brand/Product Names", AI_NEWS_WRITING_PROMPT)
        self.assertIn("Loanword Consistency", AI_NEWS_WRITING_PROMPT)
        self.assertIn("Tone & Manner", AI_NEWS_WRITING_PROMPT)
        self.assertIn("한국어 공식 제품명", AI_NEWS_WRITING_PROMPT)
        self.assertIn("합니다/습니다", AI_NEWS_WRITING_PROMPT)

    def test_release_classifier_accepts_other_category(self) -> None:
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.classifier_model = "gemini-test-lite"
        writer._request_json = Mock(return_value={"candidates": [{
            "category": "OTHER",
            "event_key": "new-rum-release",
            "summary": "신규 럼 출시",
            "source_indexes": [0],
            "confidence": 0.92,
        }]})
        source = SearchSource(
            title="신규 럼 출시",
            url="https://example.com/rum",
            domain="example.com",
            content="신규 럼 출시 공식 발표",
        )

        result = writer.classify_releases([source], 1)

        self.assertEqual("OTHER", result[0]["category"])

    def test_short_article_is_rewritten_once_to_meet_minimum_length(self) -> None:
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.writer_model = "gemini-test-lite"
        short = {"title": "짧은 글", "content_html": "<p>짧은 본문</p>"}
        long = {"title": "보강한 글", "content_html": f"<p>{'가' * 1000}</p>"}
        writer._request_json = Mock(side_effect=[short, long])

        result = writer._request_article({"task": "테스트"})

        self.assertEqual(long, result)
        self.assertEqual(2, writer._request_json.call_count)
        revision_payload = writer._request_json.call_args_list[1].args[2]
        self.assertIn("revision_request", revision_payload)
        self.assertEqual(4, revision_payload["length_validation"]["previous_plain_text_length"])
        self.assertEqual(996, revision_payload["length_validation"]["shortfall"])

    def test_second_short_article_is_kept_for_review_with_diagnostics(self) -> None:
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.writer_model = "gemini-test-lite"
        first = {
            "title": "첫 원고",
            "content_html": f"<p>{'가' * 700}</p>",
            "confidence": 0.91,
            "semantic_fingerprint": "first",
            "image_prompt": "editorial image",
            "hashtags": [],
        }
        second = {
            **first,
            "title": "보강 원고",
            "content_html": f"<p>{'나' * 900}</p>",
        }
        writer._request_json = Mock(side_effect=[first, second])

        result = writer._request_article(
            {
                "task": "출시 소식 원고 작성과 최종 사실 검증",
                "evidence": [{"text": "근거 본문"}],
            },
            allow_short_review=True,
        )
        draft = writer._draft_from_result(
            "RELEASE_NEWS",
            "WHISKY",
            "release:short",
            None,
            [0],
            result,
        )

        self.assertEqual("보강 원고", draft.title)
        self.assertFalse(draft.auto_publish_requested)
        self.assertIn("1차=700자", draft.generation_warning)
        self.assertIn("2차=900자", draft.generation_warning)
        self.assertIn("근거=1건/4자", draft.generation_warning)

    def test_second_short_rewrite_does_not_replace_existing_article(self) -> None:
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.writer_model = "gemini-test-lite"
        short = {
            "title": "짧은 원고",
            "content_html": f"<p>{'가' * 800}</p>",
        }
        writer._request_json = Mock(side_effect=[short, short])

        with self.assertRaisesRegex(
            RuntimeError,
            r"최소 1,000자보다 짧습니다.*1차=800자.*2차=800자",
        ):
            writer._request_article({"task": "기존 AI 소식 원고 재작성"})

    def test_retry_sets_output_limit_only_after_max_tokens_finish_reason(self) -> None:
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.writer_model = "gemini-test-lite"
        results = [
            {"title": "첫 원고", "content_html": f"<p>{'가' * 700}</p>"},
            {"title": "보강 원고", "content_html": f"<p>{'나' * 1000}</p>"},
        ]

        def request_json(*args, **kwargs):
            index = request_json.call_count
            request_json.call_count += 1
            writer._last_response_metadata = {
                "finishReason": "MAX_TOKENS" if index == 0 else "STOP",
                "responseTextLength": 900 if index == 0 else 1300,
            }
            return results[index]

        request_json.call_count = 0
        writer._request_json = Mock(side_effect=request_json)

        result = writer._request_article({"task": "테스트"})

        self.assertEqual("보강 원고", result["title"])
        self.assertNotIn("max_output_tokens", writer._request_json.call_args_list[0].kwargs)
        self.assertEqual(
            AI_NEWS_RETRY_MAX_OUTPUT_TOKENS,
            writer._request_json.call_args_list[1].kwargs["max_output_tokens"],
        )

    def test_plain_text_length_excludes_html_and_whitespace(self) -> None:
        self.assertEqual(5, GeminiNewsWriter._plain_text_length("<h2>가 나</h2><p>다&amp;라</p>"))

    def test_json_response_and_thinking_tokens_are_counted(self) -> None:
        response = types.SimpleNamespace(
            text='{"ok": true}',
            candidates=[types.SimpleNamespace(
                finish_reason=types.SimpleNamespace(name="STOP"),
            )],
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
        self.assertEqual("STOP", writer._last_response_metadata["finishReason"])
        self.assertEqual(len(response.text), writer._last_response_metadata["responseTextLength"])
        config = generate.call_args.kwargs["config"]
        self.assertEqual("application/json", config_value(config, "response_mime_type"))
        self.assertEqual(schema, config_value(config, "response_json_schema"))

    def test_json_request_applies_explicit_output_limit_when_requested(self) -> None:
        response = types.SimpleNamespace(
            text='{"ok": true}',
            candidates=[types.SimpleNamespace(
                finish_reason=types.SimpleNamespace(name="STOP"),
            )],
            usage_metadata=None,
        )
        generate = Mock(return_value=response)
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.client = types.SimpleNamespace(
            models=types.SimpleNamespace(generate_content=generate)
        )
        writer.usage = UsageAccumulator()
        schema = {
            "type": "object",
            "properties": {"ok": {"type": "boolean"}},
            "required": ["ok"],
        }

        writer._request_json(
            "gemini-test-lite",
            "system",
            {"value": "테스트"},
            schema,
            max_output_tokens=AI_NEWS_RETRY_MAX_OUTPUT_TOKENS,
        )

        config = generate.call_args.kwargs["config"]
        self.assertEqual(
            AI_NEWS_RETRY_MAX_OUTPUT_TOKENS,
            config_value(config, "max_output_tokens"),
        )

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
        writer.image_generation_enabled = True
        writer.usage = UsageAccumulator()

        with tempfile.TemporaryDirectory() as temp:
            path = writer.generate_image("unbranded cask diagram", Path(temp), "tip:test")
            self.assertEqual(b"image", path.read_bytes())
            self.assertEqual(".jpg", path.suffix)
            response_format = writer.client.interactions.create.call_args.kwargs["response_format"]
            self.assertEqual("image/jpeg", response_format["mime_type"])

        self.assertEqual(1, writer.usage.image_count)
        self.assertEqual(0.12, writer.usage.estimated_cost_usd)

    def test_disabled_image_generation_does_not_call_provider(self) -> None:
        create = Mock()
        writer = GeminiNewsWriter.__new__(GeminiNewsWriter)
        writer.client = types.SimpleNamespace(interactions=types.SimpleNamespace(create=create))
        writer.image_generation_enabled = False

        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaisesRegex(RuntimeError, "비활성화"):
                writer.generate_image("image", Path(temp), "tip:test")

        create.assert_not_called()

    def test_short_new_draft_skips_image_and_is_submitted_for_review(self) -> None:
        draft = DraftArticle(
            article_type="RELEASE_NEWS",
            category="WHISKY",
            title="검토 원고",
            content_html="<p>짧은 본문</p>",
            dedupe_key="release:short-review",
            semantic_fingerprint="short review",
            confidence=0.9,
            source_indexes=[0],
            image_prompt="editorial image",
            auto_publish_requested=False,
            generation_warning="1차=700자, 2차=900자",
        )
        source = SearchSource(
            title="Official release",
            url="https://example.com/release",
            domain="example.com",
            content="공식 출시 근거",
        )
        api = Mock()
        api.check_duplicate.return_value = {"duplicate": False}
        api.submit_article.return_value = {"id": 92, "status": "PENDING_REVIEW"}
        writer = Mock()
        writer.image_generation_enabled = True

        with tempfile.TemporaryDirectory() as temp:
            response = _process_draft(
                api,
                writer,
                draft,
                [source],
                Path(temp),
                {},
                Mock(),
            )

        self.assertEqual("PENDING_REVIEW", response["status"])
        submitted = api.submit_article.call_args.args[0]
        self.assertFalse(submitted["autoPublishRequested"])
        writer.generate_image.assert_not_called()
        api.upload_image.assert_not_called()


if __name__ == "__main__":
    unittest.main()
