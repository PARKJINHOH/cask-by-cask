from __future__ import annotations

import hashlib
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from news_models import SearchSource


ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def fetch_approved_official_image(sources: list[SearchSource], config: dict,
                                  output_dir: Path, timeout: int, log) -> tuple[Path, str] | None:
    approved_domains = {
        str(item.get("domain") or "").lower().removeprefix("www.")
        for item in config.get("sources", [])
        if item.get("enabled")
        and item.get("sourceType") == "OFFICIAL"
        and item.get("imageUseAllowed")
    }
    for source in sources:
        if source.domain not in approved_domains:
            continue
        try:
            page = requests.get(source.url, timeout=timeout, headers={"User-Agent": "CaskByCaskBot/1.0"})
            page.raise_for_status()
            soup = BeautifulSoup(page.text, "html.parser")
            meta = (
                soup.select_one('meta[property="og:image"]')
                or soup.select_one('meta[name="twitter:image"]')
                or soup.select_one('meta[property="twitter:image"]')
            )
            image_url = urljoin(source.url, str(meta.get("content") or "").strip()) if meta else ""
            if not image_url.startswith(("http://", "https://")):
                continue
            image = requests.get(image_url, timeout=timeout, stream=True,
                                 headers={"User-Agent": "CaskByCaskBot/1.0"})
            image.raise_for_status()
            content_type = str(image.headers.get("Content-Type") or "").split(";", 1)[0].lower()
            suffix = ALLOWED_IMAGE_TYPES.get(content_type)
            if not suffix:
                continue
            output_dir.mkdir(parents=True, exist_ok=True)
            target = output_dir / f"official-{hashlib.sha256(image_url.encode()).hexdigest()[:20]}{suffix}"
            size = 0
            with target.open("wb") as handle:
                for chunk in image.iter_content(64 * 1024):
                    if not chunk:
                        continue
                    size += len(chunk)
                    if size > 10 * 1024 * 1024:
                        raise ValueError("공식 이미지가 10MB 제한을 초과했습니다.")
                    handle.write(chunk)
            evidence = f"관리자 이미지 사용 승인 공식 출처: {source.url}; 원본 이미지: {image_url}"
            return target, evidence
        except Exception as error:  # noqa: BLE001
            log.warning("승인 공식 이미지 수집 실패 domain=%s: %s", source.domain, error)
    return None
