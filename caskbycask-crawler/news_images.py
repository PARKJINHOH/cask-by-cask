from __future__ import annotations

import hashlib
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from image_security import CONTENT_TYPE_FORMAT, validate_image_file
from news_models import SearchSource
from news_source_config import matching_source_config
from safe_http import get_public_response, new_public_session, operation_deadline, read_limited_body


ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def fetch_approved_official_image(sources: list[SearchSource], config: dict,
                                  output_dir: Path, timeout: int, log) -> tuple[Path, str] | None:
    for source in sources:
        matched = matching_source_config(source.url, source.domain, config.get("sources", []))
        if not (matched and matched.get("enabled")
                and matched.get("sourceType") == "OFFICIAL"
                and matched.get("imageUseAllowed")):
            continue
        session = new_public_session()
        try:
            configured_domain = str(matched.get("domain") or source.domain).lower().removeprefix("www.")
            page, page_url = get_public_response(
                session,
                source.url,
                timeout=timeout,
                allowed_hosts={configured_domain},
                headers={"User-Agent": "CaskByCaskBot/1.0"},
            )
            try:
                content_type = str(page.headers.get("Content-Type") or "").lower()
                if "html" not in content_type:
                    raise ValueError(f"공식 출처가 HTML이 아닙니다: {content_type or 'unknown'}")
                body = read_limited_body(page, 2 * 1024 * 1024)
                encoding = page.encoding or "utf-8"
            finally:
                page.close()
            soup = BeautifulSoup(body.decode(encoding, errors="replace"), "html.parser")
            meta = (
                soup.select_one('meta[property="og:image"]')
                or soup.select_one('meta[name="twitter:image"]')
                or soup.select_one('meta[property="twitter:image"]')
            )
            image_url = urljoin(page_url, str(meta.get("content") or "").strip()) if meta else ""
            if not image_url.startswith(("http://", "https://")):
                continue
            image, final_image_url = get_public_response(
                session,
                image_url,
                timeout=timeout,
                headers={"User-Agent": "CaskByCaskBot/1.0", "Referer": page_url},
            )
            try:
                content_type = str(image.headers.get("Content-Type") or "").split(";", 1)[0].lower()
                suffix = ALLOWED_IMAGE_TYPES.get(content_type)
                if not suffix:
                    continue
                content_length = image.headers.get("Content-Length")
                if content_length and content_length.isdigit() and int(content_length) > 10 * 1024 * 1024:
                    raise ValueError("공식 이미지가 10MB 제한을 초과했습니다.")
                output_dir.mkdir(parents=True, exist_ok=True)
                target = output_dir / f"official-{hashlib.sha256(final_image_url.encode()).hexdigest()[:20]}{suffix}"
                partial = target.with_suffix(f"{target.suffix}.part")
                size = 0
                try:
                    with operation_deadline(
                        max(15, float(timeout) * 2),
                        message="공식 이미지 다운로드 총시간 제한을 초과했습니다.",
                    ) as check:
                        with partial.open("wb") as handle:
                            for chunk in image.iter_content(64 * 1024):
                                if not chunk:
                                    continue
                                size += len(chunk)
                                if size > 10 * 1024 * 1024:
                                    raise ValueError("공식 이미지가 10MB 제한을 초과했습니다.")
                                handle.write(chunk)
                                check()
                    validate_image_file(partial, expected_format=CONTENT_TYPE_FORMAT[content_type])
                    partial.replace(target)
                finally:
                    partial.unlink(missing_ok=True)
            finally:
                image.close()
            evidence = f"관리자 이미지 사용 승인 공식 출처: {page_url}; 원본 이미지: {final_image_url}"
            return target, evidence
        except Exception as error:  # noqa: BLE001
            log.warning("승인 공식 이미지 수집 실패 domain=%s: %s", source.domain, error)
        finally:
            session.close()
    return None
