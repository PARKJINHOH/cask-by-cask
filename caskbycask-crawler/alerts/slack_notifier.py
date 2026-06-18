"""Slack Incoming Webhook notifier for crawler runtime issues."""
from __future__ import annotations

import os
import socket
from datetime import datetime, timedelta, timezone

import requests

_KST = timezone(timedelta(hours=9))


def _bool_env(key: str, default: bool) -> bool:
    value = os.getenv(key)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "y", "on")


def _int_env(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, str(default)))
    except (TypeError, ValueError):
        return default


class SlackNotifier:
    """Small no-op-safe Slack notifier with per-run de-duplication."""

    _COLORS = {
        "good": "good",
        "warning": "warning",
        "danger": "danger",
        "info": "#888888",
    }

    def __init__(
        self,
        webhook_url: str = "",
        channel: str = "#server-prd",
        enabled: bool = True,
        max_per_run: int = 10,
        timeout_sec: int = 5,
    ):
        self.webhook_url = webhook_url.strip()
        self.channel = channel.strip()
        self.enabled = enabled
        self.max_per_run = max(1, max_per_run)
        self.timeout_sec = timeout_sec
        self._sent_keys: set[str] = set()
        self._sent_count = 0

    @classmethod
    def from_env(cls) -> "SlackNotifier":
        return cls(
            webhook_url=os.getenv("SLACK_WEBHOOK_URL", ""),
            channel=os.getenv("SLACK_CHANNEL", "#server-prd"),
            enabled=_bool_env("SLACK_ALERTS_ENABLED", True),
            max_per_run=_int_env("SLACK_MAX_ALERTS_PER_RUN", 10),
        )

    @property
    def active(self) -> bool:
        return self.enabled and bool(self.webhook_url)

    def good_once(self, key: str, summary: str, body: str) -> None:
        self.notify_once(key, "good", summary, body)

    def warning_once(self, key: str, summary: str, body: str) -> None:
        self.notify_once(key, "warning", summary, body)

    def danger_once(self, key: str, summary: str, body: str) -> None:
        self.notify_once(key, "danger", summary, body)

    def notify_once(self, key: str, level: str, summary: str, body: str) -> None:
        if key in self._sent_keys:
            return
        self._sent_keys.add(key)
        self.notify(level, summary, body)

    def notify(self, level: str, summary: str, body: str) -> None:
        if not self.active:
            return
        if self._sent_count >= self.max_per_run:
            return

        payload = self._payload(level, summary, body)
        try:
            resp = requests.post(
                self.webhook_url,
                json=payload,
                timeout=self.timeout_sec,
                headers={"Content-Type": "application/json; charset=utf-8"},
            )
            if resp.status_code // 100 != 2:
                return
            self._sent_count += 1
        except requests.RequestException:
            # Alerting must never break crawling.
            return

    def _payload(self, level: str, summary: str, body: str) -> dict:
        now = datetime.now(_KST).strftime("%Y-%m-%d %H:%M:%S KST")
        host = socket.gethostname() or "server"
        payload = {
            "username": "CaskByCask Crawler",
            "icon_emoji": ":satellite_antenna:",
            "attachments": [
                {
                    "color": self._COLORS.get(level, self._COLORS["info"]),
                    "title": summary[:180],
                    "text": body[:2500],
                    "footer": f"{host} · {now}",
                }
            ],
        }
        if self.channel:
            payload["channel"] = self.channel
        return payload
