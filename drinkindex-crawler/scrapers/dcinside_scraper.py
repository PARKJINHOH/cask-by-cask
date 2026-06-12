"""디시인사이드 스크래퍼 (모바일 m.dcinside.com 기준).

모바일 페이지가 데스크톱보다 마크업이 단순해 파싱이 안정적이다.
공개 갤러리는 비로그인으로 읽히며, 차단/회원전용 대응이 필요하면 DCINSIDE_COOKIE 를 넣는다.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from logger import get_logger
from models import PostDetail, RawPost
from scrapers.base_scraper import BaseScraper

log = get_logger("dcinside")

_LIST_URL = "https://m.dcinside.com/board/{board}?page={page}"
_VIEW_URL = "https://m.dcinside.com/board/{board}/{post}"
# /board/{gallid}/{postno} 형태 링크에서 글 번호 추출
_HREF_RE = re.compile(r"/board/([^/]+)/(\d+)")


class DcinsideScraper(BaseScraper):
    site = "dcinside"

    def fetch_list(self, target: dict) -> list[RawPost]:
        board = target["board_id"]
        board_name = target.get("name", board)
        pages = int(target.get("list_pages", 1))

        posts: dict[str, RawPost] = {}
        for page in range(1, pages + 1):
            url = _LIST_URL.format(board=board, page=page)
            try:
                html = self._get(url, headers={"Referer": f"https://m.dcinside.com/board/{board}"}).text
            except Exception as e:  # noqa: BLE001
                log.warning("[%s] 목록 요청 실패 p%s: %s", board, page, e)
                continue

            soup = BeautifulSoup(html, "html.parser")
            for a in soup.select("a[href*='/board/']"):
                href = a.get("href", "")
                m = _HREF_RE.search(href)
                if not m or m.group(1) != board:
                    continue
                post_id = m.group(2)
                title = self._extract_title(a)
                if not title:
                    continue
                key = post_id
                if key in posts:
                    continue
                full_url = _VIEW_URL.format(board=board, post=post_id)
                posts[key] = RawPost(
                    site=self.site, board_id=board, board_name=board_name,
                    post_id=post_id, title=title, url=full_url,
                )

        log.info("[dcinside:%s] 목록 %d건", board, len(posts))
        return list(posts.values())

    @staticmethod
    def _extract_title(a) -> str:
        # 모바일 마크업 변동 대비: 후보 셀렉터 → 앵커 텍스트 순으로 폴백
        for sel in (".subjectin", ".sub-txt", ".tit"):
            node = a.select_one(sel)
            if node and node.get_text(strip=True):
                return node.get_text(strip=True)
        txt = a.get_text(" ", strip=True)
        return txt if txt else ""

    def fetch_detail(self, post: RawPost) -> PostDetail:
        html = self._get(post.url, headers={"Referer": post.url}).text
        soup = BeautifulSoup(html, "html.parser")

        content_node = None
        for sel in (".thum-txtin", ".writ_box .thum-txt", "#memo_content", ".write_div"):
            content_node = soup.select_one(sel)
            if content_node:
                break

        text = content_node.get_text("\n", strip=True) if content_node else ""
        if not text:
            # 폴백: og:description
            og = soup.select_one("meta[property='og:description']")
            text = og.get("content", "") if og else ""

        image_urls: list[str] = []
        scope = content_node or soup
        for img in scope.select("img"):
            src = img.get("src") or img.get("data-original") or ""
            if src.startswith("//"):
                src = "https:" + src
            if src.startswith("http") and ("dcinside" in src or "dcimg" in src):
                image_urls.append(src)

        # 중복 제거(순서 유지)
        image_urls = list(dict.fromkeys(image_urls))
        return PostDetail(raw=post, content_text=text, image_urls=image_urls)
