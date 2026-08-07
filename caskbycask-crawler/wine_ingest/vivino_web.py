from __future__ import annotations

import json
import math
import random
import re
import time
from collections.abc import Callable, Iterable, Iterator
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

import requests
from bs4 import BeautifulSoup

from safe_http import get_public_response, new_public_session, read_limited_body


VIVINO_HOST = "vivino.com"
DEFAULT_BASE_URL = "https://www.vivino.com"
# 수집 요청에 서비스명·운영 연락처를 싣지 않는다. 브랜드가 드러나는 값은 아래 가드가 거부한다.
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
#: User-Agent에 실리면 서비스가 식별되는 토큰. 노출 금지 대상이다.
BRAND_TOKENS = ("caskbycask", "cask-by-cask", "drinkindex")
#: 차단·레이트리밋 응답. 우회하지 않고 남은 회차를 중단하는 신호로만 쓴다.
BLOCKING_STATUSES = frozenset({401, 403, 405, 406, 429, 451, 503})
WINE_PATH_PATTERN = re.compile(r"/w/\d+(?:$|[/?#])", re.IGNORECASE)
YEAR_PATTERN = re.compile(r"(?<!\d)(18\d{2}|19\d{2}|20\d{2}|2100)(?!\d)")
NUMBER_TOKEN_PATTERN = re.compile(r"-?\d[\d.,]*")
CHARSET_HEADER_PATTERN = re.compile(r"charset\s*=\s*\"?([\w\-]+)", re.IGNORECASE)
CHARSET_META_PATTERN = re.compile(rb"""<meta[^>]+charset\s*=\s*["']?\s*([\w\-]+)""", re.IGNORECASE)
VOLUME_PATTERN = re.compile(r"(?<![\d.,])(\d{1,5}(?:[.,]\d{1,3})?)\s*(ml|cl|dl|l)\b", re.IGNORECASE)
VOLUME_CONTEXT_PATTERN = re.compile(r"bottle|volume|capacity|size|용량|병입", re.IGNORECASE)
BLOCK_MARKERS = ("captcha", "access denied", "verify you are human", "cf-chl-", "are you a robot")
MAX_SOURCE_URL_LENGTH = 1000


class VivinoBlockedError(PermissionError):
    """Vivino가 접근을 막았다. 우회를 시도하지 않고 남은 수집을 중단하는 신호."""


def _walk(value) -> Iterator[object]:
    yield value
    if isinstance(value, dict):
        for child in value.values():
            yield from _walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk(child)


def _text(value) -> str | None:
    if isinstance(value, str):
        normalized = " ".join(value.split()).strip()
        return normalized or None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    return None


def _decimal_text(token: str) -> str:
    """'13,5'는 소수점, '1,200'은 자릿수 구분자로 해석해 float가 읽을 수 있게 만든다."""
    sign, body = ("-", token[1:]) if token.startswith("-") else ("", token)
    body = body.strip(".,")
    if not body:
        return "0"
    if "," in body and "." in body:
        decimal_sep = "," if body.rfind(",") > body.rfind(".") else "."
        body = body.replace("." if decimal_sep == "," else ",", "").replace(decimal_sep, ".")
    elif "," in body:
        # 마지막 구분자 뒤가 정확히 세 자리면 천 단위, 아니면 소수점으로 본다.
        body = body.replace(",", "") if len(body.rsplit(",", 1)[1]) == 3 else body.replace(",", ".")
    if body.count(".") > 1:  # '1.234.567' 같은 유럽식 천 단위 표기
        body = body.replace(".", "")
    return sign + body


def _number(value) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value) if math.isfinite(float(value)) else None
    if isinstance(value, str):
        match = NUMBER_TOKEN_PATTERN.search(value)
        if match:
            try:
                parsed = float(_decimal_text(match.group(0)))
                return parsed if math.isfinite(parsed) else None
            except ValueError:
                return None
    return None


def _dict_name(value) -> str | None:
    if isinstance(value, dict):
        return _text(value.get("name") or value.get("title"))
    return _text(value)


def _deep_value(value, keys: Iterable[str]):
    wanted = {key.lower() for key in keys}
    for node in _walk(value):
        if not isinstance(node, dict):
            continue
        for key, child in node.items():
            if str(key).lower() in wanted and child not in (None, "", [], {}):
                return child
    return None


def _json_documents(soup: BeautifulSoup) -> list[object]:
    documents: list[object] = []
    decoder = json.JSONDecoder()
    for script in soup.find_all("script"):
        raw = script.string or script.get_text() or ""
        script_type = (script.get("type") or "").lower()
        if script_type in {"application/ld+json", "application/json"} or script.get("id") == "__NEXT_DATA__":
            try:
                documents.append(json.loads(raw))
            except (TypeError, json.JSONDecodeError):
                continue
            continue
        for marker in ("__PRELOADED_STATE__", "__INITIAL_STATE__"):
            index = raw.find(marker)
            if index < 0:
                continue
            start = raw.find("{", index + len(marker))
            if start < 0:
                continue
            try:
                value, _ = decoder.raw_decode(raw[start:])
                documents.append(value)
            except json.JSONDecodeError:
                pass
    return documents


def _product_document(documents: list[object]) -> dict:
    for document in documents:
        for node in _walk(document):
            if not isinstance(node, dict):
                continue
            node_type = node.get("@type")
            types = node_type if isinstance(node_type, list) else [node_type]
            if any(str(value).lower() in {"product", "wine"} for value in types if value):
                return node
    return {}


def _vintage_document(documents: list[object]) -> dict:
    candidates: list[tuple[int, dict]] = []
    for document in documents:
        for node in _walk(document):
            if not isinstance(node, dict):
                continue
            wine = node.get("wine")
            score = 0
            if isinstance(wine, dict):
                score += 5
                if wine.get("winery") or wine.get("producer"):
                    score += 2
            if node.get("year") not in (None, ""):
                score += 2
            if node.get("statistics") or node.get("ratings_average"):
                score += 1
            if node.get("id") not in (None, ""):
                score += 1
            if score >= 5:
                candidates.append((score, node))
    return max(candidates, key=lambda item: item[0])[1] if candidates else {}


def _valid_vivino_url(value: str, *, base_url: str = DEFAULT_BASE_URL) -> str:
    absolute = urljoin(base_url.rstrip("/") + "/", value.strip())
    parsed = urlsplit(absolute)
    host = (parsed.hostname or "").rstrip(".").lower()
    if parsed.scheme.lower() != "https" or not (host == VIVINO_HOST or host.endswith(f".{VIVINO_HOST}")):
        raise ValueError(f"Vivino HTTPS URL만 허용됩니다: {value}")
    if parsed.username is not None or parsed.password is not None or parsed.port not in (None, 443):
        raise ValueError(f"사용자 정보나 비표준 포트가 포함된 URL은 허용되지 않습니다: {value}")
    query_items = parse_qsl(parsed.query, keep_blank_values=False)
    if WINE_PATH_PATTERN.search(parsed.path):
        query = [(key, item) for key, item in query_items if key.lower() == "year"]
    else:
        sensitive_fragments = ("token", "key", "auth", "session", "signature", "credential")
        query = [
            (key, item) for key, item in query_items
            if not any(fragment in key.lower() for fragment in sensitive_fragments)
        ]
    return urlunsplit(("https", host, parsed.path or "/", urlencode(query), ""))


def _is_wine_url(value: str) -> bool:
    return bool(WINE_PATH_PATTERN.search(urlsplit(value).path))


def _decode_html(body: bytes, content_type: str) -> str:
    """charset이 헤더에 없으면 requests가 ISO-8859-1로 단정해 UTF-8 본문을 깨뜨린다."""
    header = CHARSET_HEADER_PATTERN.search(content_type or "")
    meta = CHARSET_META_PATTERN.search(body[:4096])
    candidates = [
        header.group(1) if header else None,
        meta.group(1).decode("ascii", "ignore") if meta else None,
        "utf-8",
    ]
    for candidate in candidates:
        if not candidate:
            continue
        try:
            return body.decode(candidate, errors="replace")
        except LookupError:
            continue
    return body.decode("utf-8", errors="replace")


def _meta(soup: BeautifulSoup, *names: str) -> str | None:
    for name in names:
        tag = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
        if tag and _text(tag.get("content")):
            return _text(tag.get("content"))
    return None


def _parse_year(value, source_url: str, fallback_name: str | None) -> tuple[str, int | None]:
    normalized = _text(value)
    if normalized:
        upper = normalized.upper().replace(".", "")
        if upper in {"NV", "N/V", "NON VINTAGE", "NON-VINTAGE"}:
            return "NON_VINTAGE", None
        match = YEAR_PATTERN.search(normalized)
        if match:
            return "VINTAGE", int(match.group(1))
    query_year = dict(parse_qsl(urlsplit(source_url).query)).get("year")
    if query_year and YEAR_PATTERN.fullmatch(query_year):
        return "VINTAGE", int(query_year)
    if fallback_name:
        upper_name = fallback_name.upper()
        if re.search(r"(?:^|\s)N\.?V\.?(?:\s|$)", upper_name):
            return "NON_VINTAGE", None
        match = YEAR_PATTERN.search(fallback_name)
        if match:
            return "VINTAGE", int(match.group(1))
    raise ValueError("빈티지 연도 또는 NV 여부를 확인할 수 없습니다")


def _parse_abv(vintage: dict, wine: dict, page_text: str) -> float | None:
    value = _deep_value(vintage, {"alcohol", "alcohol_percent", "alcohol_percentage", "abv"})
    if value is None:
        value = _deep_value(wine, {"alcohol", "alcohol_percent", "alcohol_percentage", "abv"})
    parsed = _number(value)
    if parsed is None:
        match = re.search(r"(?:alcohol(?:\s+content)?|abv)\s*[:\-]?\s*(\d{1,2}(?:[.,]\d+)?)\s*%", page_text, re.IGNORECASE)
        parsed = _number(match.group(1)) if match else None
    return parsed if parsed is not None and 0 < parsed <= 100 else None


def _parse_volume(vintage: dict, wine: dict, page_text: str) -> int | None:
    for source in (vintage, wine):
        parsed = _number(_deep_value(source, {"bottle_volume_ml", "volume_ml", "bottle_size_ml"}))
        if parsed is not None and 1 <= parsed <= 30000:
            return int(round(parsed))
    multipliers = {"ml": 1, "cl": 10, "dl": 100, "l": 1000}
    for match in VOLUME_PATTERN.finditer(page_text):
        # 페이지 아무 곳의 숫자를 용량으로 오인하지 않도록 앞선 문맥에 용량 단어가 있어야 한다.
        if not VOLUME_CONTEXT_PATTERN.search(page_text[max(0, match.start() - 40):match.start()]):
            continue
        amount = _number(match.group(1))
        if amount is None:
            continue
        result = int(round(amount * multipliers[match.group(2).lower()]))
        if 1 <= result <= 30000:
            return result
    return None


def _wine_type(value, fallback_name: str | None) -> str | None:
    name = (_dict_name(value) or fallback_name or "").lower()
    mappings = (
        (("sparkling", "champagne", "cava", "prosecco"), "SPARKLING"),
        (("dessert", "sweet wine", "ice wine", "sauternes"), "DESSERT"),
        (("fortified", "port wine", "sherry", "madeira"), "FORTIFIED"),
        (("orange wine",), "ORANGE"),
        (("rosé", "rose wine", "rosado"), "ROSE"),
        (("white wine", "white"), "WHITE"),
        (("red wine", "red"), "RED"),
    )
    for needles, result in mappings:
        if any(needle in name for needle in needles):
            return result
    numeric = int(_number(value) or 0)
    return {1: "RED", 2: "WHITE", 3: "SPARKLING", 4: "ROSE", 7: "DESSERT", 24: "FORTIFIED"}.get(numeric)


def _level(value) -> int | None:
    parsed = _number(value)
    if parsed is None:
        return None
    return max(1, min(5, int(math.floor(parsed + 0.5))))


def _taste_value(structure: dict, keys: Iterable[str], values: tuple[str, ...]) -> str | None:
    raw = next((structure.get(key) for key in keys if structure.get(key) not in (None, "")), None)
    level = _level(raw)
    return values[level - 1] if level else None


def _taste_structure(documents: list[object]) -> dict:
    wanted = {"sweetness", "intensity", "body", "acidity", "tannin"}
    candidates: list[tuple[int, dict]] = []
    for document in documents:
        for node in _walk(document):
            if isinstance(node, dict):
                score = len(wanted.intersection({str(key).lower() for key in node}))
                if score >= 2:
                    candidates.append((score, node))
    return max(candidates, key=lambda item: item[0])[1] if candidates else {}


def _grapes(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    result: list[dict] = []
    seen: set[str] = set()
    for item in value:
        name = _dict_name(item)
        if not name or name.casefold() in seen:
            continue
        seen.add(name.casefold())
        percentage = None
        if isinstance(item, dict):
            raw_percentage = _number(item.get("percentage") or item.get("share"))
            if raw_percentage is not None and 1 <= raw_percentage <= 100:
                percentage = int(round(raw_percentage))
        result.append({"name": name[:100], "percentage": percentage})
    return result[:20]


class VivinoWebCrawlerProvider:
    """Collects only public Vivino HTML after the backend authorization gate is open.

    It does not log in, use private endpoints, solve bot challenges, or fall back to an API.
    Requests carry no service branding or operator contact details; when Vivino answers with a
    block, rate limit, or bot challenge the run stops instead of retrying or rotating identities.
    Parsing failures are returned as item failures so the worker can persist and alert them.
    """

    def __init__(
        self,
        *,
        usage_grant_ref: str,
        base_url: str = DEFAULT_BASE_URL,
        start_urls: Iterable[str] | None = None,
        request_delay_seconds: float = 5.0,
        timeout_seconds: int = 20,
        discovery_page_limit: int = 3,
        max_html_bytes: int = 4 * 1024 * 1024,
        user_agent: str = DEFAULT_USER_AGENT,
        fetcher: Callable[[str], str] | None = None,
        sleeper: Callable[[float], None] = time.sleep,
        rng=None,
        on_progress: Callable[[], None] | None = None,
    ):
        if not usage_grant_ref or not usage_grant_ref.strip():
            raise RuntimeError("Vivino 웹 크롤링 이용 허가 근거가 필요합니다")
        self.usage_grant_ref = usage_grant_ref.strip()
        self.base_url = _valid_vivino_url(base_url)
        configured = list(start_urls or [f"{self.base_url.rstrip('/')}/explore"])
        if not configured:
            raise RuntimeError("VIVINO_START_URLS에 한 개 이상의 시작 페이지가 필요합니다")
        self.start_urls = [_valid_vivino_url(url, base_url=self.base_url) for url in configured]
        self.request_delay_seconds = max(1.0, float(request_delay_seconds))
        self.timeout_seconds = max(5, min(int(timeout_seconds), 60))
        self.discovery_page_limit = max(1, min(int(discovery_page_limit), 10))
        self.max_html_bytes = max(64 * 1024, min(int(max_html_bytes), 8 * 1024 * 1024))
        self.user_agent = (user_agent or DEFAULT_USER_AGENT).strip()
        lowered_agent = self.user_agent.lower()
        leaked = [token for token in BRAND_TOKENS if token in lowered_agent]
        if leaked or "@" in self.user_agent:
            raise RuntimeError(
                "VIVINO_CRAWLER_USER_AGENT에 서비스명이나 연락처를 넣을 수 없습니다: "
                + ", ".join(leaked or ["contact"])
            )
        self.fetcher = fetcher
        self.sleeper = sleeper
        self.on_progress = on_progress
        self.rng = rng or random.SystemRandom()
        self.session = None if fetcher else new_public_session()
        self.request_count = 0

    def collect(self, limit: int) -> list[dict]:
        capped_limit = max(1, min(int(limit), 10))
        candidates: list[str] = []
        seen: set[str] = set()
        discovery_queue: list[str] = []
        seen_discovery_pages: set[str] = set()
        discovery_errors: list[str] = []
        for start_url in self.start_urls:
            if _is_wine_url(start_url):
                if start_url not in seen:
                    candidates.append(start_url)
                    seen.add(start_url)
            elif start_url not in seen_discovery_pages:
                discovery_queue.append(start_url)
                seen_discovery_pages.add(start_url)

        self.rng.shuffle(discovery_queue)
        discovery_count = 0
        blocked: str | None = None
        while discovery_queue and discovery_count < self.discovery_page_limit:
            start_url = discovery_queue.pop()
            # 실패한 요청도 예산에서 차감해야 한 회차에 목록 페이지를 무제한으로 두드리지 않는다.
            discovery_count += 1
            try:
                html = self._fetch_html(start_url)
                for candidate in self._discover_urls(html, start_url):
                    if candidate not in seen:
                        candidates.append(candidate)
                        seen.add(candidate)
                for page_url in self._discover_page_urls(html, start_url):
                    if page_url not in seen_discovery_pages:
                        discovery_queue.append(page_url)
                        seen_discovery_pages.add(page_url)
                self.rng.shuffle(discovery_queue)
            except VivinoBlockedError as exc:
                blocked = str(exc)
                discovery_errors.append(f"{start_url}: {exc}")
                break
            except Exception as exc:
                discovery_errors.append(f"{start_url}: {exc}")
        if not candidates:
            detail = "; ".join(discovery_errors) or "상세 와인 링크가 발견되지 않았습니다"
            message = f"Vivino 후보 페이지 수집 실패: {detail}"
            raise VivinoBlockedError(message) if blocked else RuntimeError(message)

        self.rng.shuffle(candidates)
        items: list[dict] = []
        for source_url in candidates[:capped_limit]:
            if blocked:
                items.append(self._failure_item(source_url, "VIVINO_ACCESS_BLOCKED", blocked))
                continue
            try:
                items.append(self._parse_detail(self._fetch_html(source_url), source_url))
            except VivinoBlockedError as exc:
                # 차단을 확인한 뒤에도 계속 두드리지 않는다. 남은 후보는 요청 없이 실패로 남긴다.
                blocked = str(exc)
                items.append(self._failure_item(source_url, "VIVINO_ACCESS_BLOCKED", blocked))
            except Exception as exc:
                items.append(self._failure_item(source_url, self._error_code(exc), str(exc)))
            self._report_progress()
        return items

    def _report_progress(self) -> None:
        """수집이 길어져도 워커가 살아 있음을 알린다. 진행 보고 실패는 수집을 막지 않는다."""
        if self.on_progress is None:
            return
        try:
            self.on_progress()
        except Exception:
            pass

    def _failure_item(self, source_url: str, code: str, message: str) -> dict:
        return {
            "provider": "VIVINO",
            "sourceUrl": source_url,
            "nameEn": self._name_from_url(source_url),
            "_providerErrorCode": code,
            "_providerError": message or code,
        }

    def close(self) -> None:
        if self.session is not None:
            self.session.close()
            self.session = None

    def _fetch_html(self, url: str) -> str:
        if self.request_count:
            self.sleeper(self.request_delay_seconds)
        self.request_count += 1
        if self.fetcher:
            return self.fetcher(url)
        if self.session is None:
            raise RuntimeError("세션이 이미 닫혀 추가 수집을 할 수 없습니다")
        try:
            response, _ = get_public_response(
                self.session,
                url,
                timeout=self.timeout_seconds,
                allowed_hosts={VIVINO_HOST},
                # Referer나 쿠키를 얹지 않는다. 서비스가 식별될 헤더는 보내지 않는다.
                headers={
                    "User-Agent": self.user_agent,
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            )
        except requests.HTTPError as error:
            status = error.response.status_code if error.response is not None else None
            if status in BLOCKING_STATUSES:
                raise VivinoBlockedError(
                    f"Vivino가 HTTP {status}로 접근을 제한했습니다. 우회하지 않고 중단합니다"
                ) from error
            raise
        try:
            content_type = (response.headers.get("Content-Type") or "").lower()
            if content_type and "html" not in content_type:
                raise ValueError(f"HTML이 아닌 응답입니다: {content_type}")
            body = read_limited_body(response, self.max_html_bytes, max_seconds=self.timeout_seconds)
            return _decode_html(body, content_type)
        finally:
            response.close()

    def _discover_urls(self, html: str, page_url: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        values: list[str] = [str(tag.get("href")) for tag in soup.find_all("a", href=True)]
        for document in _json_documents(soup):
            values.extend(str(value) for value in _walk(document) if isinstance(value, str) and "/w/" in value)
        result: list[str] = []
        seen: set[str] = set()
        for value in values:
            try:
                candidate = _valid_vivino_url(urljoin(page_url, value), base_url=self.base_url)
            except ValueError:
                continue
            if _is_wine_url(candidate) and candidate not in seen:
                result.append(candidate)
                seen.add(candidate)
        return result

    def _discover_page_urls(self, html: str, page_url: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        result: list[str] = []
        seen: set[str] = set()
        for tag in soup.find_all("a", href=True):
            href = str(tag.get("href"))
            rel_values = {str(value).lower() for value in (tag.get("rel") or [])}
            try:
                candidate = _valid_vivino_url(urljoin(page_url, href), base_url=self.base_url)
            except ValueError:
                continue
            query = dict(parse_qsl(urlsplit(candidate).query))
            if _is_wine_url(candidate) or ("page" not in query and "next" not in rel_values):
                continue
            if candidate not in seen:
                result.append(candidate)
                seen.add(candidate)
        return result

    def _parse_detail(self, html: str, requested_url: str) -> dict:
        soup = BeautifulSoup(html, "html.parser")
        documents = _json_documents(soup)
        vintage = _vintage_document(documents)
        wine = vintage.get("wine") if isinstance(vintage.get("wine"), dict) else {}
        product = _product_document(documents)
        page_text = " ".join(soup.stripped_strings)
        lowered_page = page_text.lower()
        if any(marker in lowered_page for marker in BLOCK_MARKERS):
            raise VivinoBlockedError("Vivino 접근 제한 또는 bot challenge가 감지되어 우회하지 않고 중단했습니다")

        canonical_tag = soup.find("link", rel=lambda value: value and "canonical" in value)
        canonical = canonical_tag.get("href") if canonical_tag else requested_url
        source_url = _valid_vivino_url(str(canonical), base_url=requested_url)
        requested_year = dict(parse_qsl(urlsplit(requested_url).query)).get("year")
        if requested_year and not dict(parse_qsl(urlsplit(source_url).query)).get("year"):
            parsed = urlsplit(source_url)
            source_url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode({"year": requested_year}), ""))

        product_name = _text(product.get("name"))
        name = _text(wine.get("name")) or self._strip_vintage(product_name) or self._strip_vintage(
            _meta(soup, "og:title", "twitter:title")
        )
        winery = wine.get("winery") or wine.get("producer")
        producer_name = _dict_name(winery) or _dict_name(product.get("brand") or product.get("manufacturer"))
        region_value = wine.get("region") if isinstance(wine.get("region"), dict) else {}
        country_value = region_value.get("country") or wine.get("country") or product.get("countryOfOrigin")
        country = _dict_name(country_value)
        region = _dict_name(region_value)

        vintage_status, vintage_year = _parse_year(vintage.get("year"), source_url, product_name or name)
        if vintage_year is not None and not dict(parse_qsl(urlsplit(source_url).query)).get("year"):
            parsed = urlsplit(source_url)
            source_url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode({"year": vintage_year}), ""))
        wine_id = _text(wine.get("id") or wine.get("wine_id")) or self._wine_id_from_url(source_url)
        vintage_id = _text(vintage.get("id") or vintage.get("vintage_id"))
        vintage_label = str(vintage_year) if vintage_year is not None else "NV"
        if not vintage_id and wine_id:
            vintage_id = f"web:{wine_id}:{vintage_label}"

        abv = _parse_abv(vintage, wine, page_text)
        volume_ml = _parse_volume(vintage, wine, page_text)
        type_value = wine.get("type") or wine.get("type_name") or wine.get("type_id") or product.get("category")
        wine_type = _wine_type(type_value, product_name or name)

        statistics = vintage.get("statistics") if isinstance(vintage.get("statistics"), dict) else {}
        aggregate = product.get("aggregateRating") if isinstance(product.get("aggregateRating"), dict) else {}
        rating = _number(statistics.get("ratings_average") or statistics.get("rating") or aggregate.get("ratingValue"))
        if rating is not None and not 0 <= rating <= 5:
            rating = None  # 5점 척도가 아니면 버린다. 아래 필수값 검사에서 수집 실패로 남는다.
        rating_count_value = _number(
            statistics.get("ratings_count") or statistics.get("rating_count")
            or aggregate.get("ratingCount") or aggregate.get("reviewCount")
        )
        rating_count = int(rating_count_value) if rating_count_value is not None and rating_count_value >= 0 else None

        image_value = vintage.get("image") or wine.get("image") or product.get("image") or _meta(soup, "og:image")
        if isinstance(image_value, list):
            image_value = image_value[0] if image_value else None
        image_url = _dict_name(image_value) if isinstance(image_value, dict) else _text(image_value)
        if isinstance(image_value, dict):
            image_url = _text(image_value.get("location") or image_value.get("url") or image_value.get("src"))
        if image_url:
            try:
                image_url = _valid_vivino_url(image_url, base_url=source_url)
            except ValueError:
                image_url = None
        if image_url and len(image_url) > MAX_SOURCE_URL_LENGTH:
            image_url = None  # 백엔드 컬럼 상한. 잘라 쓰면 깨진 링크가 되므로 버린다.

        structure = _taste_structure(documents)
        wine_detail = {
            "wineType": wine_type,
            "vintageStatus": vintage_status,
            "isOakAged": None,
            "isNaturalWine": None,
            "certification": None,
            "grapeVarieties": _grapes(_deep_value(vintage or wine, {"grapes", "grape_varieties"})),
            "appellationDesignation": _dict_name(_deep_value(vintage or wine, {"appellation", "appellation_designation"})),
            "soilType": None,
            "altitudeM": None,
            "harvestMethod": None,
            "fermentationVessel": None,
            "oakType": None,
            "oakAgedMonths": None,
            "sweetness": _taste_value(
                structure, ("sweetness",), ("DRY", "OFF_DRY", "MEDIUM", "MEDIUM_SWEET", "SWEET"),
            ),
            "body": _taste_value(
                structure, ("intensity", "body"), ("LIGHT", "LIGHT_MEDIUM", "MEDIUM", "MEDIUM_FULL", "FULL"),
            ),
            "acidity": _taste_value(
                structure, ("acidity",), ("LOW", "LOW_MEDIUM", "MEDIUM", "MEDIUM_HIGH", "HIGH"),
            ),
            "tannin": _taste_value(
                structure, ("tannin",), ("LOW", "LOW_MEDIUM", "MEDIUM", "MEDIUM_HIGH", "HIGH"),
            ),
            "notes": None,
        }

        required = {
            "externalWineId": wine_id,
            "externalVintageId": vintage_id,
            "nameEn": name,
            # producerNameEn은 필수가 아니다. 와이너리가 없으면 백엔드가 생산자 없이 저장한다.
            "country": country,
            "region": region,
            "abv": abv,
            "volumeMl": volume_ml,
            "imageUrl": image_url,
            "rating": rating,
            "ratingCount": rating_count,
            "wineDetail.wineType": wine_type,
            "wineDetail.sweetness": wine_detail["sweetness"],
            "wineDetail.body": wine_detail["body"],
            "wineDetail.acidity": wine_detail["acidity"],
        }
        if wine_type == "RED":
            required["wineDetail.tannin"] = wine_detail["tannin"]
        missing = [key for key, value in required.items() if value in (None, "")]
        if missing:
            raise ValueError(f"Vivino 페이지 필수 필드 누락: {', '.join(missing)}")
        if len(source_url) > MAX_SOURCE_URL_LENGTH:
            raise ValueError(f"수집 링크가 {MAX_SOURCE_URL_LENGTH}자 상한을 넘었습니다")

        return {
            "provider": "VIVINO",
            "externalWineId": str(wine_id)[:100],
            "externalVintageId": str(vintage_id)[:100],
            "sourceUrl": source_url,
            "imageUrl": image_url,
            "usageGrantRef": self.usage_grant_ref,
            "nameEn": str(name)[:200],
            "producerNameEn": str(producer_name)[:200] if producer_name else None,
            "country": str(country)[:100],
            "region": str(region)[:100] if region else None,
            "regionCode": None,
            "vintageStatus": vintage_status,
            "vintageYear": vintage_year,
            "abv": abv,
            "volumeMl": volume_ml,
            "wineDetail": wine_detail,
            "rating": rating,
            "ratingCount": rating_count,
        }

    @staticmethod
    def _wine_id_from_url(url: str) -> str | None:
        match = re.search(r"/w/(\d+)(?:$|[/?])", urlsplit(url).path + "/")
        return match.group(1) if match else None

    @staticmethod
    def _strip_vintage(value: str | None) -> str | None:
        if not value:
            return None
        result = re.sub(r"^\s*(?:18\d{2}|19\d{2}|20\d{2}|2100|N\.?V\.?)\s+", "", value, flags=re.IGNORECASE)
        result = re.sub(r"\s*[|·-]\s*Vivino\s*$", "", result, flags=re.IGNORECASE)
        return _text(result)

    @staticmethod
    def _name_from_url(url: str) -> str:
        path = urlsplit(url).path.rstrip("/")
        slug = path.split("/")[-2] if re.search(r"/w/\d+$", path) and len(path.split("/")) >= 2 else path.split("/")[-1]
        return " ".join(part for part in slug.replace("_", "-").split("-") if part)[:200] or "와인명 미확인"

    @staticmethod
    def _error_code(error: Exception) -> str:
        message = str(error)
        if isinstance(error, PermissionError):
            return "VIVINO_ACCESS_BLOCKED"
        if "필수 필드 누락" in message:
            return "REQUIRED_FIELD_MISSING"
        if isinstance(error, requests.RequestException) or "HTTP" in message or "timeout" in message.lower():
            return "VIVINO_HTTP_FAILED"
        return "VIVINO_PAGE_PARSE_FAILED"
