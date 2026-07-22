"""외부 수집용 HTTP 안전장치.

요청 직전과 각 리디렉션 대상의 DNS 결과를 확인해 내부망·메타데이터 주소로의
SSRF를 차단한다. 호출자는 반환된 Response를 반드시 close 해야 한다.
"""
from __future__ import annotations

import ipaddress
import signal
import socket
import threading
import time
from collections.abc import Iterable
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from urllib.parse import SplitResult, urljoin, urlsplit, urlunsplit

import requests
from requests.adapters import HTTPAdapter


REDIRECT_STATUSES = {301, 302, 303, 307, 308}
ALLOWED_SCHEMES = {"http", "https"}
ALLOWED_PORTS = {80, 443}
DEFAULT_MAX_REDIRECTS = 4
MAX_RESOLVED_ADDRESSES = 4


@contextmanager
def operation_deadline(
    max_seconds: int | float,
    *,
    message: str,
) -> Iterator[Callable[[], None]]:
    """Linux 주 실행에서는 socket read까지 끊는 총시간 제한을 적용한다."""
    if max_seconds <= 0:
        raise ValueError("deadline은 0보다 커야 합니다.")
    started = time.monotonic()

    def check() -> None:
        if time.monotonic() - started > float(max_seconds):
            raise requests.Timeout(message)

    can_use_alarm = (
        hasattr(signal, "setitimer")
        and threading.current_thread() is threading.main_thread()
        and signal.getitimer(signal.ITIMER_REAL)[0] <= 0
    )
    previous_handler = None
    if can_use_alarm:
        previous_handler = signal.getsignal(signal.SIGALRM)

        def raise_timeout(_signum, _frame) -> None:  # type: ignore[no-untyped-def]
            raise requests.Timeout(message)

        signal.signal(signal.SIGALRM, raise_timeout)
        signal.setitimer(signal.ITIMER_REAL, float(max_seconds))
    try:
        yield check
    finally:
        if can_use_alarm:
            signal.setitimer(signal.ITIMER_REAL, 0)
            signal.signal(signal.SIGALRM, previous_handler)


class _HostHeaderSslAdapter(HTTPAdapter):
    """IP로 연결하되 원래 Host를 TLS SNI와 인증서 검증에 사용한다."""

    def send(self, request, **kwargs):  # type: ignore[no-untyped-def]
        host_header = next(
            (request.headers[name] for name in request.headers if name.lower() == "host"),
            None,
        )
        connection_options = self.poolmanager.connection_pool_kw
        if host_header:
            connection_options["assert_hostname"] = host_header
            connection_options["server_hostname"] = host_header
        else:
            connection_options.pop("assert_hostname", None)
            connection_options.pop("server_hostname", None)
        return super().send(request, **kwargs)


def new_public_session() -> requests.Session:
    """환경 proxy/.netrc 자격증명을 외부 수집 URL에 전달하지 않는 세션을 만든다."""
    session = requests.Session()
    session.trust_env = False
    session.mount("https://", _HostHeaderSslAdapter())
    return session


def _normalized_host(value: str) -> str:
    host = value.rstrip(".").lower()
    try:
        return host.encode("idna").decode("ascii")
    except UnicodeError as error:
        raise ValueError("유효하지 않은 호스트 이름입니다.") from error


def _host_is_allowed(host: str, allowed_hosts: Iterable[str]) -> bool:
    for allowed in allowed_hosts:
        normalized = _normalized_host(str(allowed).strip().lstrip("."))
        if normalized and (host == normalized or host.endswith(f".{normalized}")):
            return True
    return False


def _public_ip(value: str) -> bool:
    address_text = value.split("%", 1)[0]
    address = ipaddress.ip_address(address_text)
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        address = address.ipv4_mapped
    return address.is_global


def _resolve_public_http_url(
    url: str,
    *,
    allowed_hosts: Iterable[str] | None = None,
) -> tuple[SplitResult, str, tuple[str, ...]]:
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError as error:
        raise ValueError("유효하지 않은 URL입니다.") from error

    if parsed.scheme.lower() not in ALLOWED_SCHEMES or not parsed.hostname:
        raise ValueError("HTTP(S) 공개 URL만 수집할 수 있습니다.")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("URL 사용자 정보는 허용되지 않습니다.")
    expected_port = 443 if parsed.scheme.lower() == "https" else 80
    if port is not None and (port not in ALLOWED_PORTS or port != expected_port):
        raise ValueError("외부 수집은 80/443 포트만 허용됩니다.")

    host = _normalized_host(parsed.hostname)
    if host == "localhost" or host.endswith(".localhost"):
        raise ValueError("내부 주소는 수집할 수 없습니다.")
    if allowed_hosts is not None and not _host_is_allowed(host, allowed_hosts):
        raise ValueError(f"허용된 출처 도메인 밖으로 이동했습니다: {host}")

    lookup_port = port or expected_port
    try:
        addresses = socket.getaddrinfo(host, lookup_port, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        raise ValueError(f"호스트 이름을 확인할 수 없습니다: {host}") from error
    if not addresses:
        raise ValueError(f"호스트 주소를 확인할 수 없습니다: {host}")
    public_addresses: set[str] = set()
    for info in addresses:
        try:
            is_public = _public_ip(info[4][0])
        except ValueError as error:
            raise ValueError("확인할 수 없는 네트워크 주소입니다.") from error
        if not is_public:
            raise ValueError("내부·비공개·예약 네트워크 주소는 수집할 수 없습니다.")
        public_addresses.add(info[4][0].split("%", 1)[0])

    # 운영 서버의 IPv6 라우팅 유무에 따른 불필요한 실패를 줄이기 위해 IPv4를 먼저 시도한다.
    ordered = tuple(sorted(public_addresses, key=lambda value: (ipaddress.ip_address(value).version, value)))
    return parsed, host, ordered[:MAX_RESOLVED_ADDRESSES]


def assert_public_http_url(url: str, *, allowed_hosts: Iterable[str] | None = None) -> None:
    _resolve_public_http_url(url, allowed_hosts=allowed_hosts)


def _pinned_url(parsed: SplitResult, address: str) -> str:
    address_literal = f"[{address}]" if ":" in address else address
    path = parsed.path or "/"
    return urlunsplit((parsed.scheme.lower(), address_literal, path, parsed.query, ""))


def get_public_response(
    session: requests.Session,
    url: str,
    *,
    timeout: int | float,
    headers: dict[str, str] | None = None,
    allowed_hosts: Iterable[str] | None = None,
    max_redirects: int = DEFAULT_MAX_REDIRECTS,
) -> tuple[requests.Response, str]:
    """안전 검증을 거쳐 GET하고 최종 Response와 URL을 반환한다."""
    if timeout <= 0:
        raise ValueError("timeout은 0보다 커야 합니다.")
    current = url
    request_timeout = (min(float(timeout), 10.0), float(timeout))

    with operation_deadline(float(timeout), message="외부 HTTP 요청 총시간 제한을 초과했습니다.") as check:
        for redirect_count in range(max_redirects + 1):
            parsed, original_host, addresses = _resolve_public_http_url(
                current,
                allowed_hosts=allowed_hosts,
            )
            check()
            request_headers = dict(headers or {})
            request_headers["Host"] = original_host
            response: requests.Response | None = None
            last_error: requests.RequestException | None = None
            for address in addresses:
                try:
                    response = session.get(
                        _pinned_url(parsed, address),
                        allow_redirects=False,
                        stream=True,
                        timeout=request_timeout,
                        headers=request_headers,
                    )
                    try:
                        check()
                    except Exception:
                        response.close()
                        raise
                    break
                except requests.RequestException as error:
                    last_error = error
                check()
            if response is None:
                if last_error is not None:
                    raise last_error
                raise ValueError("연결할 공개 IP 주소가 없습니다.")
            if response.status_code not in REDIRECT_STATUSES:
                try:
                    response.raise_for_status()
                except Exception:
                    response.close()
                    raise
                return response, current

            location = response.headers.get("Location")
            response.close()
            if not location:
                raise ValueError("리디렉션 응답에 이동할 URL이 없습니다.")
            if redirect_count >= max_redirects:
                raise ValueError("리디렉션 횟수가 제한을 초과했습니다.")
            current = urljoin(current, location)

    raise ValueError("리디렉션 횟수가 제한을 초과했습니다.")  # pragma: no cover


def read_limited_body(
    response: requests.Response,
    max_bytes: int,
    *,
    max_seconds: int | float = 30,
) -> bytes:
    if max_bytes <= 0:
        raise ValueError("max_bytes는 0보다 커야 합니다.")
    content_length = response.headers.get("Content-Length")
    if content_length and content_length.isdigit() and int(content_length) > max_bytes:
        raise ValueError(f"응답 본문이 {max_bytes}바이트 제한을 초과했습니다.")

    chunks: list[bytes] = []
    size = 0
    with operation_deadline(max_seconds, message="응답 본문 총시간 제한을 초과했습니다.") as check:
        for chunk in response.iter_content(64 * 1024):
            if not chunk:
                continue
            size += len(chunk)
            if size > max_bytes:
                raise ValueError(f"응답 본문이 {max_bytes}바이트 제한을 초과했습니다.")
            chunks.append(chunk)
            check()
    return b"".join(chunks)
