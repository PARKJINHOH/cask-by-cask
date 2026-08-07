from __future__ import annotations

import json
import random
from pathlib import Path

from wine_ingest.vivino_web import VivinoBlockedError, VivinoWebCrawlerProvider


class FixtureWineProvider:
    """Local-only licensed-data shape fixture. It performs no external network access."""

    def __init__(self, fixture_path: str):
        self.fixture_path = Path(fixture_path)

    def collect(self, limit: int) -> list[dict]:
        data = json.loads(self.fixture_path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise ValueError("wine fixture root must be a JSON array")
        random.SystemRandom().shuffle(data)
        return data[: min(limit, 3)]

    def close(self) -> None:
        """네트워크 자원이 없어 할 일이 없다. 워커가 provider 종류를 가리지 않도록 맞춰 둔다."""



__all__ = ["FixtureWineProvider", "VivinoBlockedError", "VivinoWebCrawlerProvider"]
