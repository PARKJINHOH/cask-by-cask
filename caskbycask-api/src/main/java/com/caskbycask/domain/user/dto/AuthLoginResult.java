package com.caskbycask.domain.user.dto;

/**
 * 로그인/재활성화 결과 내부 캐리어.
 *   - body         : 클라이언트 JSON 응답(accessToken 등). refresh 토큰은 포함하지 않는다.
 *   - refreshToken : httpOnly 쿠키로만 내려보낼 값 (컨트롤러가 Set-Cookie 로 사용).
 */
public record AuthLoginResult(LoginResponse body, String refreshToken) {
}
