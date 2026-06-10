package com.drinkindex.domain.user.dto;

/**
 * 토큰 재발급 결과 내부 캐리어.
 *   - accessToken  : 클라이언트 JSON 응답
 *   - refreshToken : 회전된 새 refresh 토큰 — httpOnly 쿠키로만 내려보낸다.
 */
public record AuthRefreshResult(String accessToken, String refreshToken) {
}
