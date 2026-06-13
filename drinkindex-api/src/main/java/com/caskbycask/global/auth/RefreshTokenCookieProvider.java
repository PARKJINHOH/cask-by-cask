package com.caskbycask.global.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Refresh Token 전용 httpOnly 쿠키 빌더/리더.
 *
 * [보안 설계]
 *   - httpOnly: JS(XSS)에서 토큰 접근 불가 — refresh 토큰을 localStorage 에 두지 않기 위한 핵심.
 *   - secure  : HTTPS 에서만 전송 (dev/prod=true, local http=false)
 *   - sameSite: 기본 Strict — refresh/logout 은 자사 SPA 의 XHR(동일 사이트)이므로 Strict 로도 정상 동작하며,
 *               크로스 사이트 요청엔 쿠키가 실리지 않아 /api/auth/* 에 대한 CSRF 가 차단된다.
 *   - path    : /api/auth — 쿠키가 인증 엔드포인트에만 전송되어 노출면 최소화.
 *   - maxAge  : refresh 토큰 TTL 과 동일.
 *
 * Access Token 은 여전히 Authorization Bearer 헤더(JS 보유)로만 쓰므로,
 * 일반 API 엔드포인트는 쿠키 기반이 아니며 CSRF 표면이 생기지 않는다.
 */
@Component
public class RefreshTokenCookieProvider {

    private final String name;
    private final boolean secure;
    private final String sameSite;
    private final String path;
    private final long maxAgeSeconds;

    public RefreshTokenCookieProvider(
            @Value("${app.auth.refresh-cookie.name:refresh_token}") String name,
            @Value("${app.auth.refresh-cookie.secure:true}") boolean secure,
            @Value("${app.auth.refresh-cookie.same-site:Strict}") String sameSite,
            @Value("${app.auth.refresh-cookie.path:/api/auth}") String path,
            @Value("${jwt.refresh-token-expiry}") long refreshTokenExpiryMs
    ) {
        this.name = name;
        this.secure = secure;
        this.sameSite = sameSite;
        this.path = path;
        this.maxAgeSeconds = refreshTokenExpiryMs / 1000;
    }

    /** 발급/회전 시 — refresh 토큰을 담은 쿠키. */
    public ResponseCookie create(String refreshToken) {
        return base(refreshToken, maxAgeSeconds);
    }

    /** 로그아웃 시 — 즉시 만료(maxAge=0)로 브라우저 쿠키 제거. */
    public ResponseCookie clear() {
        return base("", 0);
    }

    /** 요청 쿠키에서 refresh 토큰 추출 (없으면 null). */
    public String resolve(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private ResponseCookie base(String value, long maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(path)
                .maxAge(maxAge)
                .build();
    }
}
