"""디시인사이드 갤러리 스크래퍼 (데스크톱 gall.dcinside.com).

수집 대상(예시, targets.json 에서 조정):
  - 위스키 갤러리       : https://gall.dcinside.com/board/lists/?id=whisky
  - 주류 마이너 갤러리  : https://gall.dcinside.com/mgallery/board/lists/?id=alcohol  (minor=true)

공개 갤러리는 비로그인으로 읽히며, 차단/회원전용 대응이 필요하면 DCINSIDE_COOKIE 를 넣는다.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from logger import get_logger
from models import PostDetail, RawPost
from scrapers.base_scraper import MAX_CONTENT_CHARS, MAX_IMAGES, BaseScraper

log = get_logger("dcinside")

_MAX_LIST = 50                      # 갤러리당 최대 추출 글 수
_NO_RE = re.compile(r"[?&]no=(\d+)")


class DcinsideScraper(BaseScraper):
    site = "dcinside"

    @staticmethod
    def _base(minor: bool) -> str:
        return "https://gall.dcinside.com/mgallery/board" if minor else "https://gall.dcinside.com/board"

    def fetch_list(self, target: dict) -> list[RawPost]:
        board = target["board_id"]
        name = target.get("name", board)
        pages = int(target.get("list_pages", 1))
        minor = bool(target.get("minor", False))
        base = self._base(minor)
        list_referer = f"{base}/lists/?id={board}"

        posts: dict[str, RawPost] = {}
        for page in range(1, pages + 1):
            resp = self._get(f"{base}/lists/?id={board}&page={page}", headers={"Referer": list_referer})
            if resp is None:
                continue

            soup = BeautifulSoup(resp.text, "html.parser")
            for row in soup.select("tr.ub-content"):
                # 공지/광고/설문 행 제외: 글번호 칸이 숫자인 행만 일반 게시글
                num = row.select_one(".gall_num")
                if num is None or not num.get_text(strip=True).isdigit():
                    continue
                a = row.select_one(".gall_tit a")
                if not a:
                    continue
                m = _NO_RE.search(a.get("href", ""))
                if not m:
                    continue
                no = m.group(1)
                title = a.get_text(" ", strip=True)
                if not title or no in posts:
                    continue
                posts[no] = RawPost(
                    site=self.site, board_id=board, board_name=name,
                    post_id=no, title=title,
                    url=f"{base}/view/?id={board}&no={no}",
                )
                if len(posts) >= _MAX_LIST:
                    break
            if len(posts) >= _MAX_LIST:
                break

        log.info("[dcinside:%s] 목록 %d건", board, len(posts))
        return list(posts.values())

    def fetch_detail(self, post: RawPost) -> PostDetail:
        resp = self._get(post.url, headers={"Referer": post.url})
        if resp is None:
            return PostDetail(raw=post, content_text="", image_urls=[])

        soup = BeautifulSoup(resp.text, "html.parser")

        # 상세 페이지 제목(.title_subject)으로 목록 제목 보정
        title_node = soup.select_one(".title_subject")
        if title_node and title_node.get_text(strip=True):
            post.title = title_node.get_text(strip=True)

        content_node = soup.select_one(".write_div")
        text = content_node.get_text("\n", strip=True) if content_node else ""
        text = text[:MAX_CONTENT_CHARS]

        image_urls: list[str] = []
        if content_node:
            for img in content_node.select("img"):
                src = img.get("src") or img.get("data-original") or ""
                if src.startswith("//"):
                    src = "https:" + src
                if src.startswith("http") and ("dcimg" in src or "dcinside" in src):
                    image_urls.append(src)
        image_urls = list(dict.fromkeys(image_urls))[:MAX_IMAGES]

        return PostDetail(raw=post, content_text=text, image_urls=image_urls)
