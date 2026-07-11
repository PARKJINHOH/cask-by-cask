"""이미 처리한 게시글 중복 방지용 SQLite 스토어.

같은 글을 두 번 분석하지 않도록(=Gemini 호출량 절약) post key 를 기록한다.
백엔드도 sourcePostId 로 2차 멱등 처리하지만, 1차 방어선은 여기다.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

from logger import get_logger
from models import RawPost

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
        # 분석/업로드가 실패해 seen_posts 에 마킹되지 못한 글의 재시도 횟수.
        # 마킹 없이 두면 다음 실행마다 같은 글을 Gemini에 다시 보내 호출량이 누적된다.
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS failed_attempts (
                post_key        TEXT PRIMARY KEY,
                attempts        INTEGER NOT NULL DEFAULT 0,
                last_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS pending_posts (
                post_key      TEXT PRIMARY KEY,
                site          TEXT NOT NULL,
                board_id      TEXT NOT NULL,
                board_name    TEXT,
                post_id       TEXT NOT NULL,
                title         TEXT NOT NULL,
                url           TEXT NOT NULL,
                posted_at     TEXT,
                first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_seen_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS deal_fingerprints (
                post_key         TEXT PRIMARY KEY,
                site             TEXT NOT NULL,
                url              TEXT,
                title            TEXT NOT NULL,
                normalized_title TEXT NOT NULL,
                token_key        TEXT NOT NULL,
                seller_chain     TEXT,
                ai_fingerprint   TEXT,
                drink_name       TEXT,
                deal_price       INTEGER,
                status           TEXT NOT NULL,
                created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_deal_fingerprints_created_at ON deal_fingerprints(created_at)"
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

    def upsert_pending(self, post: RawPost) -> None:
        self.conn.execute(
            """
            INSERT INTO pending_posts (post_key, site, board_id, board_name, post_id, title, url, posted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(post_key) DO UPDATE SET
                title = excluded.title,
                url = excluded.url,
                posted_at = excluded.posted_at,
                last_seen_at = CURRENT_TIMESTAMP
            """,
            (
                post.key, post.site, post.board_id, post.board_name, post.post_id,
                post.title, post.url, post.posted_at,
            ),
        )
        self.conn.commit()

    def list_pending(self, limit: int) -> list[RawPost]:
        cur = self.conn.execute(
            """
            SELECT site, board_id, board_name, post_id, title, url, posted_at
            FROM pending_posts
            ORDER BY first_seen_at ASC, last_seen_at ASC
            LIMIT ?
            """,
            (max(0, int(limit)),),
        )
        return [
            RawPost(
                site=row["site"],
                board_id=row["board_id"],
                board_name=row["board_name"] or "",
                post_id=row["post_id"],
                title=row["title"],
                url=row["url"],
                posted_at=row["posted_at"],
            )
            for row in cur.fetchall()
        ]

    def delete_pending(self, post_key: str) -> None:
        self.conn.execute("DELETE FROM pending_posts WHERE post_key = ?", (post_key,))
        self.conn.commit()

    def record_failure(self, post_key: str) -> int:
        """분석/업로드 실패 시 재시도 횟수를 1 증가시키고 갱신된 횟수를 반환.

        seen_posts 에 마킹되지 않은 채로 두면(=일시적 장애라 재시도 허용) 다음
        실행에서 후보 목록에 그대로 다시 잡혀 Gemini 호출이 반복된다. 호출부가
        이 횟수를 보고 임계치를 넘으면 ERROR 로 최종 마킹해 비용 누수를 막는다.
        """
        self.conn.execute(
            """
            INSERT INTO failed_attempts (post_key, attempts)
            VALUES (?, 1)
            ON CONFLICT(post_key) DO UPDATE SET
                attempts = attempts + 1,
                last_attempt_at = CURRENT_TIMESTAMP
            """,
            (post_key,),
        )
        self.conn.commit()
        cur = self.conn.execute(
            "SELECT attempts FROM failed_attempts WHERE post_key = ?", (post_key,)
        )
        row = cur.fetchone()
        return row["attempts"] if row else 1

    def recent_deal_fingerprints(self, hours: int) -> list[dict]:
        cur = self.conn.execute(
            """
            SELECT post_key, title, normalized_title, token_key, seller_chain, ai_fingerprint, status
            FROM deal_fingerprints
            WHERE created_at >= datetime('now', ?)
              AND status IN ('ANALYZED', 'UPLOADED')
            ORDER BY created_at DESC
            """,
            (f"-{max(1, int(hours))} hours",),
        )
        return [dict(row) for row in cur.fetchall()]

    def record_deal_fingerprint(
        self,
        post: RawPost,
        normalized_title: str,
        token_key: str,
        seller_chain: str,
        ai_fingerprint: str,
        drink_name: str | None,
        deal_price: int | None,
        status: str,
    ) -> None:
        self.conn.execute(
            """
            INSERT INTO deal_fingerprints (
                post_key, site, url, title, normalized_title, token_key, seller_chain,
                ai_fingerprint, drink_name, deal_price, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(post_key) DO UPDATE SET
                normalized_title = excluded.normalized_title,
                token_key = excluded.token_key,
                seller_chain = excluded.seller_chain,
                ai_fingerprint = excluded.ai_fingerprint,
                drink_name = excluded.drink_name,
                deal_price = excluded.deal_price,
                status = excluded.status
            """,
            (
                post.key, post.site, post.url, post.title, normalized_title, token_key,
                seller_chain, ai_fingerprint, drink_name, deal_price, status,
            ),
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
        cur2 = self.conn.execute(
            "DELETE FROM failed_attempts WHERE last_attempt_at < datetime('now', ?)",
            (f"-{int(days)} days",),
        )
        cur3 = self.conn.execute(
            "DELETE FROM pending_posts WHERE first_seen_at < datetime('now', ?)",
            (f"-{int(days)} days",),
        )
        cur4 = self.conn.execute(
            "DELETE FROM deal_fingerprints WHERE created_at < datetime('now', ?)",
            (f"-{int(days)} days",),
        )
        self.conn.commit()
        return cur.rowcount + cur2.rowcount + cur3.rowcount + cur4.rowcount

    def close(self) -> None:
        try:
            self.conn.close()
        except Exception:  # noqa: BLE001
            pass
