"""이미지 임시 다운로드 → 압축 → base64 인코딩 → 즉시 삭제.

데이터 흐름 원칙(CLAUDE.md): 본문 이미지를 임시로 받아 AI 분석에만 쓰고,
분석 직후 로컬 파일을 반드시 삭제한다. 서버에 원본을 보관하지 않는다.
원격 이미지 URL 자체는 페이로드에 담아 관리자가 원문 교차검증에 쓴다.
"""
from __future__ import annotations

import base64
import io
import uuid
from pathlib import Path

import requests
from PIL import Image

from logger import get_logger

log = get_logger("image")

_MAX_EDGE = 1024          # 긴 변 최대 px (비용/토큰 절감)
_JPEG_QUALITY = 80


class ImageHandler:
    def __init__(self, temp_dir: str, timeout: int = 15, max_images: int = 3):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.timeout = timeout
        self.max_images = max_images

    def to_data_urls(self, image_urls: list[str], referer: str = "") -> list[str]:
        """이미지 URL 목록 → base64 data URL 목록. 임시파일은 함수 종료 시 모두 삭제."""
        results: list[str] = []
        for url in image_urls[: self.max_images]:
            tmp = self.temp_dir / f"{uuid.uuid4().hex}.img"
            try:
                self._download(url, tmp, referer)
                data_url = self._encode(tmp)
                if data_url:
                    results.append(data_url)
            except Exception as e:  # noqa: BLE001
                log.warning("이미지 처리 실패 %s: %s", url, e)
            finally:
                tmp.unlink(missing_ok=True)  # 즉시 삭제(원칙)
        return results

    def _download(self, url: str, dest: Path, referer: str) -> None:
        headers = {"User-Agent": "Mozilla/5.0", "Referer": referer or url}
        with requests.get(url, headers=headers, timeout=self.timeout, stream=True) as r:
            r.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in r.iter_content(8192):
                    f.write(chunk)

    @staticmethod
    def _encode(path: Path) -> str | None:
        try:
            with Image.open(path) as im:
                im = im.convert("RGB")
                im.thumbnail((_MAX_EDGE, _MAX_EDGE))
                buf = io.BytesIO()
                im.save(buf, format="JPEG", quality=_JPEG_QUALITY)
                b64 = base64.b64encode(buf.getvalue()).decode("ascii")
                return f"data:image/jpeg;base64,{b64}"
        except Exception as e:  # noqa: BLE001
            log.warning("이미지 인코딩 실패 %s: %s", path, e)
            return None
