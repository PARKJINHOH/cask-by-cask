"""Pillow 이미지 디코딩 공통 제한."""
from __future__ import annotations

import warnings
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from PIL import Image


ALLOWED_IMAGE_FORMATS = ("JPEG", "PNG", "WEBP", "GIF")
CONTENT_TYPE_FORMAT = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/gif": "GIF",
}
MAX_IMAGE_PIXELS = 20_000_000
MAX_IMAGE_FRAMES = 60


def _check_image(image: Image.Image, expected_format: str | None) -> None:
    actual_format = str(image.format or "").upper()
    if actual_format not in ALLOWED_IMAGE_FORMATS:
        raise ValueError(f"허용되지 않은 실제 이미지 포맷: {actual_format or '미상'}")
    if expected_format and actual_format != expected_format.upper():
        raise ValueError(f"Content-Type과 실제 이미지 포맷 불일치: {expected_format}/{actual_format}")
    width, height = image.size
    if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
        raise ValueError(f"이미지 픽셀 제한 초과: {width}x{height}")


def _check_frame_limit(image: Image.Image) -> None:
    # GIF/WebP/APNG의 n_frames 속성은 마지막 프레임까지 먼저 훑을 수 있다. 정적 포맷도
    # seek(1)에서 즉시 EOF가 나므로 모든 허용 포맷을 최대 허용치+1까지만 확인한다.
    for frame_index in range(MAX_IMAGE_FRAMES + 1):
        try:
            image.seek(frame_index)
        except EOFError:
            image.seek(0)
            return
        if frame_index == MAX_IMAGE_FRAMES:
            raise ValueError(f"이미지 프레임 제한 초과: {MAX_IMAGE_FRAMES + 1}개 이상")
    image.seek(0)  # pragma: no cover - 위 반복문에서 항상 반환하거나 예외가 발생한다.


def validate_image_file(path: Path, *, expected_format: str | None = None) -> None:
    """파일 구조와 실제 포맷을 검사한다. 이미지 데이터는 반환하지 않는다."""
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(path, formats=ALLOWED_IMAGE_FORMATS) as image:
            _check_image(image, expected_format)
            image.verify()
        with Image.open(path, formats=ALLOWED_IMAGE_FORMATS) as image:
            _check_frame_limit(image)


@contextmanager
def open_validated_image(path: Path, *, expected_format: str | None = None) -> Iterator[Image.Image]:
    """제한 검증 후 첫 프레임을 완전히 디코딩한 이미지를 연다."""
    validate_image_file(path, expected_format=expected_format)
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(path, formats=ALLOWED_IMAGE_FORMATS) as image:
            _check_image(image, expected_format)
            image.load()
            yield image
