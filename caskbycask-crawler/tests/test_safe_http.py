from __future__ import annotations

import socket
import unittest
from unittest.mock import Mock, call, patch
from urllib.parse import urlsplit

from safe_http import assert_public_http_url, get_public_response, new_public_session, read_limited_body


def address_info(address: str) -> list[tuple]:
    family = socket.AF_INET6 if ":" in address else socket.AF_INET
    return [(family, socket.SOCK_STREAM, 6, "", (address, 443))]


class SafeHttpUrlTest(unittest.TestCase):
    @patch("safe_http.socket.getaddrinfo", return_value=address_info("93.184.216.34"))
    def test_public_https_url_is_allowed(self, getaddrinfo: Mock) -> None:
        assert_public_http_url("https://images.example.com/a.jpg", allowed_hosts={"example.com"})
        getaddrinfo.assert_called_once_with("images.example.com", 443, type=socket.SOCK_STREAM)

    @patch("safe_http.socket.getaddrinfo", return_value=address_info("169.254.169.254"))
    def test_cloud_metadata_address_is_rejected(self, _getaddrinfo: Mock) -> None:
        with self.assertRaisesRegex(ValueError, "비공개"):
            assert_public_http_url("http://metadata.example/image.jpg")

    @patch("safe_http.socket.getaddrinfo", return_value=address_info("::ffff:127.0.0.1"))
    def test_ipv4_mapped_loopback_is_rejected(self, _getaddrinfo: Mock) -> None:
        with self.assertRaisesRegex(ValueError, "비공개"):
            assert_public_http_url("https://mapped.example/image.jpg")

    @patch("safe_http.socket.getaddrinfo")
    def test_mixed_public_and_private_dns_answers_are_rejected(self, getaddrinfo: Mock) -> None:
        getaddrinfo.return_value = address_info("93.184.216.34") + address_info("10.0.0.8")
        with self.assertRaisesRegex(ValueError, "비공개"):
            assert_public_http_url("https://rebinding.example/image.jpg")

    def test_credentials_and_non_web_port_are_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "사용자 정보"):
            assert_public_http_url("https://user:password@example.com/image.jpg")
        with self.assertRaisesRegex(ValueError, "80/443"):
            assert_public_http_url("https://example.com:8080/image.jpg")

    @patch("safe_http.socket.getaddrinfo", return_value=address_info("93.184.216.34"))
    def test_allowed_domain_does_not_accept_similar_suffix(self, _getaddrinfo: Mock) -> None:
        with self.assertRaisesRegex(ValueError, "출처 도메인 밖"):
            assert_public_http_url("https://evil-example.com", allowed_hosts={"example.com"})


class SafeHttpRedirectTest(unittest.TestCase):
    @patch("safe_http._resolve_public_http_url")
    def test_redirect_target_is_validated_before_second_request(self, resolve: Mock) -> None:
        redirect = Mock()
        redirect.status_code = 302
        redirect.headers = {"Location": "http://169.254.169.254/latest/meta-data"}
        session = Mock()
        session.get.return_value = redirect
        resolve.side_effect = [
            (urlsplit("https://example.com/image"), "example.com", ("93.184.216.34",)),
            ValueError("blocked metadata"),
        ]

        with self.assertRaisesRegex(ValueError, "blocked metadata"):
            get_public_response(session, "https://example.com/image", timeout=15)

        self.assertEqual(1, session.get.call_count)
        self.assertEqual([
            call("https://example.com/image", allowed_hosts=None),
            call("http://169.254.169.254/latest/meta-data", allowed_hosts=None),
        ], resolve.call_args_list)
        session.get.assert_called_once_with(
            "https://93.184.216.34/image",
            allow_redirects=False,
            stream=True,
            timeout=(10.0, 15.0),
            headers={"Host": "example.com"},
        )
        redirect.close.assert_called_once()

    @patch("safe_http._resolve_public_http_url")
    def test_request_connects_to_the_validated_ip_without_second_dns_lookup(self, resolve: Mock) -> None:
        response = Mock()
        response.status_code = 200
        response.raise_for_status.return_value = None
        session = Mock()
        session.get.return_value = response
        resolve.return_value = (
            urlsplit("https://images.example.com/path/photo.jpg?size=large"),
            "images.example.com",
            ("93.184.216.34",),
        )

        actual, final_url = get_public_response(
            session,
            "https://images.example.com/path/photo.jpg?size=large",
            timeout=8,
            headers={"User-Agent": "crawler"},
        )

        self.assertIs(response, actual)
        self.assertEqual("https://images.example.com/path/photo.jpg?size=large", final_url)
        session.get.assert_called_once_with(
            "https://93.184.216.34/path/photo.jpg?size=large",
            allow_redirects=False,
            stream=True,
            timeout=(8.0, 8.0),
            headers={"User-Agent": "crawler", "Host": "images.example.com"},
        )

    def test_public_session_does_not_use_netrc_or_environment_proxy(self) -> None:
        session = new_public_session()
        try:
            self.assertFalse(session.trust_env)
        finally:
            session.close()

    @patch("safe_http._resolve_public_http_url")
    def test_redirect_limit_closes_every_response(self, resolve: Mock) -> None:
        resolve.return_value = (
            urlsplit("https://example.com/start"),
            "example.com",
            ("93.184.216.34",),
        )
        first = Mock(status_code=302, headers={"Location": "/second"})
        second = Mock(status_code=302, headers={"Location": "/third"})
        session = Mock()
        session.get.side_effect = [first, second]

        with self.assertRaisesRegex(ValueError, "횟수가 제한"):
            get_public_response(session, "https://example.com/start", timeout=5, max_redirects=1)

        first.close.assert_called_once()
        second.close.assert_called_once()


class LimitedBodyTest(unittest.TestCase):
    def test_content_length_and_stream_limits_are_enforced(self) -> None:
        response = Mock(headers={"Content-Length": "101"})
        with self.assertRaisesRegex(ValueError, "100"):
            read_limited_body(response, 100)
        response.iter_content.assert_not_called()

        response = Mock(headers={})
        response.iter_content.return_value = [b"a" * 60, b"b" * 41]
        with self.assertRaisesRegex(ValueError, "100"):
            read_limited_body(response, 100)

    @patch("safe_http.time.monotonic", side_effect=[0.0, 31.0])
    def test_total_body_deadline_rejects_slow_stream(self, _monotonic: Mock) -> None:
        response = Mock(headers={})
        response.iter_content.return_value = [b"one chunk"]
        with self.assertRaisesRegex(Exception, "총시간 제한"):
            read_limited_body(response, 100, max_seconds=30)


if __name__ == "__main__":
    unittest.main()
