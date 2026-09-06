"""등록 출처에서 **개별 기사**를 찾아 읽는다.

예전에는 등록된 목록 페이지 하나를 통째로 긁어 그 텍스트를 근거로 삼았다. 그래서

  ① 기사별 발행일을 알 수 없어 '최근 것만'이라는 판단을 아예 할 수 없었다.
     프롬프트에 "오래된 기사 제외" 규칙이 있었지만 입력에 날짜가 없어 죽은 규칙이었다.
  ② 근거 URL 이 늘 목록 페이지라 관리자가 원문을 열 수 없었다.
  ③ 같은 목록 URL 이 매번 반복돼 서버 중복 판정(근거 URL 겹침)에 걸렸다.

지금은 기사 단위로 본다. **피드가 있으면 피드에서 발행일을 먼저 읽어 최근 것만 골라 낸 뒤
그 기사만 연다** — 요청이 가장 적게 드는 경로이자, 날짜를 가장 믿을 수 있는 경로다.
"""
from __future__ import annotations

import json
import re
import time
import xml.etree.ElementTree as ElementTree
from dataclasses import dataclass
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from urllib.parse import urljoin, urlsplit

import requests
from bs4 import BeautifulSoup

from news_models import SERVICE_ZONE, SearchSource
from safe_http import get_public_response, new_public_session, read_limited_body


DIRECT_REQUEST_ATTEMPTS = 2
MAX_BODY_BYTES = 2 * 1024 * 1024

#: 등록 페이지에서 피드 링크를 못 찾았을 때만 시도하는 관용 경로. 요청 낭비를 막으려고 짧게 끊는다.
FEED_GUESS_PATHS = ("/feed", "/rss", "/feed.xml")
#: 사이트맵 색인에서 따라갈 하위 사이트맵 수. 색인 전체를 훑으면 요청이 끝없이 는다.
SITEMAP_CHILD_LIMIT = 1
#: 목록 페이지 링크 추출로 넘어갔을 때 후보로 삼을 링크 수의 상한(열어 볼 수는 limit 만큼).
LINK_CANDIDATE_LIMIT = 40
#: 기사 요청 사이 지연. 핫딜 크롤러의 REQUEST_DELAY_SEC 관례를 따른다.
ARTICLE_REQUEST_DELAY_SEC = 0.5

_FEED_CONTENT_TYPES = ("xml", "rss", "atom")
_DATE_IN_PATH = re.compile(r"/(\d{4})/(\d{1,2})(?:/(\d{1,2}))?(?:/|$)")
_ARTICLE_DATE_META = (
    ("meta", {"property": "article:published_time"}, "content"),
    ("meta", {"property": "og:published_time"}, "content"),
    ("meta", {"itemprop": "datePublished"}, "content"),
    ("meta", {"name": "date"}, "content"),
    ("meta", {"name": "pubdate"}, "content"),
    ("meta", {"name": "publish-date"}, "content"),
    ("meta", {"name": "DC.date.issued"}, "content"),
)


@dataclass
class ArticleRef:
    """기사 하나를 가리키는 최소 정보. 발행일은 아직 모를 수 있다."""

    url: str
    title: str | None = None
    published_at: datetime | None = None


def now_local() -> datetime:
    return datetime.now(SERVICE_ZONE)


def parse_datetime(value: str | None) -> datetime | None:
    """피드·메타 태그의 날짜 문자열을 KST 기준 aware datetime 으로 바꾼다.

    ISO 8601, RFC 2822(RSS ``pubDate``), 날짜만 있는 형태를 모두 받는다.
    시간대가 없으면 KST 로 본다 — 국내 출처가 시간대를 빼먹는 일이 잦다.
    """
    candidate = str(value or "").strip()
    if not candidate:
        return None
    parsed: datetime | None = None
    try:
        text = candidate.replace("Z", "+00:00")
        if len(text) == 10:
            text += "T00:00:00"
        parsed = datetime.fromisoformat(text)
    except ValueError:
        try:
            parsed = parsedate_to_datetime(candidate)
        except (TypeError, ValueError):
            parsed = None
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=SERVICE_ZONE)
    return parsed.astimezone(SERVICE_ZONE)


def date_from_url(url: str) -> datetime | None:
    """경로에 박힌 ``/2026/08/16/`` 형태를 마지막 수단으로 읽는다.

    메타 태그가 전혀 없는 매체가 있어서 남겨 둔다. 날짜만 알면 최신성 판단은 할 수 있다.
    """
    match = _DATE_IN_PATH.search(urlsplit(url).path)
    if not match:
        return None
    year, month, day = match.group(1), match.group(2), match.group(3) or "1"
    try:
        return datetime(int(year), int(month), int(day), tzinfo=SERVICE_ZONE)
    except ValueError:
        return None


def get_public_url(url: str, timeout: int, *, allowed_hosts: set[str] | None = None) -> tuple[str, str, str]:
    """SSRF 방어를 거쳐 공개 URL 을 읽는다. (최종 URL, Content-Type, 본문)"""
    session = new_public_session()
    try:
        for attempt in range(DIRECT_REQUEST_ATTEMPTS):
            try:
                response, final_url = get_public_response(
                    session,
                    url,
                    timeout=timeout,
                    allowed_hosts=allowed_hosts,
                    headers={"User-Agent": "CaskByCaskBot/1.0 (+official-source-check)"},
                )
                break
            except requests.RequestException:
                if attempt + 1 >= DIRECT_REQUEST_ATTEMPTS:
                    raise
                time.sleep(attempt + 1)
        else:  # pragma: no cover - 재시도 반복문의 방어 코드
            raise RuntimeError("공개 URL 응답을 받지 못했습니다.")

        try:
            content_type = str(response.headers.get("Content-Type") or "").lower()
            encoding = response.encoding or "utf-8"
            body = read_limited_body(response, MAX_BODY_BYTES)
            return final_url, content_type, body.decode(encoding, errors="replace")
        finally:
            response.close()
    finally:
        session.close()


def _local_name(tag: str) -> str:
    return str(tag).rsplit("}", 1)[-1].lower()


def _child_text(element, *names: str) -> str | None:
    wanted = {name.lower() for name in names}
    for child in element:
        if _local_name(child.tag) in wanted and (child.text or "").strip():
            return child.text.strip()
    return None


def _entry_link(element) -> str | None:
    """RSS 는 <link> 본문, Atom 은 <link href=...> 다."""
    for child in element:
        if _local_name(child.tag) != "link":
            continue
        href = (child.get("href") or "").strip()
        if href and child.get("rel", "alternate") == "alternate":
            return href
        if (child.text or "").strip():
            return child.text.strip()
    return _child_text(element, "guid", "id")


def parse_feed(text: str, base_url: str) -> list[ArticleRef]:
    """RSS 2.0 / Atom 을 읽어 기사 목록을 만든다.

    표준 라이브러리 ElementTree 를 쓴다. 본문 크기는 ``read_limited_body`` 가 2MB 로 막고,
    ElementTree 는 기본 설정에서 외부 엔티티를 해석하지 않는다.
    BeautifulSoup 의 html.parser 는 ``<link>`` 를 빈 요소로 봐서 RSS 의 링크를 잃는다 — 쓰면 안 된다.
    """
    root = ElementTree.fromstring(text)
    refs: list[ArticleRef] = []
    for element in root.iter():
        if _local_name(element.tag) not in {"item", "entry"}:
            continue
        link = _entry_link(element)
        if not link:
            continue
        url = urljoin(base_url, link.strip())
        if not url.startswith(("http://", "https://")):
            continue
        refs.append(ArticleRef(
            url=url,
            title=_child_text(element, "title"),
            published_at=parse_datetime(
                _child_text(element, "pubdate", "published", "date", "updated")
            ) or date_from_url(url),
        ))
    return refs


def parse_sitemap(text: str, base_url: str) -> tuple[list[ArticleRef], list[str]]:
    """사이트맵을 읽어 (기사 목록, 하위 사이트맵 URL 목록) 을 돌려준다."""
    root = ElementTree.fromstring(text)
    if _local_name(root.tag) == "sitemapindex":
        children = [urljoin(base_url, loc) for loc in
                    (_child_text(node, "loc") for node in root if _local_name(node.tag) == "sitemap")
                    if loc]
        # 뉴스 사이트맵이 따로 있으면 그쪽이 훨씬 정확하다.
        children.sort(key=lambda value: 0 if "news" in value.lower() else 1)
        return [], children

    refs: list[ArticleRef] = []
    for node in root:
        if _local_name(node.tag) != "url":
            continue
        loc = _child_text(node, "loc")
        if not loc:
            continue
        url = urljoin(base_url, loc)
        published = _child_text(node, "publication_date", "lastmod")
        if published is None:
            for child in node:
                published = _child_text(child, "publication_date", "publication_date")
                if published:
                    break
        refs.append(ArticleRef(
            url=url,
            title=None,
            published_at=parse_datetime(published) or date_from_url(url),
        ))
    return refs, []


def _looks_like_article(url: str, listing_url: str, text: str) -> bool:
    """목록 페이지의 링크 중 기사로 보이는 것만 남긴다."""
    if url.split("#", 1)[0].rstrip("/") == listing_url.split("#", 1)[0].rstrip("/"):
        return False
    path = urlsplit(url).path.strip("/")
    if not path:
        return False
    segments = [segment for segment in path.split("/") if segment]
    if _DATE_IN_PATH.search(f"/{path}"):
        return True
    if len(segments) < 2:
        return False
    # 마지막 조각이 슬러그처럼 길면 기사일 가능성이 높다. /tag/whisky 같은 목록은 걸러진다.
    return len(segments[-1]) >= 12 or len(str(text or "").strip()) >= 20


def extract_article_links(html: str, listing_url: str, domain: str) -> list[ArticleRef]:
    """피드도 사이트맵도 없을 때, 목록 페이지의 링크에서 기사 후보를 고른다.

    등록 도메인 밖 링크는 애초에 후보가 아니다 — 허용목록이 유일한 발견 경로라는 원칙은
    여기서도 그대로다. 목록 페이지는 최신 글을 위에 두므로 문서 순서를 유지한다.
    """
    soup = BeautifulSoup(html, "html.parser")
    refs: list[ArticleRef] = []
    seen: set[str] = set()
    for anchor in soup.find_all("a", href=True):
        href = str(anchor["href"]).strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        url = urljoin(listing_url, href)
        if not url.startswith(("http://", "https://")):
            continue
        host = (urlsplit(url).hostname or "").lower().removeprefix("www.")
        if host != domain:
            continue
        url = url.split("#", 1)[0]
        if url in seen:
            continue
        title = anchor.get_text(" ", strip=True)
        if not _looks_like_article(url, listing_url, title):
            continue
        seen.add(url)
        refs.append(ArticleRef(url=url, title=title or None, published_at=date_from_url(url)))
        if len(refs) >= LINK_CANDIDATE_LIMIT:
            break
    return refs


def _is_xml_document(content_type: str, body: str) -> bool:
    """피드든 사이트맵이든, XML 로 읽어야 하는 응답인지 본다."""
    if any(token in content_type for token in _FEED_CONTENT_TYPES):
        head = body.lstrip()[:400].lower()
        return "<rss" in head or "<feed" in head or "<urlset" in head or "<sitemapindex" in head
    return False


def _feed_link_from_html(html: str, base_url: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    for link in soup.find_all("link", href=True):
        rel = " ".join(link.get("rel") or []).lower()
        link_type = str(link.get("type") or "").lower()
        if "alternate" in rel and ("rss" in link_type or "atom" in link_type):
            return urljoin(base_url, str(link["href"]).strip())
    return None


def discover_articles(config: dict, timeout: int, log) -> tuple[list[ArticleRef], str]:
    """등록 출처에서 기사 목록을 얻는다. (기사 목록, 사용한 방법) 을 돌려준다.

    피드 → 사이트맵 → 목록 링크 추출 순으로 시도하고 **처음 성공한 곳에서 멈춘다.**
    피드가 가장 먼저인 이유는 발행일이 딸려 오기 때문이다 — 기사를 열기 전에 최신성을 거를 수 있다.
    """
    source_url = str(config.get("sourceUrl") or "").strip()
    domain = str(config.get("domain") or "").lower().removeprefix("www.")
    allowed = {domain}

    final_url, content_type, body = get_public_url(source_url, timeout, allowed_hosts=allowed)
    if _is_xml_document(content_type, body):
        refs, children = ([], [])
        head = body.lstrip()[:400].lower()
        if "<urlset" in head or "<sitemapindex" in head:
            refs, children = parse_sitemap(body, final_url)
            refs = refs or _follow_sitemap_children(children, allowed, timeout, log)
        else:
            refs = parse_feed(body, final_url)
        if refs:
            return refs, "feed"

    if "html" not in content_type and "text" not in content_type and "xml" not in content_type:
        raise ValueError(f"지원하지 않는 콘텐츠 형식입니다: {content_type or 'unknown'}")

    feed_url = _feed_link_from_html(body, final_url)
    for candidate in filter(None, [feed_url, *(urljoin(final_url, path) for path in FEED_GUESS_PATHS)]):
        try:
            _, feed_type, feed_body = get_public_url(candidate, timeout, allowed_hosts=allowed)
        except Exception as error:  # noqa: BLE001
            log.debug("피드 후보 실패 %s: %s", candidate, error)
            continue
        if not _is_xml_document(feed_type, feed_body):
            continue
        try:
            refs = parse_feed(feed_body, candidate)
        except ElementTree.ParseError as error:
            log.debug("피드 파싱 실패 %s: %s", candidate, error)
            continue
        if refs:
            return refs, "feed"

    sitemap_refs = _sitemap_articles(final_url, allowed, timeout, log)
    if sitemap_refs:
        return sitemap_refs, "sitemap"

    return extract_article_links(body, final_url, domain), "links"


def _sitemap_articles(base_url: str, allowed: set[str], timeout: int, log) -> list[ArticleRef]:
    sitemap_url = urljoin(base_url, "/sitemap.xml")
    try:
        _, content_type, body = get_public_url(sitemap_url, timeout, allowed_hosts=allowed)
    except Exception as error:  # noqa: BLE001
        log.debug("사이트맵 없음 %s: %s", sitemap_url, error)
        return []
    if not _is_xml_document(content_type, body):
        return []
    try:
        refs, children = parse_sitemap(body, sitemap_url)
    except ElementTree.ParseError as error:
        log.debug("사이트맵 파싱 실패 %s: %s", sitemap_url, error)
        return []
    return refs or _follow_sitemap_children(children, allowed, timeout, log)


def _follow_sitemap_children(children: list[str], allowed: set[str], timeout: int, log) -> list[ArticleRef]:
    for child in children[:SITEMAP_CHILD_LIMIT]:
        try:
            _, content_type, body = get_public_url(child, timeout, allowed_hosts=allowed)
            if not _is_xml_document(content_type, body):
                continue
            refs, _ = parse_sitemap(body, child)
        except Exception as error:  # noqa: BLE001
            log.debug("하위 사이트맵 실패 %s: %s", child, error)
            continue
        if refs:
            return refs
    return []


def _article_published_at(soup: BeautifulSoup, url: str) -> datetime | None:
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or script.get_text() or "{}")
        except (ValueError, TypeError):
            continue
        for node in data if isinstance(data, list) else [data]:
            if not isinstance(node, dict):
                continue
            found = parse_datetime(node.get("datePublished") or node.get("dateCreated"))
            if found:
                return found
    for tag, attrs, key in _ARTICLE_DATE_META:
        node = soup.find(tag, attrs=attrs)
        if node and node.get(key):
            found = parse_datetime(str(node.get(key)))
            if found:
                return found
    for node in soup.find_all("time"):
        found = parse_datetime(str(node.get("datetime") or node.get_text(" ", strip=True)))
        if found:
            return found
    return date_from_url(url)


def _article_text(soup: BeautifulSoup) -> str:
    for node in soup(["script", "style", "noscript", "nav", "header", "footer", "aside", "form"]):
        node.decompose()
    # 본문 컨테이너가 있으면 그쪽만 읽는다. body 를 통째로 읽으면 GNB·배너가 앞을 다 차지한다.
    for selector in ("article", "main", '[itemprop="articleBody"]'):
        container = soup.select_one(selector)
        if container:
            text = container.get_text("\n", strip=True)
            if len(text) >= 200:
                return text[:12000]
    return soup.get_text("\n", strip=True)[:12000]


def read_article(ref: ArticleRef, domain: str, timeout: int) -> SearchSource:
    """기사 한 건을 열어 본문과 발행일을 채운다."""
    final_url, content_type, body = get_public_url(ref.url, timeout, allowed_hosts={domain})
    final_domain = (urlsplit(final_url).hostname or "").lower().removeprefix("www.")
    if final_domain != domain:
        raise ValueError(f"등록 도메인 밖으로 이동했습니다: {final_domain}")
    if "html" not in content_type and "xml" not in content_type and "text" not in content_type:
        raise ValueError(f"지원하지 않는 콘텐츠 형식입니다: {content_type or 'unknown'}")
    soup = BeautifulSoup(body, "html.parser")
    title = ref.title or (soup.title.get_text(" ", strip=True) if soup.title else final_domain)
    published_at = ref.published_at or _article_published_at(soup, final_url)
    content = _article_text(soup)
    if len(content) < 30:
        raise ValueError("수집 가능한 공개 텍스트가 없습니다.")
    return SearchSource(
        title=str(title)[:500],
        url=final_url,
        domain=domain,
        content=content,
        score=recency_score(published_at),
        published_at=published_at.isoformat() if published_at else None,
    )


def recency_score(published_at: datetime | None, *, reference: datetime | None = None) -> float:
    """새 기사일수록 높다. 근거를 고를 때 최신 것이 앞에 오게 하는 용도다."""
    if published_at is None:
        return 0.3
    age_days = max(0.0, ((reference or now_local()) - published_at).total_seconds() / 86400)
    return round(max(0.35, 1.0 - age_days / 30), 4)


def is_recent(published_at: datetime | None, recent_days: int, *, reference: datetime | None = None) -> bool:
    """발행일을 모르면 버리지 않는다 — 서버의 근거 URL 중복 판정이 '이미 본 기사'를 걸러 준다."""
    if published_at is None:
        return True
    return published_at >= (reference or now_local()) - timedelta(days=max(0, recent_days))


def collect_source_articles(config: dict, timeout: int, *, recent_days: int, limit: int, log) -> list[SearchSource]:
    """등록 출처 하나에서 최근 기사들을 읽어 온다.

    피드·사이트맵으로 목록을 얻었으면 **기사를 열기 전에** 발행일로 먼저 거른다.
    링크 추출로 얻었을 때는 날짜를 알 방법이 없어 열어 본 뒤 거른다.
    """
    domain = str(config.get("domain") or "").lower().removeprefix("www.")
    refs, method = discover_articles(config, timeout, log)
    if not refs:
        log.info("기사 후보 없음 source=%s method=%s", config.get("sourceName"), method)
        return []

    reference = now_local()
    if method in {"feed", "sitemap"}:
        dated = [ref for ref in refs if ref.published_at is not None]
        if dated:
            refs = [ref for ref in refs if is_recent(ref.published_at, recent_days, reference=reference)]
            oldest = reference - timedelta(days=3650)
            refs.sort(key=lambda ref: ref.published_at or oldest, reverse=True)
    refs = refs[:max(0, limit)]
    log.info("기사 후보 source=%s method=%s 후보=%d", config.get("sourceName"), method, len(refs))

    collected: list[SearchSource] = []
    for index, ref in enumerate(refs):
        if index:
            time.sleep(ARTICLE_REQUEST_DELAY_SEC)
        try:
            source = read_article(ref, domain, timeout)
        except Exception as error:  # noqa: BLE001
            # 기사 한 건의 실패로 출처 전체를 실패로 만들지 않는다.
            log.warning("기사 수집 실패 %s: %s", ref.url, error)
            continue
        if not is_recent(parse_datetime(source.published_at), recent_days, reference=reference):
            continue
        collected.append(source)
    log.info("기사 수집 source=%s 최근%d일=%d건", config.get("sourceName"), recent_days, len(collected))
    return collected
