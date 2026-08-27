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
from news_models import (NewsLead, SearchSource, UsageAccumulator, canonicalize_url,
                         local_datetime_string, truncate_utf16)
from news_gemini import GeminiLeadFinder
from news_main import _lead_payload, _process_lead
from alerts.ai_news_error_alert import append_error_detail, format_error_alert
from news_prompts import AI_NEWS_LEAD_PROMPT, AI_NEWS_TITLE_MAX_LENGTH
from news_tavily import TavilyNewsSearch
from news_source_config import matching_source_config
from news_official import (CATEGORY_QUERIES, _direct_source, _get_public_url, _targeted_match,
                           collect_registered_sources, rotation_category)


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
        )

        payload = source.evidence_payload()

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

        self.assertEqual(0, usage.input_tokens)
        self.assertEqual(7, usage.output_tokens)
        self.assertEqual({"input": 0, "output": 7}, usage.by_model["gpt-test"])

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
        }, 15)

        self.assertEqual("example.com", source.domain)
        get_public.assert_called_once_with(
            "https://example.com/news",
            15,
            allowed_hosts={"example.com"},
        )

    def test_account_rule_wins_over_domain_rule_only_for_matching_path(self) -> None:
        configs = [
            {"domain": "instagram.com", "pathPrefix": ""},
            {"domain": "instagram.com", "pathPrefix": "/metabevkorea"},
        ]

        account = matching_source_config(
            "https://www.instagram.com/metabevkorea/news", "instagram.com", configs
        )
        other = matching_source_config(
            "https://www.instagram.com/another_account", "instagram.com", configs
        )

        self.assertEqual("/metabevkorea", account["pathPrefix"])
        self.assertEqual("", other["pathPrefix"])

    def test_similar_account_name_does_not_match_prefix(self) -> None:
        configs = [
            {"domain": "instagram.com", "pathPrefix": "/metabevkorea"},
        ]

        matched = matching_source_config(
            "https://instagram.com/metabevkorea_fake", "instagram.com", configs
        )

        self.assertIsNone(matched)

    def test_release_search_rotates_one_category_per_run(self) -> None:
        """실행 순번만으로 집중 주종이 정해지고, 비율대로 순환한다."""
        ratios = {"WHISKY": 60, "WINE": 20, "COGNAC": 20}
        picks = [rotation_category(index, ratios) for index in range(10)]

        self.assertEqual(6, picks.count("WHISKY"))
        self.assertEqual(2, picks.count("WINE"))
        self.assertEqual(2, picks.count("COGNAC"))
        # 같은 순번이면 항상 같은 주종이어야 별도 상태 저장 없이 순환이 성립한다.
        self.assertEqual(picks[3], rotation_category(13, ratios))

    def test_rotation_falls_back_to_whisky_when_every_ratio_is_zero(self) -> None:
        self.assertEqual("WHISKY", rotation_category(0, {"WHISKY": 0, "WINE": 0, "COGNAC": 0}))

    def test_registered_search_is_domain_restricted_and_category_focused(self) -> None:
        """허용목록 밖 도메인은 검색 대상이 아니다 — 출처 목록이 불어나던 통로를 막은 부분이다."""
        config = {"sources": [{
            "id": 1, "sourceName": "공식", "sourceUrl": "https://whiskymag.example/news",
            "domain": "whiskymag.example", "pathPrefix": "/news", "enabled": True,
        }]}
        search = Mock()
        search.search.return_value = []
        api = Mock()

        with patch("news_official._direct_source", side_effect=ValueError("skip")):
            collect_registered_sources(config, search, api, Mock(), 5, category="WINE")

        kwargs = search.search.call_args.kwargs
        self.assertEqual(["whiskymag.example"], kwargs["include_domains"])
        self.assertIn(CATEGORY_QUERIES["WINE"], search.search.call_args.args[0])

    def test_social_post_can_be_assigned_to_registered_account_by_handle_evidence(self) -> None:
        configs = [{
            "id": 1,
            "domain": "instagram.com",
            "pathPrefix": "/metabevkorea",
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
        # 검색으로만 확인하는 출처는 결과가 없으면 '성공'이 아니다 —
        # 예전에는 여기서도 SUCCESS 로 찍혀서 계정이 바뀌어도 아무도 몰랐다.
        api.record_source_crawl_result.assert_called_once_with(1, "NO_RESULT", None)

    @patch("news_official._direct_source")
    def test_empty_search_no_longer_hides_a_direct_failure(self, direct_source: Mock) -> None:
        """제한 검색이 정상 완료돼도 직접 확인 실패를 덮지 않는다.

        예전에는 검색만 성공하면 모든 출처를 SUCCESS 로 찍었다. 그래서 등록 URL 이 깨져도
        출처 목록은 늘 '수집 성공'이었고, 관리자는 고칠 수 있는 문제를 볼 수 없었다.
        일시적 실패는 다음 실행에서 성공으로 덮이므로 사유를 남기는 쪽이 안전하다.
        """
        config = {"sources": [{
            "id": 2,
            "sourceName": "Whisky Advocate News",
            "sourceUrl": "https://whiskyadvocate.com/Tag/news",
            "domain": "whiskyadvocate.com",
            "pathPrefix": "/Tag/news",
            "enabled": True,
        }]}
        direct_source.side_effect = TimeoutError("connect timeout")
        search = Mock()
        search.search.return_value = []
        api = Mock()

        sources = collect_registered_sources(config, search, api, Mock(), timeout=15)

        self.assertEqual([], sources)
        api.record_source_crawl_result.assert_called_once_with(2, "ERROR", "connect timeout")

    @patch("news_official._direct_source")
    def test_failed_fallback_keeps_direct_failure(self, direct_source: Mock) -> None:
        config = {"sources": [{
            "id": 2,
            "sourceName": "Whisky Advocate News",
            "sourceUrl": "https://whiskyadvocate.com/Tag/news",
            "domain": "whiskyadvocate.com",
            "pathPrefix": "/Tag/news",
            "enabled": True,
        }]}
        direct_source.side_effect = TimeoutError("connect timeout")
        search = Mock()
        search.search.side_effect = RuntimeError("Tavily unavailable")
        api = Mock()

        collect_registered_sources(config, search, api, Mock(), timeout=15)

        api.record_source_crawl_result.assert_called_once_with(2, "ERROR", "connect timeout")

    @patch("news_official._direct_source")
    def test_one_source_failing_does_not_change_the_others(self, direct_source: Mock) -> None:
        """실패는 실패한 출처에만 남는다 — 사유도 그 출처의 것이어야 한다."""
        config = {"sources": [
            {"id": 1, "sourceName": "정상", "sourceUrl": "https://ok.example/news",
             "domain": "ok.example", "pathPrefix": "/news", "enabled": True},
            {"id": 2, "sourceName": "깨진 출처", "sourceUrl": "https://broken.example/news",
             "domain": "broken.example", "pathPrefix": "/news", "enabled": True},
        ]}
        direct_source.side_effect = [
            SearchSource(title="정상", url="https://ok.example/news/1",
                         domain="ok.example", content="본문"),
            ValueError("HTTP 404"),
        ]
        search = Mock()
        search.search.return_value = []
        api = Mock()

        collect_registered_sources(config, search, api, Mock(), timeout=15)

        reported = {call.args[0]: call.args[1:] for call
                    in api.record_source_crawl_result.call_args_list}
        self.assertEqual(("SUCCESS", None), reported[1])
        self.assertEqual(("ERROR", "HTTP 404"), reported[2])

    @patch("news_official._direct_source")
    def test_disabled_source_is_not_collected_and_grade_no_longer_matters(
        self, direct_source: Mock
    ) -> None:
        """수집 대상 판단은 '수집 활성' 하나뿐이다.

        예전에는 등급까지 봐서, 활성이어도 등급이 커뮤니티면 조용히 빠졌다.
        """
        config = {"sources": [
            {"id": 1, "sourceName": "커뮤니티였던 출처", "sourceUrl": "https://forum.example/news",
             "domain": "forum.example", "pathPrefix": "/news", "enabled": True},
            {"id": 2, "sourceName": "꺼 둔 출처", "sourceUrl": "https://off.example/news",
             "domain": "off.example", "pathPrefix": "/news", "enabled": False},
        ]}
        direct_source.return_value = SearchSource(
            title="글", url="https://forum.example/news/1", domain="forum.example", content="본문")
        search = Mock()
        search.search.return_value = []
        api = Mock()

        collect_registered_sources(config, search, api, Mock(), timeout=15)

        self.assertEqual(["forum.example"], search.search.call_args.kwargs["include_domains"])
        reported = [call.args[0] for call in api.record_source_crawl_result.call_args_list]
        self.assertEqual([1], reported)


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


class GeminiLeadFinderTest(unittest.TestCase):
    def test_lead_prompt_keeps_title_accuracy_rules(self) -> None:
        """본문 규칙은 사라졌지만 제목을 틀리게 만드는 규칙은 남아야 한다."""
        self.assertIn("발표 · 공개 · 출시 · 판매 시점 구분", AI_NEWS_LEAD_PROMPT)
        self.assertIn("해외 출시를 국내 출시로 오인하지 않는다", AI_NEWS_LEAD_PROMPT)
        self.assertIn("고유명사 보존", AI_NEWS_LEAD_PROMPT)
        self.assertIn("공식 한국어 제품명", AI_NEWS_LEAD_PROMPT)
        self.assertIn(f"{AI_NEWS_TITLE_MAX_LENGTH}자 이내", AI_NEWS_LEAD_PROMPT)

    def test_lead_prompt_covers_releases_events_and_awards(self) -> None:
        for wanted in ("신제품 출시", "국내 수입", "이벤트", "시음회", "어워드 및 수상 결과"):
            self.assertIn(wanted, AI_NEWS_LEAD_PROMPT)
        # 제품 변경 소식은 수집 대상이 아니다.
        self.assertIn("단종", AI_NEWS_LEAD_PROMPT.split("다음은 제외한다.", 1)[1])

    def test_lead_prompt_does_not_ask_for_a_body(self) -> None:
        """본문 작성 규칙이 되살아나면 관리자가 버릴 원고를 다시 만들게 된다."""
        for gone in ("content_html", "HTML 태그", "Tone & Manner", "해시태그"):
            self.assertNotIn(gone, AI_NEWS_LEAD_PROMPT)
        self.assertIn("본문은 작성하지 않는다", AI_NEWS_LEAD_PROMPT)

    def test_lead_finder_accepts_other_category_and_builds_dedupe_key(self) -> None:
        finder = GeminiLeadFinder.__new__(GeminiLeadFinder)
        finder.classifier_model = "gemini-test-lite"
        finder._request_json = Mock(return_value={"leads": [{
            "category": "OTHER",
            "event_key": "new-rum-release",
            "title": "신규 럼 출시",
            "summary": "신규 럼 출시 공식 발표입니다.",
            "source_indexes": [0],
            "confidence": 0.92,
        }]})
        source = SearchSource(
            title="신규 럼 출시",
            url="https://example.com/rum",
            domain="example.com",
            content="신규 럼 출시 공식 발표",
        )

        leads = finder.find_leads([source], 1)

        self.assertEqual("OTHER", leads[0].category)
        self.assertEqual("신규 럼 출시", leads[0].title)
        self.assertEqual("release:new-rum-release", leads[0].dedupe_key)

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
        finder = GeminiLeadFinder.__new__(GeminiLeadFinder)
        finder.client = types.SimpleNamespace(models=types.SimpleNamespace(generate_content=generate))
        finder.usage = UsageAccumulator()

        schema = {"type": "object", "properties": {"ok": {"type": "boolean"}}, "required": ["ok"]}
        result = finder._request_json("gemini-test-lite", "system", {"value": "테스트"}, schema)

        self.assertTrue(result["ok"])
        self.assertEqual(11, finder.usage.input_tokens)
        self.assertEqual(12, finder.usage.output_tokens)
        config = generate.call_args.kwargs["config"]
        self.assertEqual("application/json", config_value(config, "response_mime_type"))
        self.assertEqual(schema, config_value(config, "response_json_schema"))

    def test_malformed_json_is_retried_once(self) -> None:
        responses = [
            types.SimpleNamespace(text='{"title":"미완성"', usage_metadata=None),
            types.SimpleNamespace(text='{"title":"완성"}', usage_metadata=None),
        ]
        generate = Mock(side_effect=responses)
        finder = GeminiLeadFinder.__new__(GeminiLeadFinder)
        finder.client = types.SimpleNamespace(models=types.SimpleNamespace(generate_content=generate))
        finder.usage = UsageAccumulator()

        result = finder._request_json(
            "gemini-test-lite", "system", {"value": "테스트"},
            {"type": "object", "properties": {"title": {"type": "string"}}, "required": ["title"]},
        )

        self.assertEqual("완성", result["title"])
        self.assertEqual(2, generate.call_count)

    def test_lead_is_saved_without_a_body(self) -> None:
        """소재에는 본문이 없다. 관리자가 근거를 보고 직접 쓴다."""
        lead = NewsLead(
            category="WHISKY",
            title="발베니 14년 캐리비안 캐스크 국내 출시",
            summary="윌리엄그랜트앤선즈코리아가 9월 정식 수입한다고 발표했습니다.",
            event_key="balvenie-14-caribbean",
            source_indexes=[0],
            confidence=0.9,
            model_name="gemini-test-lite",
        )
        source = SearchSource(
            title="Official release",
            url="https://example.com/release",
            domain="example.com",
            content="공식 출시 근거",
        )
        api = Mock()
        api.check_duplicate.return_value = {"duplicate": False}
        api.submit_lead.return_value = {"id": 92, "status": "PENDING_REVIEW"}

        response = _process_lead(api, lead, [source], Mock())

        self.assertEqual("PENDING_REVIEW", response["status"])
        submitted = api.submit_lead.call_args.args[0]
        self.assertEqual("release:balvenie-14-caribbean", submitted["dedupeKey"])
        self.assertIn("9월 정식 수입", submitted["leadSummary"])
        self.assertEqual(1, len(submitted["sources"]))
        # 본문·이미지·해시태그는 크롤러가 만들지 않는다.
        for absent in ("content", "imageUrl", "hashtags", "semanticFingerprint", "autoPublishRequested"):
            self.assertNotIn(absent, submitted)

    def test_duplicate_lead_is_not_submitted(self) -> None:
        lead = NewsLead(category="WHISKY", title="중복", summary="요약",
                        event_key="dup", source_indexes=[0], confidence=0.9)
        source = SearchSource(title="t", url="https://example.com/a", domain="example.com", content="c")
        api = Mock()
        api.check_duplicate.return_value = {"duplicate": True, "articleId": 7}

        self.assertIsNone(_process_lead(api, lead, [source], Mock()))
        api.submit_lead.assert_not_called()

    def test_lead_payload_uses_the_first_source_for_the_canonical_hash(self) -> None:
        lead = NewsLead(category="WINE", title="빈티지 공개", summary="요약",
                        event_key="vintage-reveal", source_indexes=[1], confidence=0.8)
        sources = [
            SearchSource(title="a", url="https://a.example/1", domain="a.example", content="a"),
            SearchSource(title="b", url="https://b.example/2", domain="b.example", content="b"),
        ]

        payload = _lead_payload(lead, sources)

        self.assertEqual(64, len(payload["canonicalUrlHash"]))
        self.assertEqual(["b.example"], [s["domain"] for s in payload["sources"]])


if __name__ == "__main__":
    unittest.main()
