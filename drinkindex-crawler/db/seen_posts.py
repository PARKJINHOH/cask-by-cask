"""이미 처리한 게시글 중복 방지용 SQLite 스토어.

같은 글을 두 번 분석하지 않도록(=OpenAI 비용 절약) post key 를 기록한다.
백엔드도 sourcePostId 로 2차 멱등 처리하지만, 1차 방어선은 여기다.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
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
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS seen_posts (
                post_key   TEXT PRIMARY KEY,
                site       TEXT NOT NULL,
                url        TEXT,
                status     TEXT NOT NULL,         -- ANALYZED | UPLOADED | SKIPPED | ERROR
                first_seen TEXT NOT NULL
            )
            """
        )
        self.conn.commit()

    def is_seen(self, post_key: str) -> bool:
        cur = self.conn.execute("SELECT 1 FROM seen_posts WHERE post_key = ?", (post_key,))
        return cur.fetchone() is not None

    def mark(self, post_key: str, site: str, url: str, status: str) -> None:
        self.conn.execute(
            """
            INSERT INTO seen_posts (post_key, site, url, status, first_seen)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(post_key) DO UPDATE SET status = excluded.status
            """,
            (post_key, site, url, status, datetime.now(timezone.utc).isoformat()),
        )
        self.conn.commit()

    def close(self) -> None:
        try:
            self.conn.close()
        except Exception:  # noqa: BLE001
            pass
