from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from PIL import Image

from image_security import open_validated_image, validate_image_file
from storage.image_handler import ImageHandler


class ImageSecurityTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def save(self, name: str, image_format: str, **kwargs) -> Path:
        path = self.directory / name
        Image.new("RGB", (10, 10), "red").save(path, format=image_format, **kwargs)
        return path

    def test_supported_static_formats_are_validated_and_loaded(self) -> None:
        for suffix, image_format in (("jpg", "JPEG"), ("png", "PNG"), ("webp", "WEBP"), ("gif", "GIF")):
            with self.subTest(image_format=image_format):
                path = self.save(f"image.{suffix}", image_format)
                validate_image_file(path, expected_format=image_format)
                with open_validated_image(path, expected_format=image_format) as image:
                    self.assertEqual((10, 10), image.size)

    def test_spoofed_content_type_format_is_rejected(self) -> None:
        path = self.save("spoof.jpg", "PNG")
        with self.assertRaisesRegex(ValueError, "포맷 불일치"):
            validate_image_file(path, expected_format="JPEG")
        self.assertIsNone(ImageHandler._encode_one(path))

    def test_unsupported_decoder_is_not_opened(self) -> None:
        path = self.save("image.bmp", "BMP")
        with self.assertRaises(Exception):
            validate_image_file(path)

    def test_corrupted_file_is_rejected(self) -> None:
        path = self.directory / "broken.jpg"
        path.write_bytes(b"not-an-image")
        with self.assertRaises(Exception):
            validate_image_file(path, expected_format="JPEG")

    def test_pixel_limit_is_enforced_before_full_decode(self) -> None:
        path = self.save("large.png", "PNG")
        with patch("image_security.MAX_IMAGE_PIXELS", 99):
            with self.assertRaisesRegex(ValueError, "픽셀 제한"):
                validate_image_file(path, expected_format="PNG")

    def test_animation_frame_limit_is_enforced(self) -> None:
        for suffix, image_format in (("gif", "GIF"), ("webp", "WEBP"), ("png", "PNG")):
            with self.subTest(image_format=image_format):
                path = self.directory / f"animated.{suffix}"
                frames = [Image.new("RGB", (5, 5), color) for color in ("red", "blue")]
                frames[0].save(
                    path,
                    format=image_format,
                    save_all=True,
                    append_images=frames[1:],
                    duration=10,
                    loop=0,
                )
                with patch("image_security.MAX_IMAGE_FRAMES", 1):
                    with self.assertRaisesRegex(ValueError, "프레임 제한"):
                        validate_image_file(path, expected_format=image_format)

    def test_failed_download_removes_partial_and_preserves_existing_file(self) -> None:
        source = self.save("actual.png", "PNG")
        image_dir = self.directory / "download"
        image_dir.mkdir()
        destination = image_dir / "0.jpg"
        destination.write_bytes(b"previous-valid-file")

        response = Mock()
        response.headers = {"Content-Type": "image/jpeg"}
        response.iter_content.return_value = [source.read_bytes()]
        session = Mock()
        with (
            patch("storage.image_handler.new_public_session", return_value=session),
            patch("storage.image_handler.get_public_response", return_value=(response, "https://example.com/a.jpg")),
        ):
            handler = ImageHandler(str(self.directory), timeout=5)
            with self.assertRaisesRegex(ValueError, "포맷 불일치"):
                handler._download_one("https://example.com/a.jpg", image_dir, 0, "")

        self.assertEqual(b"previous-valid-file", destination.read_bytes())
        self.assertFalse((image_dir / "0.jpg.part").exists())
        response.close.assert_called_once()
        session.close.assert_called_once()


if __name__ == "__main__":
    unittest.main()
