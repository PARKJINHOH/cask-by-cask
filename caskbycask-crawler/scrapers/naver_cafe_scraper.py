"""네이버 카페 스크래퍼 (모바일 cafe API + 로그인 쿠키).

카페는 비로그인으로 거의 막혀 있어 NID_AUT / NID_SES 쿠키가 필요하다.
프로그램적 로그인(RSA 암호화 + 캡차)은 불안정하므로, 브라우저에서 한 번
로그인해 얻은 쿠키를 .env 에 넣어 세션을 재사용한다. (DEPLOY.md 참고)

네이버 내부 API(apis.naver.com)는 비공식이라 응답 구조가 바뀔 수 있다.
구조 변경에 대비해 여러 키 경로를 방어적으로 탐색하고, 실패 시 경고만 남긴다.
"""
from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup
from requests import RequestException

from logger import get_logger
from models import PostDetail, RawPost
from scrapers.base_scraper import MAX_CONTENT_CHARS, MAX_IMAGES, BaseScraper

log = get_logger("naver_cafe")

_LIST_URL = (
    "https://apis.naver.com/cafe-web/cafe2/ArticleListV2.json"
    "?search.clubid={club}&search.menuid={menu}&search.queryType=lastArticle"
    "&search.page={page}&search.perPage=20"
)
_VIEW_API = (
    "https://apis.naver.com/cafe-web/cafe-articleapi/v2.1/cafes/{club}/articles/{article}"
    "?query=&useCafeId=true&requestFrom=A"
)
_VIEW_LINK = "https://m.cafe.naver.com/ca-fe/web/cafes/{club}/articles/{article}"


def _dig(obj, *paths):
    """중첩 dict 에서 후보 키 경로들을 순서대로 시도해 첫 성공값 반환."""
    for path in paths:
        cur = obj
        ok = True
        for key in path:
            if isinstance(cur, dict) and key in cur:
                cur = cur[key]
            else:
                ok = False
                break
        if ok:
            return cur
    return None


class NaverCafeScraper(BaseScraper):
    site = "naver_cafe"

    def __init__(self, timeout: int = 15, delay: float = 1.2, cookie: str = "", notifier=None):
        super().__init__(timeout=timeout, delay=delay, cookie=cookie, notifier=notifier)
        # 데스크톱 UA + JSON Accept 가 cafe API 와 더 잘 맞는다
        self.session.headers.update({
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://cafe.naver.com/",
        })
        self._authed = bool(cookie)

    def _notify_once(self, key: str, summary: str, body: str, danger: bool = False) -> None:
        if self.notifier is None:
            return
        if danger:
            self.notifier.danger_once(key, summary, body)
        else:
            self.notifier.warning_once(key, summary, body)

    def _club_from_url(self, url: str) -> str:
        parsed = urlparse(url)
        query = parse_qs(parsed.query)
        if "search.clubid" in query and query["search.clubid"]:
            return query["search.clubid"][0]
        parts = [p for p in parsed.path.split("/") if p]
        if "cafes" in parts:
            idx = parts.index("cafes")
            if idx + 1 < len(parts):
                return parts[idx + 1]
        return "unknown"

    def _alert_auth(self, stage: str, club: str, status=None, code=None, msg=None) -> None:
        body = (
            f"stage={stage}, club_id={club}, status={status or '-'}, code={code or '-'}, "
            f"msg={msg or '-'} / NAVER_NID_AUT, NAVER_NID_SES 쿠키를 갱신하세요."
        )
        self._notify_once(
            "naver_cafe_auth",
            "크롤러 네이버 카페 인증 실패",
            body,
            danger=True,
        )

    def _handle_request_error(self, url: str, error: RequestException) -> None:
        response = getattr(error, "response", None)
        status = getattr(response, "status_code", None)
        request = getattr(error, "request", None)
        request_url = getattr(request, "url", url)
        club = self._club_from_url(request_url)
        if status in (401, 403):
            self._alert_auth("http", club, status=status, msg=str(error))
        elif status == 429:
            self._notify_once(
                "naver_cafe_rate_limited",
                "크롤러 네이버 카페 요청 제한",
                f"club_id={club}, status=429 / REQUEST_DELAY_SEC 상향 또는 실행 주기 조정을 검토하세요.",
            )

    def fetch_list(self, target: dict) -> list[RawPost]:
        if not self._authed:
            log.error("네이버 쿠키(NID_AUT/NID_SES) 미설정 — 카페 수집 건너뜀")
            self._notify_once(
                "naver_cafe_missing_cookie",
                "크롤러 네이버 카페 쿠키 없음",
                "NAVER_NID_AUT, NAVER_NID_SES 가 비어 있어 네이버 카페 수집을 건너뜁니다.",
                danger=True,
            )
            return []

        club = str(target["club_id"])
        menu = str(target.get("menu_id", 0))
        name = target.get("name", f"cafe:{club}")
        pages = int(target.get("list_pages", 1))

        posts: dict[str, RawPost] = {}
        for page in range(1, pages + 1):
            url = "https://apis.naver.com/cafe-web/cafe2/ArticleListV2.json"
            params = {
                "search.clubid": club,
                "search.page": page,
                "search.perPage": 20,
                "search.queryType": "lastArticle"
            }
            # menu_id 가 '0'(전체글보기)이 아니거나 빈 값이 아닐 때만 파라미터에 추가 (500 오류 방지)
            if menu and menu != "0":
                params["search.menuid"] = menu

            resp = self._get(url, params=params)
            if resp is None:
                continue
            try:
                data = resp.json()
            except ValueError as e:
                log.warning("[cafe:%s] 목록 JSON 파싱 실패 p%s: %s", club, page, e)
                continue

            error_code = _dig(data, ("message", "error", "code"), ("error", "code"))
            error_msg = _dig(data, ("message", "error", "msg"), ("error", "msg"))
            status = _dig(data, ("message", "status"), ("status",))
            if status in ("401", "403") or error_code:
                log.warning(
                    "[naver_cafe:%s] 목록 권한 부족 또는 로그인 필요 (status=%s, code=%s, msg=%s)",
                    club, status, error_code, error_msg,
                )
                self._alert_auth("list", club, status=status, code=error_code, msg=error_msg)
                continue


            article_list = _dig(
                data,
                ("message", "result", "articleList"),
                ("result", "articleList"),
                ("articleList",),
            ) or []

            for item in article_list:
                article_id = str(item.get("articleId") or item.get("articleid") or "")
                subject = item.get("subject") or item.get("title") or ""
                if not article_id or not subject:
                    continue
                ts = item.get("writeDateTimestamp") or item.get("writeDate")
                posted_at = self._to_iso(ts)
                if article_id in posts:
                    continue
                posts[article_id] = RawPost(
                    site=self.site, board_id=club, board_name=name,
                    post_id=article_id, title=subject,
                    url=_VIEW_LINK.format(club=club, article=article_id),
                    posted_at=posted_at,
                )

        log.info("[naver_cafe:%s] 목록 %d건", club, len(posts))
        return list(posts.values())

    @staticmethod
    def _to_iso(ts) -> str | None:
        try:
            if ts is None:
                return None
            ms = int(ts)
            # 13자리면 ms, 10자리면 s
            sec = ms / 1000 if ms > 10_000_000_000 else ms
            return datetime.fromtimestamp(sec, tz=timezone.utc).isoformat()
        except (TypeError, ValueError):
            return None

    def fetch_detail(self, post: RawPost) -> PostDetail:
        url = _VIEW_API.format(club=post.board_id, article=post.post_id)
        resp = self._get(url, headers={"Referer": post.url})
        if resp is None:
            return PostDetail(raw=post, content_text="", image_urls=[])
        try:
            data = resp.json()
        except ValueError:
            return PostDetail(raw=post, content_text="", image_urls=[])

        # 권한 부족 및 로그인 요구 감지
        error_code = _dig(data, ("message", "error", "code"), ("error", "code"))
        error_msg = _dig(data, ("message", "error", "msg"), ("error", "msg"))
        status = _dig(data, ("message", "status"), ("status",))

        if status in ("401", "403") or error_code:
            log.warning(
                "[naver_cafe:%s] 게시글 권한 부족 또는 로그인 필요 (status=%s, code=%s, msg=%s) — PASS 처리",
                post.post_id, status, error_code, error_msg
            )
            self._alert_auth("detail", post.board_id, status=status, code=error_code, msg=error_msg)
            # 메인 루프에서 건너뛰고 SKIPPED 처리할 수 있도록 특수 토큰 반환
            return PostDetail(raw=post, content_text="[AUTH_REQUIRED]", image_urls=[])

        content_html = _dig(
            data,
            ("message", "result", "article", "contentHtml"),
            ("result", "article", "contentHtml"),
            ("message", "result", "article", "content"),
            ("result", "article", "content"),
        ) or ""

        soup = BeautifulSoup(content_html, "html.parser")

        text = soup.get_text("\n", strip=True)[:MAX_CONTENT_CHARS]

        image_urls: list[str] = []
        for img in soup.select("img"):
            src = img.get("src") or img.get("data-src") or ""
            if src.startswith("//"):
                src = "https:" + src
            if src.startswith("http") and "pstatic.net" in src:
                # 썸네일 리사이즈 쿼리 제거(원본 우선)
                image_urls.append(src.split("?")[0])
        image_urls = list(dict.fromkeys(image_urls))[:MAX_IMAGES]

        return PostDetail(raw=post, content_text=text, image_urls=image_urls)
