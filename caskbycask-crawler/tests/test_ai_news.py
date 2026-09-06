from __future__ import annotations

import unittest
import sys
import types
import base64
import json
import tempfile
from pathlib import Path
from datetime import datetime, timedelta
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
from bs4 import BeautifulSoup

#: bs4 가 없는 번들 검증 런타임에서는 위 stub 이 Mock 을 넣는다 — 파싱이 필요한 테스트는 건너뛴다.
HAS_BS4 = not isinstance(BeautifulSoup, Mock)

from news_articles import (ArticleRef, _article_published_at, collect_source_articles,
                           date_from_url, discover_articles, extract_article_links,
                           get_public_url, is_recent, parse_datetime, parse_feed, read_article)
from news_models import SERVICE_ZONE
from news_official import (DIRECT_FETCH_BLOCKED_REASON, collect_registered_sources,
                           rotation_category)


def config_value(config, name: str):
    """google-genai 실제 타입과 최소 테스트 stub 양쪽을 같은 방식으로 검사한다."""
    return config[name] if isinstance(config, dict) else getattr(config, name)


def part_bytes(part) -> bytes:
    if isinstance(part, dict):
        return part["data"]
    return part.inline_data.data


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

def fake_fetcher(pages: dict[str, tuple[str, str]]):
    """URL -> (Content-Type, 본문) 표로 news_articles.get_public_url 을 흉내 낸다."""
    def _get(url, timeout, *, allowed_hosts=None):
        if url not in pages:
            raise requests.RequestException(f"not found: {url}")
        content_type, body = pages[url]
        return url, content_type, body
    return _get


RSS_FEED = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Example News</title>
  <item>
    <title>New single malt release</title>
    <link>https://example.com/2026/09/04/new-single-malt</link>
    <pubDate>Fri, 04 Sep 2026 09:00:00 +0900</pubDate>
  </item>
  <item>
    <title>Old news</title>
    <link>https://example.com/2026/01/02/old-news</link>
    <pubDate>Thu, 02 Jan 2026 09:00:00 +0900</pubDate>
  </item>
</channel></rss>"""

ATOM_FEED = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom release</title>
    <link rel="alternate" href="https://example.com/atom-release"/>
    <published>2026-09-04T09:00:00+09:00</published>
  </entry>
</feed>"""

LISTING_HTML = '<html><head><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head><body><a href="/2026/09/04/new-single-malt">New single malt release</a></body></html>'


class ArticleDiscoveryTest(unittest.TestCase):
    """등록 출처에서 기사 목록을 얻는 세 경로 — 피드 · 사이트맵 · 링크 추출."""

    @patch("news_articles.time.sleep")
    @patch("news_articles.get_public_response")
    @patch("news_articles.new_public_session")
    def test_public_request_retries_a_transient_connection_failure(
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

        final_url, content_type, body = get_public_url("https://example.com/news", 15)

        self.assertEqual("https://example.com/news", final_url)
        self.assertIn("text/html", content_type)
        self.assertEqual("<html>ok</html>", body)
        self.assertEqual(2, get_public.call_count)
        sleep.assert_called_once_with(1)
        response.close.assert_called_once()
        session.close.assert_called_once()

    @unittest.skipUnless(HAS_BS4, "bs4 필요")
    def test_feed_link_in_the_page_head_is_used_instead_of_scraping_links(self) -> None:
        """피드가 있으면 그쪽을 쓴다 — 발행일이 딸려 와서 기사를 열기 전에 최신성을 거를 수 있다."""
        pages = {
            "https://example.com/news": ("text/html", LISTING_HTML),
            "https://example.com/feed.xml": ("application/rss+xml", RSS_FEED),
        }
        with patch("news_articles.get_public_url", side_effect=fake_fetcher(pages)):
            refs, method = discover_articles(
                {"sourceUrl": "https://example.com/news", "domain": "example.com"}, 15, Mock())

        self.assertEqual("feed", method)
        self.assertEqual("https://example.com/2026/09/04/new-single-malt", refs[0].url)
        self.assertEqual("New single malt release", refs[0].title)
        self.assertEqual(2026, refs[0].published_at.year)
        self.assertEqual(9, refs[0].published_at.month)

    def test_registered_url_that_is_itself_a_feed_is_read_directly(self) -> None:
        pages = {"https://example.com/rss": ("application/rss+xml", RSS_FEED)}
        with patch("news_articles.get_public_url", side_effect=fake_fetcher(pages)):
            refs, method = discover_articles(
                {"sourceUrl": "https://example.com/rss", "domain": "example.com"}, 15, Mock())

        self.assertEqual("feed", method)
        self.assertEqual(2, len(refs))

    def test_atom_entries_use_the_link_href_attribute(self) -> None:
        """BeautifulSoup 의 html.parser 는 <link> 를 빈 요소로 봐서 링크를 잃는다. XML 로 읽어야 한다."""
        refs = parse_feed(ATOM_FEED, "https://example.com/atom")

        self.assertEqual(["https://example.com/atom-release"], [ref.url for ref in refs])
        self.assertEqual("Atom release", refs[0].title)
        self.assertIsNotNone(refs[0].published_at)

    @unittest.skipUnless(HAS_BS4, "bs4 필요")
    def test_link_extraction_is_the_last_resort_and_stays_inside_the_domain(self) -> None:
        html = (
            '<a href="/2026/09/04/whisky-release">위스키 신제품 출시</a>'
            '<a href="https://other.example/2026/09/04/outside">남의 도메인</a>'
            '<a href="/tag/news">태그 목록</a>'
            '<a href="#top">앵커</a>'
            '<a href="mailto:a@b.c">메일</a>'
        )

        refs = extract_article_links(html, "https://example.com/news", "example.com")

        self.assertEqual(["https://example.com/2026/09/04/whisky-release"], [ref.url for ref in refs])

    @unittest.skipUnless(HAS_BS4, "bs4 필요")
    def test_link_extraction_skips_the_listing_page_itself(self) -> None:
        html = '<a href="/news">현재 페이지</a><a href="/2026/09/04/release">기사</a>'

        refs = extract_article_links(html, "https://example.com/news", "example.com")

        self.assertEqual(["https://example.com/2026/09/04/release"], [ref.url for ref in refs])


class ArticleDateTest(unittest.TestCase):
    """발행일을 못 읽으면 '최근 3일'이라는 판단 자체가 성립하지 않는다."""

    def test_iso_and_rfc2822_and_date_only_are_all_accepted(self) -> None:
        self.assertEqual(2026, parse_datetime("2026-09-04T09:00:00+09:00").year)
        self.assertEqual(9, parse_datetime("Fri, 04 Sep 2026 09:00:00 +0900").month)
        self.assertEqual(4, parse_datetime("2026-09-04").day)
        self.assertIsNone(parse_datetime(""))
        self.assertIsNone(parse_datetime("어제"))

    def test_naive_datetime_is_read_as_korea_time(self) -> None:
        """국내 출처가 시간대를 빼먹는 일이 잦다. UTC 로 읽으면 9시간이 밀린다."""
        parsed = parse_datetime("2026-09-04T09:00:00")

        self.assertEqual(9, parsed.hour)
        self.assertEqual(SERVICE_ZONE.utcoffset(parsed.replace(tzinfo=None)),
                         parsed.utcoffset())

    def test_date_in_the_url_path_is_the_last_resort(self) -> None:
        found = date_from_url("https://nypost.com/2026/08/16/lifestyle/sarti-spritz")
        self.assertEqual((2026, 8, 16), (found.year, found.month, found.day))

        month_only = date_from_url("https://retailgazette.co.uk/blog/2026/08/kfc-chicken-wine")
        self.assertEqual((2026, 8, 1), (month_only.year, month_only.month, month_only.day))

        self.assertIsNone(date_from_url("https://example.com/news/whisky"))

    @unittest.skipUnless(HAS_BS4, "bs4 필요")
    def test_json_ld_meta_and_time_tags_are_read_in_order(self) -> None:
        json_ld = BeautifulSoup(
            '<script type="application/ld+json">'
            '{"@type":"NewsArticle","datePublished":"2026-09-04T10:00:00+09:00"}</script>',
            "html.parser")
        meta = BeautifulSoup(
            '<meta property="article:published_time" content="2026-09-03T10:00:00+09:00">',
            "html.parser")
        time_tag = BeautifulSoup('<time datetime="2026-09-02T10:00:00+09:00">이틀 전</time>',
                                 "html.parser")

        self.assertEqual(4, _article_published_at(json_ld, "https://example.com/a").day)
        self.assertEqual(3, _article_published_at(meta, "https://example.com/a").day)
        self.assertEqual(2, _article_published_at(time_tag, "https://example.com/a").day)

    def test_recent_window_boundary_is_inclusive(self) -> None:
        now = datetime(2026, 9, 5, 12, 0, tzinfo=SERVICE_ZONE)

        self.assertTrue(is_recent(now - timedelta(days=2), 3, reference=now))
        self.assertTrue(is_recent(now - timedelta(days=3), 3, reference=now))
        self.assertFalse(is_recent(now - timedelta(days=4), 3, reference=now))

    def test_article_without_a_date_is_kept(self) -> None:
        """날짜를 못 찾았다고 버리면 메타 태그가 없는 매체를 통째로 잃는다.
        같은 기사를 다시 잡는 것은 서버의 근거 URL 중복 판정이 막는다."""
        self.assertTrue(is_recent(None, 3))


class ArticleReadTest(unittest.TestCase):
    @unittest.skipUnless(HAS_BS4, "bs4 필요")
    def test_read_article_extracts_body_and_published_date(self) -> None:
        html = (
            '<html><head><title>Fallback</title>'
            '<meta property="article:published_time" content="2026-09-04T09:00:00+09:00">'
            "</head><body><nav>메뉴 메뉴 메뉴</nav>"
            "<article>" + ("공식 출시 소식 본문입니다. " * 20) + "</article>"
            "<footer>푸터</footer></body></html>"
        )
        pages = {"https://example.com/2026/09/04/release": ("text/html", html)}

        with patch("news_articles.get_public_url", side_effect=fake_fetcher(pages)):
            source = read_article(
                ArticleRef(url="https://example.com/2026/09/04/release", title="출시 소식"),
                "example.com", 15)

        self.assertEqual("example.com", source.domain)
        self.assertEqual("출시 소식", source.title)
        self.assertIn("공식 출시 소식 본문입니다.", source.content)
        # nav 와 footer 는 본문에서 빠진다 — 목록 페이지를 통째로 긁던 시절의 잡동사니가 이것이다.
        self.assertNotIn("메뉴 메뉴 메뉴", source.content)
        self.assertNotIn("푸터", source.content)
        self.assertTrue(source.published_at.startswith("2026-09-04"))

    def test_read_article_rejects_a_redirect_outside_the_registered_domain(self) -> None:
        def _get(url, timeout, *, allowed_hosts=None):
            return "https://other.example/hijacked", "text/html", "<html><body>x</body></html>"

        with patch("news_articles.get_public_url", side_effect=_get):
            with self.assertRaisesRegex(ValueError, "등록 도메인 밖"):
                read_article(ArticleRef(url="https://example.com/a"), "example.com", 15)


class SourceArticleCollectionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.config = {"id": 1, "sourceName": "공식", "sourceUrl": "https://example.com/news",
                       "domain": "example.com", "enabled": True}

    @staticmethod
    def _source(url: str, published_at: datetime | None) -> SearchSource:
        return SearchSource(title=url, url=url, domain="example.com", content="본문",
                            published_at=published_at.isoformat() if published_at else None)

    @patch("news_articles.time.sleep")
    def test_feed_dates_filter_before_any_article_is_opened(self, sleep: Mock) -> None:
        """피드에 날짜가 있으면 기사를 열기 전에 거른다 — 요청이 가장 적게 드는 경로다."""
        now = datetime.now(SERVICE_ZONE)
        refs = [
            ArticleRef(url="https://example.com/new", published_at=now - timedelta(days=1)),
            ArticleRef(url="https://example.com/old", published_at=now - timedelta(days=40)),
        ]
        read = Mock(side_effect=lambda ref, domain, timeout: self._source(ref.url, ref.published_at))

        with patch("news_articles.discover_articles", return_value=(refs, "feed")), \
                patch("news_articles.read_article", read):
            collected = collect_source_articles(self.config, 15, recent_days=3, limit=5, log=Mock())

        self.assertEqual(["https://example.com/new"], [source.url for source in collected])
        self.assertEqual(1, read.call_count)

    @patch("news_articles.time.sleep")
    def test_link_extracted_articles_are_filtered_after_reading(self, sleep: Mock) -> None:
        """링크 추출에는 날짜가 없다. 열어 본 뒤에 거를 수밖에 없다."""
        now = datetime.now(SERVICE_ZONE)
        refs = [ArticleRef(url="https://example.com/a"), ArticleRef(url="https://example.com/b")]
        dates = {"https://example.com/a": now - timedelta(days=1),
                 "https://example.com/b": now - timedelta(days=10)}
        read = Mock(side_effect=lambda ref, domain, timeout: self._source(ref.url, dates[ref.url]))

        with patch("news_articles.discover_articles", return_value=(refs, "links")), \
                patch("news_articles.read_article", read):
            collected = collect_source_articles(self.config, 15, recent_days=3, limit=5, log=Mock())

        self.assertEqual(["https://example.com/a"], [source.url for source in collected])
        self.assertEqual(2, read.call_count)

    @patch("news_articles.time.sleep")
    def test_per_source_limit_stops_opening_articles(self, sleep: Mock) -> None:
        refs = [ArticleRef(url=f"https://example.com/{i}") for i in range(10)]
        read = Mock(side_effect=lambda ref, domain, timeout: self._source(ref.url, None))

        with patch("news_articles.discover_articles", return_value=(refs, "links")), \
                patch("news_articles.read_article", read):
            collected = collect_source_articles(self.config, 15, recent_days=3, limit=3, log=Mock())

        self.assertEqual(3, len(collected))
        self.assertEqual(3, read.call_count)

    @patch("news_articles.time.sleep")
    def test_one_broken_article_does_not_lose_the_others(self, sleep: Mock) -> None:
        refs = [ArticleRef(url="https://example.com/a"), ArticleRef(url="https://example.com/b")]

        def _read(ref, domain, timeout):
            if ref.url.endswith("/a"):
                raise ValueError("HTTP 404")
            return self._source(ref.url, None)

        with patch("news_articles.discover_articles", return_value=(refs, "links")), \
                patch("news_articles.read_article", side_effect=_read):
            collected = collect_source_articles(self.config, 15, recent_days=3, limit=5, log=Mock())

        self.assertEqual(["https://example.com/b"], [source.url for source in collected])


class RegisteredSourceCollectionTest(unittest.TestCase):
    def test_release_search_rotates_one_category_per_run(self) -> None:
        """실행 순번만으로 우선 주종이 정해지고, 비율대로 순환한다."""
        ratios = {"WHISKY": 60, "WINE": 20, "COGNAC": 20}
        picks = [rotation_category(index, ratios) for index in range(10)]

        self.assertEqual(6, picks.count("WHISKY"))
        self.assertEqual(2, picks.count("WINE"))
        self.assertEqual(2, picks.count("COGNAC"))
        # 같은 순번이면 항상 같은 주종이어야 별도 상태 저장 없이 순환이 성립한다.
        self.assertEqual(picks[3], rotation_category(13, ratios))

    def test_rotation_falls_back_to_whisky_when_every_ratio_is_zero(self) -> None:
        self.assertEqual("WHISKY", rotation_category(0, {"WHISKY": 0, "WINE": 0, "COGNAC": 0}))

    @patch("news_official.collect_source_articles")
    def test_direct_fetch_blocked_platform_is_reported_as_an_error(self, collect: Mock) -> None:
        """확인할 방법이 없는 출처는 사유와 함께 실패로 남는다.

        제한 검색을 걷어내면서 인스타그램을 확인할 경로가 사라졌다. 조용히 '결과 없음'으로
        찍으면 관리자는 손쓸 수 없는 출처인 줄 모른 채 새 소식을 기다리게 된다.
        """
        config = {"sources": [{
            "id": 1, "sourceName": "메타베브코리아",
            "sourceUrl": "https://www.instagram.com/metabevkorea",
            "domain": "instagram.com", "enabled": True,
        }]}
        api = Mock()

        sources = collect_registered_sources(config, api, Mock(), timeout=15)

        self.assertEqual([], sources)
        collect.assert_not_called()
        api.record_source_crawl_result.assert_called_once_with(
            1, "ERROR", DIRECT_FETCH_BLOCKED_REASON)

    @patch("news_official.collect_source_articles")
    def test_source_without_recent_articles_is_no_result_not_an_error(self, collect: Mock) -> None:
        """목록은 정상인데 기간 안에 새 기사가 없는 것은 실패가 아니다.

        여기서 목록 페이지 URL 을 근거로 제출하면 서버 중복 판정이 그 출처를 영구히 잠근다.
        """
        config = {"sources": [{
            "id": 2, "sourceName": "조용한 출처", "sourceUrl": "https://quiet.example/news",
            "domain": "quiet.example", "enabled": True,
        }]}
        collect.return_value = []
        api = Mock()

        sources = collect_registered_sources(config, api, Mock(), timeout=15)

        self.assertEqual([], sources)
        api.record_source_crawl_result.assert_called_once_with(2, "NO_RESULT", None)

    @patch("news_official.collect_source_articles")
    def test_direct_failure_is_reported_with_its_reason(self, collect: Mock) -> None:
        """확인이 실패하면 사유와 함께 실패로 남는다.

        예전에는 제한 검색만 성공하면 모든 출처를 SUCCESS 로 찍었다. 그래서 등록 URL 이 깨져도
        출처 목록은 늘 '수집 성공'이었고, 관리자는 고칠 수 있는 문제를 볼 수 없었다.
        """
        config = {"sources": [{
            "id": 2, "sourceName": "Whisky Advocate News",
            "sourceUrl": "https://whiskyadvocate.com/Tag/news",
            "domain": "whiskyadvocate.com", "enabled": True,
        }]}
        collect.side_effect = TimeoutError("connect timeout")
        api = Mock()

        sources = collect_registered_sources(config, api, Mock(), timeout=15)

        self.assertEqual([], sources)
        api.record_source_crawl_result.assert_called_once_with(2, "ERROR", "connect timeout")

    @patch("news_official.collect_source_articles")
    def test_one_source_failing_does_not_change_the_others(self, collect: Mock) -> None:
        """실패는 실패한 출처에만 남는다 — 사유도 그 출처의 것이어야 한다."""
        config = {"sources": [
            {"id": 1, "sourceName": "정상", "sourceUrl": "https://ok.example/news",
             "domain": "ok.example", "enabled": True},
            {"id": 2, "sourceName": "깨진 출처", "sourceUrl": "https://broken.example/news",
             "domain": "broken.example", "enabled": True},
        ]}
        collect.side_effect = [
            [SearchSource(title="정상", url="https://ok.example/news/1",
                          domain="ok.example", content="본문")],
            ValueError("HTTP 404"),
        ]
        api = Mock()

        collect_registered_sources(config, api, Mock(), timeout=15)

        reported = {call.args[0]: call.args[1:] for call
                    in api.record_source_crawl_result.call_args_list}
        self.assertEqual(("SUCCESS", None), reported[1])
        self.assertEqual(("ERROR", "HTTP 404"), reported[2])

    @patch("news_official.collect_source_articles")
    def test_disabled_source_is_not_collected(self, collect: Mock) -> None:
        """수집 대상 판단은 '수집 활성' 하나뿐이다."""
        config = {"sources": [
            {"id": 1, "sourceName": "켜 둔 출처", "sourceUrl": "https://forum.example/news",
             "domain": "forum.example", "enabled": True},
            {"id": 2, "sourceName": "꺼 둔 출처", "sourceUrl": "https://off.example/news",
             "domain": "off.example", "enabled": False},
        ]}
        collect.return_value = [SearchSource(title="글", url="https://forum.example/news/1",
                                             domain="forum.example", content="본문")]
        api = Mock()

        collect_registered_sources(config, api, Mock(), timeout=15)

        reported = [call.args[0] for call in api.record_source_crawl_result.call_args_list]
        self.assertEqual([1], reported)

    @patch("news_official.collect_source_articles")
    def test_run_budget_defers_remaining_sources_without_faking_their_status(
        self, collect: Mock
    ) -> None:
        """상한에 걸려 확인하지 못한 출처의 상태를 덮어쓰지 않는다.

        확인도 안 하고 '결과 없음'으로 찍으면 관리자가 보는 상태가 거짓이 된다.
        """
        config = {"sources": [
            {"id": 1, "sourceName": "첫 출처", "sourceUrl": "https://a.example/news",
             "domain": "a.example", "enabled": True},
            {"id": 2, "sourceName": "다음 실행으로", "sourceUrl": "https://b.example/news",
             "domain": "b.example", "enabled": True},
        ]}
        collect.return_value = [
            SearchSource(title=f"기사 {i}", url=f"https://a.example/news/{i}",
                         domain="a.example", content="본문") for i in range(2)
        ]
        api = Mock()

        collect_registered_sources(config, api, Mock(), timeout=15, max_articles=2)

        self.assertEqual(1, collect.call_count)
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

    def test_lead_rejected_by_the_server_as_a_shared_source_counts_as_duplicate(self) -> None:
        """사전 확인은 근거 URL 겹침 단계를 보지 않는다. created=False 를 안 보면
        새 원고가 0건인데 실행 이력에는 '검토 N건'으로 찍힌다."""
        lead = NewsLead(category="WHISKY", title="같은 사건", summary="요약",
                        event_key="shared", source_indexes=[0], confidence=0.9)
        source = SearchSource(title="t", url="https://example.com/a", domain="example.com", content="c")
        api = Mock()
        api.check_duplicate.return_value = {"duplicate": False}
        api.submit_lead.return_value = {"created": False, "id": 61, "status": "PENDING_REVIEW"}

        self.assertIsNone(_process_lead(api, lead, [source], Mock()))

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
