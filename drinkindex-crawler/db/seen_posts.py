"""이미 처리한 게시글 중복 방지용 SQLite 스토어.

같은 글을 두 번 분석하지 않도록(=OpenAI 비용 절약) post key 를 기록한다.
백엔드도 sourcePostId 로 2차 멱등 처리하지만, 1차 방어선은 여기다.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

from logger import get_logger

log = get_logger("db")


class SeenPostStore:
    def __init__(self, db_path: str):
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        # post_key = "site:board:postid" — URL 변형(쿼리/모바일·데스크톱)에 흔들리지 않는
        # 안정적 중복키. created_at 은 SQLite 기본값(UTC)으로 채운다.
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS seen_posts (
                post_key   TEXT PRIMARY KEY,
                site       TEXT NOT NULL,
                url        TEXT,
                status     TEXT NOT NULL,         -- ANALYZED | UPLOADED | SKIPPED | ERROR
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self.conn.commit()

    def exists(self, post_key: str) -> bool:
        cur = self.conn.execute("SELECT 1 FROM seen_posts WHERE post_key = ?", (post_key,))
        return cur.fetchone() is not None

    def mark(self, post_key: str, site: str, url: str, status: str) -> None:
        # 최초 INSERT 시 created_at 은 DEFAULT 로 채워지고,
        # 재방문(status 갱신) 시에는 created_at 을 보존한다(=최초 관측시각 유지).
        self.conn.execute(
            """
            INSERT INTO seen_posts (post_key, site, url, status)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(post_key) DO UPDATE SET status = excluded.status
            """,
            (post_key, site, url, status),
        )
        self.conn.commit()

    def cleanup_old(self, days: int = 7) -> int:
        """days일 이상 된 레코드 삭제 → DB 무한 증가 방지. 삭제 건수 반환.

        최근 목록(list_pages 1~2)에는 오래된 글이 다시 뜨지 않고, 설령 재분석돼도
        백엔드가 source_post_id 로 409(멱등) 처리하므로 안전하다.
        """
        cur = self.conn.execute(
            "DELETE FROM seen_posts WHERE created_at < datetime('now', ?)",
            (f"-{int(days)} days",),
        )
        self.conn.commit()
        return cur.rowcount

    def close(self) -> None:
        try:
            self.conn.close()
        except Exception:  # noqa: BLE001
            pass
