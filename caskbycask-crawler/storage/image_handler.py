"""이미지 임시 다운로드 → (분석용) base64 인코딩 → 디렉토리 통째 삭제.

데이터 흐름 원칙(CLAUDE.md): 본문 이미지를 임시로 받아 AI 분석에만 쓰고,
분석 직후 로컬을 반드시 삭제한다. 서버에 원본을 보관하지 않는다.
원격 이미지 URL 자체는 페이로드에 담아 관리자가 원문 교차검증에 쓴다.

스테이지 분리:
  download(image_urls, post_hash) -> image_dir   # 검증 통과분만 디스크 저장
  encode_dir(image_dir)          -> [data_url]    # Pillow 압축+base64 (vision 비용↓)
  cleanup(image_dir)             -> None          # 분석 직후 디렉토리 전체 삭제
"""
from __future__ import annotations

import base64
import hashlib
import io
import shutil
import time
from pathlib import Path

from image_security import CONTENT_TYPE_FORMAT, open_validated_image, validate_image_file
from logger import get_logger
from safe_http import get_public_response, new_public_session, operation_deadline

log = get_logger("image")

# 허용 Content-Type → 저장 확장자
_ALLOWED_CT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
_MAX_BYTES = 10 * 1024 * 1024   # 이미지 1장 10MB 상한
_MAX_EDGE = 1024                # 분석 인코딩 시 긴 변 최대 px (토큰/비용 절감)
_JPEG_QUALITY = 80


class ImageHandler:
    def __init__(self, temp_dir: str, timeout: int = 15, max_images: int = 5):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.timeout = timeout
        self.max_images = max_images

    @staticmethod
    def make_post_hash(url: str) -> str:
        return hashlib.md5(url.encode()).hexdigest()[:8]

    def download(self, image_urls: list[str], post_hash: str, referer: str = "") -> str:
        """검증을 통과한 이미지를 {temp}/{timestamp}_{post_hash}/ 에 저장하고 디렉토리 경로 반환.

        개별 이미지 실패(허용X 타입/용량초과/네트워크)는 스킵+로그, 전체는 계속 진행.
        한 장도 못 받아도 (빈) 디렉토리 경로를 반환한다 — 호출부는 cleanup 만 보장하면 됨.
        """
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        image_dir = self.temp_dir / f"{timestamp}_{post_hash}"
        image_dir.mkdir(parents=True, exist_ok=True)

        saved = 0
        for idx, url in enumerate(image_urls[: self.max_images]):
            try:
                self._download_one(url, image_dir, idx, referer)
                saved += 1
            except Exception as e:  # noqa: BLE001
                log.warning("이미지 다운로드 스킵 %s: %s", url, e)

        if saved:
            log.info("이미지 %d장 임시저장 → %s", saved, image_dir.name)
        return str(image_dir)

    def _download_one(self, url: str, image_dir: Path, idx: int, referer: str) -> None:
        headers = {"User-Agent": "Mozilla/5.0", "Referer": referer or url}
        session = new_public_session()
        try:
            r, _ = get_public_response(
                session,
                url,
                headers=headers,
                timeout=self.timeout,
            )
            try:
                ct = r.headers.get("Content-Type", "").split(";")[0].strip().lower()
                if ct not in _ALLOWED_CT:
                    raise ValueError(f"허용되지 않은 Content-Type: {ct or '미상'}")

                clen = r.headers.get("Content-Length")
                if clen and clen.isdigit() and int(clen) > _MAX_BYTES:
                    raise ValueError(f"용량 초과(헤더 {int(clen)}B)")

                dest = image_dir / f"{idx}{_ALLOWED_CT[ct]}"
                partial = dest.with_suffix(f"{dest.suffix}.part")
                size = 0
                try:
                    with operation_deadline(
                        max(15, float(self.timeout) * 2),
                        message="이미지 다운로드 총시간 제한을 초과했습니다.",
                    ) as check:
                        with partial.open("wb") as f:
                            for chunk in r.iter_content(8192):
                                if not chunk:
                                    continue
                                size += len(chunk)
                                if size > _MAX_BYTES:
                                    raise ValueError("용량 초과(스트리밍)")
                                f.write(chunk)
                                check()
                    validate_image_file(partial, expected_format=CONTENT_TYPE_FORMAT[ct])
                    partial.replace(dest)
                finally:
                    partial.unlink(missing_ok=True)
            finally:
                r.close()
        finally:
            session.close()

    def encode_dir(self, image_dir: str) -> list[str]:
        """디렉토리 내 이미지들을 Pillow 압축 후 base64 data URL 목록으로 인코딩."""
        results: list[str] = []
        d = Path(image_dir)
        if not d.exists():
            return results
        for path in sorted(d.iterdir()):
            if not path.is_file():
                continue
            data_url = self._encode_one(path)
            if data_url:
                results.append(data_url)
        return results

    @staticmethod
    def _encode_one(path: Path) -> str | None:
        try:
            expected_format = CONTENT_TYPE_FORMAT.get(
                next((ct for ct, suffix in _ALLOWED_CT.items() if suffix == path.suffix.lower()), "")
            )
            if not expected_format:
                raise ValueError(f"허용되지 않은 이미지 확장자: {path.suffix or '미상'}")
            with open_validated_image(path, expected_format=expected_format) as im:
                im = im.convert("RGB")
                im.thumbnail((_MAX_EDGE, _MAX_EDGE))
                buf = io.BytesIO()
                im.save(buf, format="JPEG", quality=_JPEG_QUALITY)
                b64 = base64.b64encode(buf.getvalue()).decode("ascii")
                return f"data:image/jpeg;base64,{b64}"
        except Exception as e:  # noqa: BLE001
            log.warning("이미지 인코딩 실패 %s: %s", path.name, e)
            return None

    def cleanup(self, image_dir: str) -> None:
        """임시 디렉토리 전체 삭제. 없으면 무시."""
        path = Path(image_dir)
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
